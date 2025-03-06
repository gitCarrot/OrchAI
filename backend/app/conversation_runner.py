# conversation_runner.py
from typing import Dict, Any, List, Optional, Set, Union, Generator
import logging
from langgraph.graph import StateGraph
from langchain_core.messages import (
    HumanMessage,
    AIMessage,
    SystemMessage,
    ToolMessage
)
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_conversation(
    graph: StateGraph,
    message: str,
    context: dict,
    config: dict,
    printed_ids: Optional[Set[str]] = None
) -> Dict[str, Any]:
    """
    - tool approval (y/n) 처리
    - 일반 사용자 메시지 처리
    - events → responses 변환
    - tool approval 필요 시 tool_approval 반환
    - 최종 응답 반환
    """
    if printed_ids is None:
        printed_ids = set()

    logger.info("=== 대화 실행 시작 ===")
    logger.info(f"입력 메시지: {message}")
    logger.info(f"컨텍스트: {context}")
    logger.info(f"설정: {config}")

    try:
        snapshot_before = graph.get_state(config)
        # 1) 만약 이미 도구 승인 대기 상태라면 y/n 아닌 입력 거부
        if snapshot_before and snapshot_before.next:
            if message.strip().lower() not in ["y", "n"]:
                logger.info("이미 도구 승인 대기 상태인데 새 메시지가 들어옴 → 승인/거부 필요 안내")
                return {
                    "type": "error",
                    "message": "이전에 요청된 도구 실행을 승인(y) 또는 거부(n) 해주세요.",
                    "responses": []
                }

        responses: List[Dict[str, Any]] = []
        events_gen = None

        # 2) 승인/거부/일반 분기
        if message.strip().lower() == "y":
            logger.info("도구 승인됨 - graph.invoke(None) 호출")
            events_gen = graph.invoke(None, config)
        elif message.strip().lower() == "n":
            logger.info("도구 거부됨")
            snap = graph.get_state(config)
            if not (snap and snap.next):
                return {
                    "type":"error",
                    "message":"승인 대기가 아닌데 거부를 시도했습니다.",
                    "responses":[]
                }
            msgs = snap.values.get("messages", [])
            if not msgs:
                return {
                    "type":"error",
                    "message":"메시지 기록이 없어 거부 불가",
                    "responses":[]
                }
            last_msg = msgs[-1]
            if not getattr(last_msg, "tool_calls", None):
                return {
                    "type":"error",
                    "message":"거부할 도구가 없습니다.",
                    "responses":[]
                }
            # 거부 메시지 생성
            from langchain_core.messages import ToolMessage, HumanMessage
            rejections = []
            for tc in last_msg.tool_calls:
                rejections.append(
                    ToolMessage(
                        tool_call_id=tc["id"],
                        content="도구 실행이 거부되었습니다."
                    )
                )
            # 그 뒤 CompleteOrEscalate 메시지로 상위 복귀
            escalate = HumanMessage(content="CompleteOrEscalate: 작업 취소합니다.")
            events_gen = graph.invoke({"messages": rejections + [escalate]}, config)
        else:
            # 일반 사용자 메시지
            logger.info("일반 사용자 메시지 처리 (graph.stream)")
            # 스트림 모드를 values로 설정하여 모든 중간 상태를 받음
            events_gen = graph.stream({"messages": ("user", message)}, config, stream_mode="values")

        # 3) 이벤트 스트림 → responses
        if events_gen is not None:
            # 응답 중복 체크를 위한 세트
            seen_contents = set()
            
            # 스트림 처리를 위해 이벤트를 하나씩 처리
            for ev in events_gen:
                if isinstance(ev, str):
                    logger.debug(f"[Debug str event] {ev}")
                    continue
                
                # 각 이벤트에서 응답 추출
                new_res = _extract_responses(ev)
                
                # 새 응답이 있으면 중복 체크 후 추가
                if new_res:
                    for res in new_res:
                        # 컨텐츠 기반으로 중복 체크
                        content = res.get("content", "")
                        if content and content not in seen_contents:
                            responses.append(res)
                            seen_contents.add(content)

        # 4) tool approval 체크
        snap_after = graph.get_state(config)
        logger.info(f"현재 상태: {snap_after}")
        
        if snap_after and snap_after.next:
            # metadata에서 writes 확인
            metadata = getattr(snap_after, 'metadata', {})
            writes = metadata.get('writes', {})
            
            # writes에서 tool_calls 확인
            for assistant_data in writes.values():
                if isinstance(assistant_data, dict) and 'messages' in assistant_data:
                    message = assistant_data['messages']
                elif hasattr(assistant_data, 'tool_calls'):
                    message = assistant_data
                else:
                    continue
                
                tool_calls = getattr(message, 'tool_calls', None)
                if tool_calls:
                    logger.info(f"도구 승인 요청: {tool_calls}")
                    return {
                        "type": "tool_approval",
                        "tools": tool_calls,
                        "message": "다음 작업을 실행할까요?",
                        "responses": responses,  # 모든 중간 응답을 포함
                        "thread_id": config["configurable"]["thread_id"]
                    }

        # 5) 최종 응답
        logger.info(f"최종 응답 반환: {responses}")
        return {
            "type": "message",
            "responses": responses,  # 모든 중간 응답을 포함
            "complete": not bool(snap_after and snap_after.next),
            "thread_id": config["configurable"]["thread_id"]
        }

    except Exception as e:
        logger.error(f"오류 발생: {e}", exc_info=True)
        
        # OpenAI API 에러 처리
        error_str = str(e)
        if "tool_calls" in error_str and "tool_call_id" in error_str:
            # 그래프 상태 초기화
            graph.reset_state(config)
            
            return {
                "type": "message",
                "responses": [{
                    "type": "message",
                    "content": "죄송합니다. 요청을 처리하는 중에 문제가 발생했습니다. 다시 한 번 말씀해 주시겠어요?",
                    "current_state": "error"
                }],
                "complete": True,
                "thread_id": config["configurable"]["thread_id"]
            }
            
        # 기타 에러는 기존대로 처리
        return {
            "type": "error",
            "message": f"오류 발생: {e}",
            "responses": []
        }


def _extract_responses(ev: dict) -> List[Dict[str, Any]]:
    responses = []
    # 중복 메시지 추적을 위한 세트
    seen_messages = set()
    
    logger.info("=== _extract_responses 시작 ===")
    logger.info(f"입력된 이벤트: {ev}")
    
    # 1. metadata의 writes에서 메시지 확인
    metadata = ev.get("metadata", {})
    writes = metadata.get("writes", {})
    
    logger.info(f"metadata 확인: {metadata}")
    logger.info(f"writes 확인: {writes}")
    
    if writes:
        logger.info("writes 처리 시작")
        
        # writes의 모든 assistant 메시지를 순회
        for assistant_name, assistant_data in writes.items():
            logger.info(f"Assistant 확인 중: {assistant_name}")
            if not assistant_data:
                continue
                
            # messages가 직접 AIMessage 객체인 경우
            message = assistant_data.get("messages") if isinstance(assistant_data, dict) else assistant_data
            logger.info(f"메시지 발견: {message}")
            
            if isinstance(message, AIMessage):
                # content 확인
                content = getattr(message, "content", "").strip()
                # tool_calls 확인
                tool_calls = getattr(message, "tool_calls", None)
                
                logger.info(f"컨텐츠 확인: {content}")
                logger.info(f"Tool calls 확인: {tool_calls}")
                
                # content가 있는 경우 추가 (사고 과정 포함)
                if content and content not in seen_messages:
                    logger.info(f"유효한 content 메시지 추가 from {assistant_name}")
                    responses.append({
                        "type": "message",
                        "content": content,
                        "current_state": assistant_name
                    })
                    seen_messages.add(content)
                
                # tool_calls가 있는 경우 추가 (도구 호출 전 액션)
                if tool_calls:
                    for tool_call in tool_calls:
                        func_name = tool_call.get("name", "")
                        args = tool_call.get("arguments", "{}")
                        try:
                            args_dict = json.loads(args) if isinstance(args, str) else args
                            # 도구 호출 준비 중 메시지 생성
                            thinking_content = f"도구 호출 준비 중: {func_name}\n인자: {json.dumps(args_dict, ensure_ascii=False, indent=2)}"
                            
                            # 중복 체크
                            if thinking_content not in seen_messages:
                                # 도구 호출 준비 중 메시지 추가 (사고 과정)
                                responses.append({
                                    "type": "thinking",
                                    "content": thinking_content,
                                    "current_state": assistant_name,
                                    "tool_info": {
                                        "name": func_name,
                                        "args": args_dict
                                    }
                                })
                                seen_messages.add(thinking_content)
                        except (json.JSONDecodeError, TypeError):
                            logger.error(f"JSON 파싱 실패: {args}")
                            continue
    
    # 2. 일반 메시지 처리 (writes에서 못 찾은 경우)
    logger.info("일반 메시지 처리 시작")
    msgs = ev.get("messages", [])
    if not isinstance(msgs, list):
        msgs = [msgs]
    
    logger.info(f"처리할 메시지 목록: {msgs}")
    
    for m in msgs:  # 모든 메시지 처리 (순서 유지)
        logger.info(f"메시지 처리 중: {m}")
        
        # ToolMessage 처리
        if isinstance(m, ToolMessage):
            content = getattr(m, "content", "").strip()
            name = getattr(m, "name", "")
            logger.info(f"ToolMessage 발견 - content: {content}, name: {name}")
            
            # 시스템 메시지 제외
            if any(skip in content for skip in [
                "The assistant is now",
                "Resuming dialog"
            ]):
                logger.info("시스템 메시지 스킵")
                continue
                
            # 도구 실행 결과 메시지 포함
            if content and content not in seen_messages:  # 중복 체크 추가
                logger.info("유효한 ToolMessage 추가")
                responses.append({
                    "type": "message",
                    "content": content,
                    "current_state": name if name else "tool"
                })
                seen_messages.add(content)
        
        # AIMessage 처리
        elif isinstance(m, AIMessage):
            content = getattr(m, "content", "").strip()
            tool_calls = getattr(m, "tool_calls", None)
            logger.info(f"AIMessage 발견 - content: {content}")
            
            if content and content not in seen_messages:  # 중복 체크 추가
                logger.info("유효한 AIMessage 추가")
                responses.append({
                    "type": "message",
                    "content": content,
                    "current_state": "ai"
                })
                seen_messages.add(content)
            elif tool_calls:
                # tool_calls가 있는 경우 처리
                for tool_call in tool_calls:
                    func_name = tool_call.get("function", {}).get("name")
                    if func_name:
                        args = tool_call.get("function", {}).get("arguments", "{}")
                        try:
                            args_dict = json.loads(args) if isinstance(args, str) else args
                            # 도구 호출 정보 메시지 생성
                            thinking_content = f"도구 호출 준비 중: {func_name}\n인자: {json.dumps(args_dict, ensure_ascii=False, indent=2)}"
                            
                            # 중복 체크
                            if thinking_content not in seen_messages:
                                # 도구 호출 정보 추가 (사고 과정)
                                responses.append({
                                    "type": "thinking",
                                    "content": thinking_content,
                                    "current_state": "ai",
                                    "tool_info": {
                                        "name": func_name,
                                        "args": args_dict
                                    }
                                })
                                seen_messages.add(thinking_content)
                            
                            # 특정 도구에 대한 사용자 친화적 메시지 추가
                            friendly_content = None
                            if func_name == "create_refrigerator":
                                friendly_content = f"냉장고 '{args_dict.get('name')}'를 생성하고 있습니다..."
                            elif func_name == "add_refrigerator_multiple_categories":
                                friendly_content = f"카테고리 {args_dict.get('categories')}를 추가하고 있습니다..."
                                
                            if friendly_content and friendly_content not in seen_messages:
                                responses.append({
                                    "type": "message",
                                    "content": friendly_content,
                                    "current_state": "refrigerator"
                                })
                                seen_messages.add(friendly_content)
                        except json.JSONDecodeError:
                            logger.error(f"JSON 파싱 실패: {args}")
                            continue
    
    # 3. 최종 결과 로깅
    logger.info("=== _extract_responses 결과 ===")
    logger.info(f"최종 responses: {responses}")
    logger.info(f"Dialog state: {ev.get('dialog_state', [])}")
    logger.info(f"Writes content: {writes}")
    
    return responses