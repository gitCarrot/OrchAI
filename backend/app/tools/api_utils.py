from typing import Dict, Any, Optional
import requests
from functools import wraps
import os

NEXT_API_URL = os.getenv('NEXT_API_URL', 'http://frontend:3000')
INTERNAL_API_KEY = os.getenv('INTERNAL_API_KEY')

def get_headers(user_id: str) -> Dict[str, str]:
    """API 요청에 필요한 헤더를 생성합니다."""
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': INTERNAL_API_KEY or '',
        'x-user-id': user_id
    }

def make_request(
    method: str,
    endpoint: str,
    user_id: str,
    data: Optional[Dict[str, Any]] = None,
    params: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """API 요청을 실행하고 결과를 반환합니다."""
    url = f"{NEXT_API_URL}{endpoint}"
    headers = get_headers(user_id)
    
    try:
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            json=data if data else None,
            params=params if params else None
        )
        response.raise_for_status()
        return response.json() if response.content else {}
    except requests.exceptions.RequestException as e:
        error_message = f"API 요청 실패: {str(e)}"
        if hasattr(e.response, 'json'):
            try:
                error_detail = e.response.json()
                error_message = error_detail.get('error', error_message)
            except:
                pass
        raise Exception(error_message)

def handle_api_error(func):
    """API 에러를 처리하는 데코레이터"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            return f"오류 발생: {str(e)}"
    return wrapper 