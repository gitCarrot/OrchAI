from typing import Dict, Any, List, Optional
from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig
import requests
import os
import logging
import aiohttp
import json
from .api_utils import make_request, handle_api_error

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Next.js API URL 설정 (Docker 네트워크 내에서의 통신)
NEXT_API_URL = os.getenv("NEXT_API_URL", "http://frontend:3000")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY")

if not INTERNAL_API_KEY:
    logger.warning("INTERNAL_API_KEY is not set!")
elif INTERNAL_API_KEY == "your-secret-key-here":
    logger.warning("INTERNAL_API_KEY is using default value! Please set a proper key.")

##############
# SAFE TOOLS #
##############

@tool
@handle_api_error
def get_all_recipes(config: RunnableConfig) -> str:
    """[SAFE] 사용자의 레시피 목록을 조회합니다."""
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")

    result = make_request(
        method="GET",
        endpoint="/api/recipes",
        user_id=user_id
    )
    return str(result)

@tool
@handle_api_error
def get_recipe_with_keyword(keyword: str, language: str = "ko", config: RunnableConfig = None) -> str:
    """[SAFE] 키워드로 레시피를 검색합니다. 제목, 내용, 설명, 태그에서 키워드를 검색합니다.
    
    Args:
        keyword: 검색할 키워드
        language: 검색 언어 (기본값: 'ko', 옵션: 'en', 'ja')
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    # 언어 유효성 검사
    if language not in ["ko", "en", "ja"]:
        language = "ko"  # 기본값으로 설정
    
    # 검색 API 호출
    result = make_request(
        method="POST",
        endpoint="/api/recipes/search",
        user_id=user_id,
        data={
            "keyword": keyword,
            "language": language
        }
    )
    
    return str(result)

@tool
@handle_api_error
def get_recipe_details(recipe_id: str, config: RunnableConfig) -> str:
    """[SAFE] 특정 레시피의 상세 정보를 조회합니다."""
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")

    result = make_request(
        method="GET",
        endpoint=f"/api/recipes/{recipe_id}",
        user_id=user_id
    )
    return str(result)

@tool
@handle_api_error
def get_favorite_recipes(config: RunnableConfig) -> str:
    """[SAFE] 즐겨찾기한 레시피 목록을 조회합니다."""
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")

    result = make_request(
        method="GET",
        endpoint="/api/recipes/favorites",
        user_id=user_id
    )
    return str(result)

@tool
@handle_api_error
def get_shared_recipes(config: RunnableConfig) -> str:
    """[SAFE] 공유된 레시피 목록을 조회합니다."""
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id", None)
    if not user_id:
        raise ValueError("No user_id configured.")
    try:
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-api-key': INTERNAL_API_KEY or '',
            'x-user-id': user_id
        }
        response = requests.get(
            f"{NEXT_API_URL}/api/recipes/shared",
            headers=headers
        )
        if response.status_code == 200:
            recipes = response.json()
            return "\n".join([
                f"- {r['title']} (ID: {r['id']}, 공유자: {r['ownerName']})"
                for r in recipes
            ])
        else:
            return f"공유 레시피 목록 조회 실패: {response.status_code}"
    except Exception as e:
        return f"공유 레시피 목록 조회 중 오류 발생: {str(e)}"

@tool
@handle_api_error
def search_shared_recipes(keyword: str, config: RunnableConfig) -> str:
    """[SAFE] 공유된 레시피를 키워드로 검색합니다. 제목, 내용, 설명, 태그에서 키워드를 검색합니다.
    
    Args:
        keyword: 검색할 키워드
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    # 검색 API 호출
    result = make_request(
        method="POST",
        endpoint="/api/recipes/shared/search",
        user_id=user_id,
        data={
            "keyword": keyword
        }
    )
    
    return str(result)

###############
# SENSITIVE TOOLS #
###############

@tool
@handle_api_error
def create_recipe(
    title: str,
    content: str,
    description: str,
    tags: List[str],
    language: str,
    config: RunnableConfig,
) -> str:
    """[SENSITIVE] 새로운 레시피를 생성합니다."""
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")

    translations = [
        {
            "language": language,
            "title": title,
            "content": content,
            "description": description
        },
    ]

    result = make_request(
        method="POST",
        endpoint="/api/recipes",
        user_id=user_id,
        data={
            "type": "ai",
            "isPublic": False,
            "translations": translations,
            "tags": tags
        }
    )
    return str(result)

@tool
@handle_api_error
def update_recipe(
    recipe_id: str,
    ko_title: str,
    ko_content: str,
    ko_description: str,
    en_title: str,
    en_content: str,
    en_description: str,
    ja_title: str,
    ja_content: str,
    ja_description: str,
    tags: List[str],
    config: RunnableConfig
) -> str:
    """[SENSITIVE] 레시피를 수정합니다."""
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")

    translations = [
        {
            "language": "ko",
            "title": ko_title,
            "content": ko_content,
            "description": ko_description
        },
        {
            "language": "en",
            "title": en_title,
            "content": en_content,
            "description": en_description
        },
        {
            "language": "ja",
            "title": ja_title,
            "content": ja_content,
            "description": ja_description
        }
    ]

    result = make_request(
        method="PUT",
        endpoint=f"/api/recipes/{recipe_id}",
        user_id=user_id,
        data={
            "translations": translations,
            "tags": tags
        }
    )
    return str(result)

@tool
@handle_api_error
def delete_recipe(recipe_id: str, config: RunnableConfig) -> str:
    """[SENSITIVE] 레시피를 삭제합니다."""
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")

    result = make_request(
        method="DELETE",
        endpoint=f"/api/recipes/{recipe_id}",
        user_id=user_id
    )
    return str(result)

@tool
@handle_api_error
def share_recipe(recipe_id: str, target_user_id: str, user_id: str) -> str:
    """[SENSITIVE] 레시피를 다른 사용자와 공유합니다."""
    result = make_request(
        method="POST",
        endpoint=f"/api/recipes/{recipe_id}/share",
        user_id=user_id,
        data={"targetUserId": target_user_id}
    )
    return str(result)

@tool
@handle_api_error
def toggle_favorite_many_recipes(recipe_ids: List[int], action: str, config: RunnableConfig) -> str:
    """[SENSITIVE] 여러 레시피의 즐겨찾기 상태를 한 번에 변경합니다."""
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")

    result = make_request(
        method="POST",
        endpoint="/api/recipes/favorites/batch",
        user_id=user_id,
        data={
            "recipeIds": recipe_ids,
            "action": action
        }
    )
    return str(result)

# Safe Tools
safe_tools = [
    get_recipe_details,
    get_favorite_recipes,
    get_shared_recipes,
    search_shared_recipes,
    get_recipe_with_keyword,
]

# Sensitive Tools
sensitive_tools = [
    create_recipe,
    update_recipe,
    delete_recipe,
    share_recipe,
    toggle_favorite_many_recipes,
] 