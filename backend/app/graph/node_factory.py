"""
LangGraph 그래프에서 사용되는 노드 생성 관련 함수들을 정의합니다.
"""

from typing import Dict, List
from datetime import datetime
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import tools_condition, ToolNode
from langgraph.types import Command
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda
from langchain_openai import ChatOpenAI

# 상대 경로 임포트로 변경
from .models import SubAssistantConfig, CompleteOrEscalate, Assistant
from .helpers import create_entry_node, handle_tool_error

# LLM 인스턴스 생성
llm = ChatOpenAI(model="gpt-4o-mini")


def create_tool_node_with_fallback(tools: list) -> dict:
    """
    오류 처리 기능이 있는 도구 노드 생성 함수
    """
    return ToolNode(tools).with_fallbacks(
        [RunnableLambda(handle_tool_error)],
        exception_key="error"
    )


def create_sub_assistant(
    builder: StateGraph,
    config: SubAssistantConfig
) -> None:
    """서브 어시스턴트 노드와 엣지를 생성하는 함수"""
    
    # 1. 어시스턴트 프롬프트 생성
    assistant_prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            config.system_prompt
        ),
        ("placeholder", "{messages}")
    ]).partial(time=datetime.now)

    # 2. 어시스턴트 실행기 생성
    assistant_runnable = assistant_prompt | llm.bind_tools(
        config.safe_tools + config.sensitive_tools + [CompleteOrEscalate]
    )
    
    # 3. 노드 생성
    # 3.1 진입 노드
    builder.add_node(f"enter_{config.id}", create_entry_node(config.name, config.id))
    # 3.2 어시스턴트 노드
    builder.add_node(config.id, Assistant(assistant_runnable))
    # 3.3 도구 노드
    builder.add_node(f"{config.id}_safe_tools", create_tool_node_with_fallback(config.safe_tools))
    builder.add_node(f"{config.id}_sensitive_tools", create_tool_node_with_fallback(config.sensitive_tools))
    
    # 4. 엣지 연결
    # 4.1 진입 노드 -> 어시스턴트 노드
    builder.add_edge(f"enter_{config.id}", config.id)
    
    # 4.2 어시스턴트 노드 -> 도구 노드 또는 종료 노드 (조건부)
    def route_assistant(state: Dict):
        route = tools_condition(state)
        if route == END:
            return END
        tool_calls = state["messages"][-1].tool_calls
        if any(tc["name"] == CompleteOrEscalate.__name__ for tc in tool_calls):
            return "leave_skill"
        safe_toolnames = [t.name for t in config.safe_tools]
        if all(tc["name"] in safe_toolnames for tc in tool_calls):
            return f"{config.id}_safe_tools"
        return f"{config.id}_sensitive_tools"
    
    builder.add_conditional_edges(
        config.id,
        route_assistant,
        [f"{config.id}_safe_tools", f"{config.id}_sensitive_tools", "leave_skill", END],
    )
    
    # 4.3 도구 노드 -> 어시스턴트 노드
    builder.add_edge(f"{config.id}_safe_tools", config.id)
    builder.add_edge(f"{config.id}_sensitive_tools", config.id) 