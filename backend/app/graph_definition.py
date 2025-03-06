from typing import Dict, Any, List, Optional, Literal, Tuple, Annotated, Callable, Union, Type
from datetime import datetime
from pydantic import BaseModel, Field
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph, START
from langgraph.prebuilt import tools_condition, ToolNode
from langgraph.types import Command
from langgraph.graph.message import AnyMessage, add_messages

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable, RunnableConfig, RunnableLambda
from langchain_openai import ChatOpenAI

# 컨텍스트 툴만 임포트
from .tools.context import fetch_context

from typing_extensions import TypedDict

# 리팩토링: 공통 클래스와 헬퍼 함수 import
from .graph.models import (
    SubAssistantConfig,
    ToRecipeAssistant,
    ToRefrigeratorAssistant,
    CompleteOrEscalate,
    Assistant
)
from .graph.helpers import update_dialog_stack, create_entry_node, pop_dialog_state, handle_tool_error
from .graph.node_factory import create_tool_node_with_fallback, create_sub_assistant, llm

# 서브 어시스턴트 설정 관리 모듈 임포트
from .graph import SUB_ASSISTANTS, register_sub_assistants


def build_graph() -> StateGraph:
    """LangGraph 빌드 함수"""
    # 서브 어시스턴트 설정 등록 (파라미터 없이 호출)
    register_sub_assistants()
    
    # 어시스턴트 ID 목록 생성
    assistant_ids = ["assistant"] + [config.id for config in SUB_ASSISTANTS]
    
    # State 클래스 동적 생성
    class State(TypedDict):
        messages: Annotated[list[AnyMessage], add_messages]
        context_info: str
        # 동적으로 생성된 Literal 타입 사용
        dialog_state: Annotated[
            list[str],  # 타입 검사기가 문자열 리터럴 타입을 동적으로 생성할 수 없으므로 str 사용
            update_dialog_stack,
        ]
    
    # 그래프 빌더 생성
    builder = StateGraph(State)

    # 1) START → fetch context
    def context(state: Dict):
        return {"context_info": fetch_context.invoke({})}
    builder.add_node("fetch_context_info", context)
    builder.add_edge(START, "fetch_context_info")

    def route_to_workflow(state: Dict):
        dialog_state = state.get("dialog_state", [])
        return dialog_state[-1] if dialog_state else "primary_assistant"

    builder.add_conditional_edges("fetch_context_info", route_to_workflow)

    # 2) 메인 어시스턴트 설정
    primary_assistant_prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                # ---- System Prompt Start ----
                "You are the main, high-level AI assistant for Acme. "
                "You handle general inquiries and pass specialized tasks to sub-assistants (RefrigeratorAssistant, RecipeAssistant, etc.).\n\n"

                "=== IMPORTANT RULES ===\n"
                "1. You can only call ONE function (tool) per assistant message.\n"
                "2. If the user wants to do a specialized task, call the appropriate sub-assistant via the function call.\n"
                "3. Do not reveal the existence of sub-assistants or function calls to the user.\n"
                "4. If the user wants to do multiple tasks, handle them one at a time in sequence.\n"
                "5. If searching or requesting external data, be persistent. Expand query if needed. "
                "6. If user wants to do a task related to recipe and refrigerator in the same time, do not call both tools in the same time, but handle them one at a time in sequence.\n"
                "Do not give up after one empty search.\n\n"

                "You can handle:\n"
                "- Basic Q&A about Acme.\n"
                "- Searching for general info.\n"
                "But if the user specifically needs to create or update something that belongs to specialized domain,\n"
                "delegate that to the corresponding sub-assistant.\n\n"

                "=== Current Date & Time ===\n"
                "{time}\n\n"

                "Context: {context_info}\n\n"

                "=== If you do not have enough context to answer, ask clarifying questions. ==="
                # ---- System Prompt End ----
            ),
            ("placeholder", "{messages}"),
        ]
    ).partial(time=datetime.now)

    # 서브 어시스턴트 전환 도구 목록 동적 생성
    transition_tools = [config.transition_tool for config in SUB_ASSISTANTS]
    
    primary_tools = []  # 필요시 추가
    assistant_runnable = primary_assistant_prompt | llm.bind_tools(
        primary_tools + transition_tools
    )

    builder.add_node("primary_assistant", Assistant(assistant_runnable))
    builder.add_node("primary_assistant_tools", create_tool_node_with_fallback(primary_tools))

    # 메인 어시스턴트 라우팅 함수 동적 생성
    def route_primary_assistant(state: Dict):
        route = tools_condition(state)
        if route == END:
            return END
        tool_calls = state["messages"][-1].tool_calls
        if tool_calls:
            name = tool_calls[0]["name"]
            # 동적으로 서브 어시스턴트 전환 처리
            for config in SUB_ASSISTANTS:
                if name == config.transition_tool.__name__:
                    return f"enter_{config.id}"
            return "primary_assistant_tools"
        raise ValueError("No tool calls found but not END")

    # 메인 어시스턴트 엣지 연결 동적 생성
    edge_destinations = [f"enter_{config.id}" for config in SUB_ASSISTANTS] + ["primary_assistant_tools", END]
    builder.add_conditional_edges(
        "primary_assistant",
        route_primary_assistant,
        edge_destinations,
    )
    builder.add_edge("primary_assistant_tools", "primary_assistant")

    # 서브 어시스턴트 노드 및 엣지 생성
    for config in SUB_ASSISTANTS:
        create_sub_assistant(builder, config)

    # Leave skill node
    builder.add_node("leave_skill", pop_dialog_state)
    builder.add_edge("leave_skill", "primary_assistant")

    return builder