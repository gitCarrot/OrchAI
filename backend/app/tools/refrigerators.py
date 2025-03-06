from typing import Dict, Any, List, Optional
from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig
import os
import logging
from .api_utils import make_request, handle_api_error

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Next.js API URL 설정 (Docker 네트워크 내에서의 통신)
NEXT_API_URL = os.getenv("NEXT_API_URL", "http://frontend:3000")
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
def get_refrigerators(config: RunnableConfig) -> str:
    """[SAFE] 사용자의 모든 냉장고 목록을 조회합니다.
    
    Args:
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    refrigerators = make_request(
        method="GET",
        endpoint="/api/refrigerators",
        user_id=user_id
    )
    
    return "\n".join([
        f"- {r['name']} (ID: {r['id']}, 멤버: {r['memberCount']}명, 재료: {r['ingredientCount']}개)"
        for r in refrigerators
    ])

@tool
@handle_api_error
def get_refrigerator_state(refrigerator_id: int, config: RunnableConfig) -> str:
    """[SAFE] 특정 냉장고의 상태를 조회합니다.
    
    Args:
        refrigerator_id: 냉장고 ID
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    response = make_request(
        method="GET",
        endpoint=f"/api/refrigerators/{refrigerator_id}/state",
        user_id=user_id
    )
    
    state = response.get('state', '알 수 없음')
    return f"냉장고 상태: {state}"

@tool
@handle_api_error
def get_categories(refrigerator_id: int, config: RunnableConfig) -> str:
    """[SAFE] 특정 냉장고의 카테고리 목록을 조회합니다.
    
    Args:
        refrigerator_id: 냉장고 ID
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    categories = make_request(
        method="GET",
        endpoint=f"/api/refrigerators/{refrigerator_id}/categories",
        user_id=user_id
    )
    
    return "\n".join([f"- {c['name']} (ID: {c['categoryId']})" for c in categories])

@tool
@handle_api_error
def get_members(refrigerator_id: int, config: RunnableConfig) -> str:
    """[SAFE] 특정 냉장고의 멤버 목록을 조회합니다.
    
    Args:
        refrigerator_id: 냉장고 ID
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    members = make_request(
        method="GET",
        endpoint=f"/api/refrigerators/{refrigerator_id}/members",
        user_id=user_id
    )
    
    return "\n".join([f"- {m['name']} (ID: {m['id']})" for m in members])

@tool
@handle_api_error
def get_refrigerator_categories(refrigerator_id: int, config: RunnableConfig) -> str:
    """[SAFE] 특정 냉장고의 카테고리 목록을 조회합니다.
    
    Args:
        refrigerator_id: 냉장고 ID
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    categories = make_request(
        method="GET",
        endpoint=f"/api/refrigerators/{refrigerator_id}/categories",
        user_id=user_id
    )
    
    return "\n".join([
        f"- {c['category']['translations'][0]['name']} (ID: {c['categoryId']})"
        for c in categories
    ])

@tool
@handle_api_error
def get_refrigerator_details(refrigerator_id: int, config: RunnableConfig) -> str:
    """[SAFE] 특정 냉장고의 상세 정보를 조회합니다.
    
    Args:
        refrigerator_id: 냉장고 ID
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    data = make_request(
        method="GET",
        endpoint=f"/api/refrigerators/{refrigerator_id}",
        user_id=user_id
    )
    
    return f"""냉장고 정보:
- 이름: {data['name']}
- 설명: {data.get('description', '설명 없음')}
- 소유자: {'네' if data['isOwner'] else '아니오'}
- 권한: {data['role']}
- 멤버 수: {data['memberCount']}명
- 재료 수: {data['ingredientCount']}개
- 생성일: {data['createdAt']}"""

###############
# SENSITIVE TOOLS #
###############

@tool
@handle_api_error
def update_refrigerator_state(refrigerator_id: int, new_state: str, config: RunnableConfig) -> str:
    """[SENSITIVE] 특정 냉장고의 상태를 업데이트합니다.
    
    Args:
        refrigerator_id: 냉장고 ID
        new_state: 새로운 상태값
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    make_request(
        method="PUT",
        endpoint=f"/api/refrigerators/{refrigerator_id}/state",
        user_id=user_id,
        data={"state": new_state}
    )
    
    return f"냉장고 {refrigerator_id}의 상태가 '{new_state}'로 업데이트되었습니다."

@tool
@handle_api_error
def update_category(
    refrigerator_id: int,
    category_id: str,
    translations: List[Dict[str, str]],
    icon: str | None = None,
    config: RunnableConfig = None
) -> str:
    """[SENSITIVE] 특정 냉장고의 카테고리를 수정합니다.
    
    Args:
        refrigerator_id: 냉장고 ID
        category_id: 카테고리 ID
        translations: 다국어 번역 정보 리스트 (예: [{"language": "ko", "name": "음료수"}])
        icon: 카테고리 아이콘 (선택사항)
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    # 업데이트할 데이터 준비
    update_data = {"translations": translations}
    if icon:
        update_data["icon"] = icon
    
    make_request(
        method="PUT",
        endpoint=f"/api/refrigerators/{refrigerator_id}/categories/{category_id}",
        user_id=user_id,
        data=update_data
    )
    
    return f"냉장고 {refrigerator_id}의 카테고리 {category_id}가 성공적으로 수정되었습니다."

@tool
@handle_api_error
def delete_category(refrigerator_id: int, category_id: str, config: RunnableConfig) -> str:
    """[SENSITIVE] 특정 냉장고의 카테고리를 삭제합니다.
    
    Args:
        refrigerator_id: 냉장고 ID
        category_id: 카테고리 ID
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    make_request(
        method="DELETE",
        endpoint=f"/api/refrigerators/{refrigerator_id}/categories/{category_id}",
        user_id=user_id
    )
    
    return f"냉장고 {refrigerator_id}의 카테고리 {category_id}가 삭제되었습니다."

@tool
@handle_api_error
def create_refrigerator(name: str, description: str | None, config: RunnableConfig) -> str:
    """[SENSITIVE] 새로운 냉장고를 생성합니다.
    
    Args:
        name: 냉장고 이름
        description: 냉장고 설명 (선택사항)
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    data = {
        "name": name,
        "description": description
    }
    
    refrigerator = make_request(
        method="POST",
        endpoint="/api/refrigerators",
        user_id=user_id,
        data=data
    )
    
    return f"냉장고 '{refrigerator['name']}'가 생성되었습니다. (ID: {refrigerator['id']})"

@tool
@handle_api_error
def add_ingredient(refrigerator_id: int, category_id: int, data: Dict[str, Any], config: RunnableConfig) -> str:
    """[SENSITIVE] 냉장고의 특정 카테고리에 재료를 추가합니다.
    
    Args:
        refrigerator_id: 냉장고 ID
        category_id: 카테고리 ID
        data: 재료 정보
            - name (str): 재료 이름
            - quantity (str): 수량
            - unit (str): 단위 ('g', 'kg', 'ml', 'l', '개', '봉', '팩', '병' 중 하나)
            - expiryDate (str | None): 유통기한 (ISO 8601 형식의 날짜 문자열 또는 None)
        config: 설정 정보 (user_id 포함)
    
    Returns:
        str: 성공 메시지 또는 에러 메시지
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    result = make_request(
        method="POST",
        endpoint=f"/api/refrigerators/{refrigerator_id}/categories/{category_id}/ingredients",
        user_id=user_id,
        data=data
    )
    
    return f"재료 '{result['name']}'이(가) 추가되었습니다."

@tool
@handle_api_error
def update_ingredient(refrigerator_id: int, category_id: int, ingredient_id: int, data: Dict[str, Any], config: RunnableConfig) -> str:
    """[SENSITIVE] 냉장고의 특정 카테고리에 있는 재료를 수정합니다.
    
    Args:
        refrigerator_id: 냉장고 ID
        category_id: 카테고리 ID
        ingredient_id: 재료 ID
        data: 재료 정보
            - name (str): 재료 이름
            - quantity (str): 수량
            - unit (str): 단위 ('g', 'kg', 'ml', 'l', '개', '봉', '팩', '병' 중 하나)
            - expiryDate (str | None): 유통기한 (ISO 8601 형식의 날짜 문자열 또는 None)
            - refrigeratorCategoryId (int, optional): 이동할 카테고리 ID
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    result = make_request(
        method="PATCH",
        endpoint=f"/api/refrigerators/{refrigerator_id}/categories/{category_id}/ingredients/{ingredient_id}",
        user_id=user_id,
        data=data
    )
    
    return f"재료 '{result['name']}'이(가) 수정되었습니다."

@tool
@handle_api_error
def delete_ingredient(refrigerator_id: int, category_id: int, ingredient_id: int, config: RunnableConfig) -> str:
    """[SENSITIVE] 냉장고의 특정 카테고리에서 재료를 삭제합니다.
    
    Args:
        refrigerator_id: 냉장고 ID
        category_id: 카테고리 ID
        ingredient_id: 재료 ID
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    make_request(
        method="DELETE",
        endpoint=f"/api/refrigerators/{refrigerator_id}/categories/{category_id}/ingredients/{ingredient_id}",
        user_id=user_id
    )
    
    return f"재료가 성공적으로 삭제되었습니다."

@tool
@handle_api_error
def share_refrigerator(refrigerator_id: int, email: str, config: RunnableConfig) -> str:
    """[SENSITIVE] 냉장고를 다른 사용자와 공유합니다.
    
    Args:
        refrigerator_id: 냉장고 ID
        email: 공유할 사용자의 이메일
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    make_request(
        method="POST",
        endpoint=f"/api/refrigerators/{refrigerator_id}/invitations",
        user_id=user_id,
        data={"email": email}
    )
    
    return f"냉장고 {refrigerator_id}가 {email}에게 공유되었습니다."

@tool
@handle_api_error
def add_refrigerator_single_category(refrigerator_id: int, type: str, name: str, icon: str | None, config: RunnableConfig) -> str:
    """[SENSITIVE] 냉장고에 새로운 카테고리를 추가합니다.
    
    Args:
        refrigerator_id: 냉장고 ID
        type: 카테고리 타입 (custom 또는 default)
        name: 카테고리 이름 (여러 개일 경우 쉼표로 구분)
        icon: 카테고리 아이콘 (선택사항, 기본값: 📦)
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    # 여러 카테고리 이름을 처리
    category_names = [n.strip() for n in name.split(',')]
    results = []
    
    for category_name in category_names:
        data = {
            "type": "custom", 
            "icon": icon or "📦",
            "translations": [
                {
                    "language": "ko",
                    "name": category_name
                }
            ]
        }
        
        try:
            make_request(
                method="POST",
                endpoint=f"/api/refrigerators/{refrigerator_id}/categories",
                user_id=user_id,
                data=data
            )
            
            results.append(f"카테고리 '{category_name}'가 추가되었습니다.")
        except Exception as e:
            results.append(f"카테고리 '{category_name}' 추가 중 오류 발생: {str(e)}")
    
    return "\n".join(results)

@tool
@handle_api_error
def delete_refrigerator_category(refrigerator_id: int, category_id: int, config: RunnableConfig) -> str:
    """[SENSITIVE] 냉장고에서 카테고리를 삭제합니다.
    
    Args:
        refrigerator_id: 냉장고 ID
        category_id: 카테고리 ID
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    make_request(
        method="DELETE",
        endpoint=f"/api/refrigerators/{refrigerator_id}/categories/{category_id}",
        user_id=user_id
    )
    
    return f"카테고리가 삭제되었습니다."

@tool
@handle_api_error
def add_refrigerator_multiple_categories(refrigerator_id: int, icon: str | None, categories: List[str], config: RunnableConfig) -> str:
    """[SENSITIVE] 여러 카테고리를 한 번에 추가합니다.
    
    Args:
        refrigerator_id: 냉장고 ID
        icon: 카테고리 아이콘 (아이콘 문자열, 기본값: 📦)
        categories: 추가할 카테고리 이름 목록 (예: ["과일", "음료수"])
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    # 카테고리 목록을 API 요청 형식으로 변환
    category_data = [
        {
            "type": "custom",
            "icon": icon or "📦",  # 기본 아이콘
            "translations": [
                {
                    "language": "ko",
                    "name": name
                }
            ]
        }
        for name in categories
    ]
    
    created_categories = make_request(
        method="POST",
        endpoint=f"/api/refrigerators/{refrigerator_id}/categories/batch",
        user_id=user_id,
        data={"categories": category_data}
    )
    
    category_names = [cat["category"]["translations"][0]["name"] for cat in created_categories]
    return f"다음 카테고리들이 성공적으로 추가되었습니다: {', '.join(category_names)}"

@tool
@handle_api_error
def add_refrigerator_single_category_in_multi_language(
    refrigerator_id: int,
    ko_category: str,
    us_category: str,
    jp_category: str,
    config: RunnableConfig,
    icon: str | None = "📦"
) -> str:
    """[SENSITIVE] 냉장고에 다국어 지원 카테고리를 추가합니다.
    
    Args:
        refrigerator_id: 냉장고 ID
        ko_category: 한국어 카테고리 이름
        us_category: 영어 카테고리 이름
        jp_category: 일본어 카테고리 이름
        config: 설정 정보 (user_id 포함)
        icon: 카테고리 아이콘 (선택사항, 기본값: 📦)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    # 다국어 번역 데이터 준비
    data = {
        "type": "system",
        "icon": icon,
        "translations": [
            {"language": "ko", "name": ko_category},
            {"language": "en", "name": us_category},
            {"language": "ja", "name": jp_category}
        ]
    }
    
    make_request(
        method="POST",
        endpoint=f"/api/refrigerators/{refrigerator_id}/categories",
        user_id=user_id,
        data=data
    )
    
    return f"다국어 카테고리가 성공적으로 추가되었습니다. (한국어: {ko_category}, 영어: {us_category}, 일본어: {jp_category})"

@tool
@handle_api_error
def update_refrigerator(refrigerator_id: int, name: str | None = None, description: str | None = None, config: RunnableConfig = None) -> str:
    """[SENSITIVE] 냉장고 정보를 수정합니다.
    
    Args:
        refrigerator_id: 냉장고 ID
        name: 새 냉장고 이름 (선택사항)
        description: 새 냉장고 설명 (선택사항)
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")
    
    # 업데이트할 필드만 추가
    update_data = {}
    if name is not None:
        update_data["name"] = name
    if description is not None:
        update_data["description"] = description
    
    if not update_data:
        return "변경할 정보가 없습니다."
    
    make_request(
        method="PUT",
        endpoint=f"/api/refrigerators/{refrigerator_id}",
        user_id=user_id,
        data=update_data
    )
    
    return f"냉장고 {refrigerator_id}의 정보가 성공적으로 업데이트되었습니다."

@tool
@handle_api_error
def delete_refrigerator(refrigerator_id: int, config: RunnableConfig) -> str:
    """[SENSITIVE] 냉장고를 삭제합니다.
    
    Args:
        refrigerator_id: 삭제할 냉장고 ID
        config: 설정 정보 (user_id 포함)
    """
    configuration = config.get("configurable", {})
    user_id = configuration.get("user_id")
    if not user_id:
        raise ValueError("No user_id configured.")

    make_request(
        method="DELETE",
        endpoint=f"/api/refrigerators/{refrigerator_id}",
        user_id=user_id
    )
    
    return f"냉장고가 성공적으로 삭제되었습니다."

# Safe Tools
safe_tools = [
    get_refrigerators,
    get_refrigerator_state,
    get_members,
    get_refrigerator_categories,
    get_refrigerator_details,
]

# Sensitive Tools
sensitive_tools = [
    create_refrigerator,
    update_refrigerator_state,
    update_category,
    delete_category,
    add_ingredient,
    update_ingredient,
    delete_ingredient,
    share_refrigerator,
    # add_refrigerator_single_category,
    add_refrigerator_multiple_categories,
    delete_refrigerator_category,
    add_refrigerator_single_category_in_multi_language,
    update_refrigerator,
    delete_refrigerator,
] 