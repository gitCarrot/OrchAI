"""
서브 어시스턴트 설정을 관리하는 모듈입니다.
새로운 서브 어시스턴트를 추가하려면 이 파일에 설정을 추가하면 됩니다.
"""

from typing import List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

# 도구 모듈에서 직접 임포트
from ..tools.recipes import safe_tools as recipe_safe_tools, sensitive_tools as recipe_sensitive_tools
from ..tools.refrigerators import safe_tools as refrigerator_safe_tools, sensitive_tools as refrigerator_sensitive_tools

from .models import SubAssistantConfig, ToRecipeAssistant, ToRefrigeratorAssistant

# 서브 어시스턴트 설정 목록
SUB_ASSISTANTS = []

def register_sub_assistants() -> List[SubAssistantConfig]:
    """
    서브 어시스턴트 설정을 등록하는 함수
    
    Returns:
        등록된 서브 어시스턴트 설정 목록
    """
    global SUB_ASSISTANTS
    SUB_ASSISTANTS.clear()  # 기존 목록 초기화
    
    # 레시피 어시스턴트 설정 생성 및 등록
    recipe_assistant = create_recipe_assistant(recipe_safe_tools, recipe_sensitive_tools)
    SUB_ASSISTANTS.append(recipe_assistant)
    
    # 냉장고 어시스턴트 설정 생성 및 등록
    refrigerator_assistant = create_refrigerator_assistant(refrigerator_safe_tools, refrigerator_sensitive_tools)
    SUB_ASSISTANTS.append(refrigerator_assistant)
    
    # 여기에 새로운 서브 어시스턴트를 추가할 수 있습니다
    
    return SUB_ASSISTANTS

def create_recipe_assistant(safe_tools: List[Any], sensitive_tools: List[Any]) -> SubAssistantConfig:
    """레시피 어시스턴트 설정 생성"""
    recipe_system_prompt = """You are HIRecipi's Recipe Management Specialist Assistant. The main assistant delegates recipe-related tasks to you.

Key Responsibilities:
1. Create/modify/delete recipes.
2. Manage recipe content/formatting.
3. Handle recipe sharing/favorites.

Important:
1. Call only ONE tool at a time.
2. If user changes request or you finish the recipe task, call CompleteOrEscalate to return.
3. If a tool call fails (e.g., create_recipe returns an error), DO NOT automatically retry.
   - Instead, show an error or call CompleteOrEscalate.
4. If user explicitly asks to retry, you can call tool again.
5. Do not mention that you are a specialized assistant or mention 'function calls' to the user.

Language handling:
 - Maintain the user's language.

If searching or retrieving recipes returns empty, expand the query range or confirm with the user.

Now handle the conversation based on the user's messages below."""

    return SubAssistantConfig(
        name="레시피 어시스턴트",
        id="recipe",
        system_prompt=recipe_system_prompt,
        safe_tools=safe_tools,
        sensitive_tools=sensitive_tools,
        transition_tool=ToRecipeAssistant
    )

def create_refrigerator_assistant(safe_tools: List[Any], sensitive_tools: List[Any]) -> SubAssistantConfig:
    """냉장고 어시스턴트 설정 생성"""
    refrigerator_system_prompt = """You are the Refrigerator Management Specialist Assistant. 
The main assistant delegates to you whenever the user wants to create, update, or delete refrigerators.

=== IMPORTANT RULES ===
1. Only ONE tool call (function) per message.
2. If the user changes topic or you have completed the refrigerator task, call `CompleteOrEscalate` to return.
3. If you need more info or the user changed their mind, also call `CompleteOrEscalate`.
4. If a tool call fails (e.g., create_recipe returns an error), DO NOT automatically retry.
   - Instead, show an error or call CompleteOrEscalate.
5. If user explicitly asks to retry, you can call tool again.
6. For searching or listing refrigerators, be persistent. Expand the query if results are empty.
7. If user is trying to create refrigerators, categories, and ingredients in one message, please finish creating the objects in this order: refrigerators -> categorys -> ingredients.
8. Before creating, modifying, or deleting a category, it must be clear which refrigerator is being referenced. Similarly, when creating, modifying, or deleting an ingredient, both the category and the refrigerator must be explicitly identified. If they are not clearly specified, the system should either call an API to retrieve the necessary information or prompt the user to provide the refrigerator and category names.
9. The user doesn't know about your existence as a sub-assistant, do not mention sub-assistant or function calls directly.

=== Example tasks ===
- Create a new refrigerator: call `create_refrigerator` with name and description.
- Update or delete a refrigerator: call `update_refrigerator` or `delete_refrigerator`.
- If the user says 'never mind', or wants a recipe or something else, `CompleteOrEscalate`.

=== Current Time ===
{time}

Now read the conversation so far and respond."""

    return SubAssistantConfig(
        name="냉장고 어시스턴트",
        id="refrigerator",
        system_prompt=refrigerator_system_prompt,
        safe_tools=safe_tools,
        sensitive_tools=sensitive_tools,
        transition_tool=ToRefrigeratorAssistant
    )


# 새로운 서브 어시스턴트 추가 예제 (주석 처리됨)
"""
def create_new_assistant(safe_tools: List[Any], sensitive_tools: List[Any]) -> SubAssistantConfig:
    # 1. 전환 도구 클래스 정의 (models.py에 추가해야 함)
    # class ToNewAssistant(BaseModel):
    #     some_id: int = None
    #     request: str = Field(...)
    
    # 2. 시스템 프롬프트 정의
    new_assistant_system_prompt = '''You are a New Specialized Assistant.
    
    Key Responsibilities:
    1. Handle specific tasks related to your domain.
    2. Provide expert guidance.
    
    Important Rules:
    1. Call only ONE tool at a time.
    2. If user changes request or you finish your task, call CompleteOrEscalate to return.
    3. Do not mention that you are a specialized assistant.
    
    Now handle the conversation based on the user's messages below.'''
    
    # 3. 설정 객체 생성 및 반환
    from .models import ToNewAssistant  # 이 부분은 models.py에 ToNewAssistant 클래스를 추가한 후에 주석 해제
    
    return SubAssistantConfig(
        name="새로운 어시스턴트",
        id="new_assistant",
        system_prompt=new_assistant_system_prompt,
        safe_tools=safe_tools,
        sensitive_tools=sensitive_tools,
        transition_tool=ToNewAssistant
    )
""" 