"""
LangGraph 그래프에서 사용되는 헬퍼 함수들을 정의합니다.
"""

from typing import Dict, Optional, List
from langchain_core.messages import ToolMessage


def update_dialog_stack(left: list[str], right: Optional[str]) -> list[str]:
    """dialog_state 스택 push/pop 헬퍼"""
    if right is None:
        return left
    if right == "pop":
        return left[:-1]
    return left + [right]


def create_entry_node(assistant_name: str, new_dialog_state: str):
    """
    서브 어시스턴트 진입 노드 생성 함수
    예: ToRecipeAssistant → "레시피 어시스턴트로 전환"
    """
    def entry_node(state: Dict) -> dict:
        tool_call_id = state["messages"][-1].tool_calls[0]["id"]
        return {
            "messages": [
                ToolMessage(
                    content=(
                        f"The assistant is now the {assistant_name}. "
                        "Use the provided tools to help the user. "
                        "IMPORTANT: Only call ONE tool at a time. "
                        "If the user changes their mind or you finish your task, call CompleteOrEscalate to return."
                    ),
                    tool_call_id=tool_call_id,
                )
            ],
            "dialog_state": new_dialog_state,
        }
    return entry_node


def pop_dialog_state(state: Dict) -> dict:
    """CompleteOrEscalate 후 메인 어시스턴트로 복귀."""
    messages = []
    if state["messages"][-1].tool_calls:
        messages.append(
            ToolMessage(
                content="Resuming dialog with the main assistant.",
                tool_call_id=state["messages"][-1].tool_calls[0]["id"],
            )
        )
    return {"dialog_state": "pop", "messages": messages}


def handle_tool_error(state):
    """도구 실행 중 오류 발생 시 처리 함수"""
    error = state.get("error")
    tool_calls = state["messages"][-1].tool_calls
    # Generate a single "ToolMessage" telling there's an error
    return {
        "messages": [
            ToolMessage(
                name=tool_calls[0]["name"],  # e.g., create_recipe
                content=f"오류 발생: {error}",
                tool_call_id=tool_calls[0]["id"],
            )
        ]
    } 