"""
LangGraph 그래프에서 사용되는 모델 클래스들을 정의합니다.
"""

from typing import List, Type, Dict
from pydantic import BaseModel, Field
from langchain_core.runnables import Runnable, RunnableConfig


class SubAssistantConfig:
    """서브 어시스턴트 설정 클래스"""
    def __init__(
        self,
        name: str,  # 어시스턴트 이름 (예: "레시피 어시스턴트")
        id: str,    # 어시스턴트 ID (예: "recipe")
        system_prompt: str,  # 시스템 프롬프트
        safe_tools: List,    # 안전한 도구 목록
        sensitive_tools: List,  # 민감한 도구 목록
        transition_tool: Type[BaseModel]  # 전환 도구 클래스 (예: ToRecipeAssistant)
    ):
        self.name = name
        self.id = id
        self.system_prompt = system_prompt
        self.safe_tools = safe_tools
        self.sensitive_tools = sensitive_tools
        self.transition_tool = transition_tool


# 서브 어시스턴트 전환 도구 클래스들
class ToRecipeAssistant(BaseModel):
    """레시피 어시스턴트로 전환"""
    recipe_id: int = None
    request: str = Field(...)


class ToRefrigeratorAssistant(BaseModel):
    """냉장고 어시스턴트로 전환"""
    refrigerator_id: int = None
    request: str = Field(...)


class CompleteOrEscalate(BaseModel):
    """작업 완료하거나 상위로 돌아가는 특수 도구"""
    cancel: bool = True
    reason: str


class Assistant:
    """LLM 응답 실행 래퍼"""
    def __init__(self, runnable: Runnable):
        self.runnable = runnable

    def __call__(self, state: Dict, config: RunnableConfig):
        while True:
            result = self.runnable.invoke(state)
            if not result.tool_calls and (
                not result.content
                or (isinstance(result.content, list) and not result.content[0].get("text"))
            ):
                # 출력이 너무 빈약하면 "실제 출력으로 응답해주세요" 메시지 추가
                messages = state["messages"] + [("user", "실제 출력으로 응답해주세요.")]
                state = {**state, "messages": messages}
            else:
                break
        return {"messages": result} 