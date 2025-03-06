from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig


@tool
def fetch_context(config: RunnableConfig) -> str:
    """
    Fetch the context of the user.
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id", None)
    if not user_id:
        raise ValueError("No user_id configured.")
    
    # 현재 페이지 가져오기
    page = configuration.get("page", None)
    if not page:
        raise ValueError("No page configured.") 
    
    # 현재 냉장고 가져오기 (선택적)
    refrigerator_id = configuration.get("refrigerator_id", None)
    
    # 현재 레시피 가져오기 (선택적)
    recipe_id = configuration.get("recipe_id", None)
    
    # 현재 카테고리 가져오기 (선택적)
    category_id = configuration.get("category_id", None)

    user_language = configuration.get("user_language", None)
    
    context_info = [f"user ID: {user_id}", f"current page: {page}"]
    
    if refrigerator_id:
        context_info.append(f"refrigerator ID: {refrigerator_id}")
    if recipe_id:
        context_info.append(f"recipe ID: {recipe_id}")
    if category_id:
        context_info.append(f"category ID: {category_id}")
    if user_language:
        context_info.append(f"user language: {user_language}")
    
    return " | ".join(context_info)

    