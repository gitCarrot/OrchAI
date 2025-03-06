from typing import Dict, Any, Optional
import aiohttp
from functools import wraps
import json
import os

class BaseTool:
    """기본 도구 클래스. HTTP 요청 메서드를 제공합니다."""
    
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url.rstrip('/')
        self.session = None
        self.default_headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-api-key': os.getenv('INTERNAL_API_KEY', ''),
        }
    
    async def _ensure_session(self):
        """aiohttp 세션이 없으면 생성합니다."""
        if self.session is None:
            self.session = aiohttp.ClientSession(headers=self.default_headers)
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Any:
        """HTTP 요청을 보냅니다."""
        await self._ensure_session()
        
        # endpoint가 /api로 시작하지 않으면 추가
        if not endpoint.startswith('/api'):
            endpoint = f'/api{endpoint}'
            
        url = f"{self.base_url}{endpoint}"
        
        # 기본 헤더와 사용자 지정 헤더 병합
        request_headers = {**self.default_headers}
        if headers:
            request_headers.update(headers)
            
        try:
            async with self.session.request(
                method, 
                url, 
                json=data, 
                params=params,
                headers=request_headers
            ) as response:
                try:
                    response_data = await response.json()
                except json.JSONDecodeError:
                    response_data = await response.text()
                    return {"error": "Invalid JSON response", "data": response_data}
                
                if not response.ok:
                    error_msg = response_data.get('error', 'Unknown error occurred')
                    if response.status == 401:
                        raise aiohttp.ClientResponseError(
                            request_info=response.request_info,
                            history=response.history,
                            status=response.status,
                            message="Authentication required"
                        )
                    elif response.status == 403:
                        raise aiohttp.ClientResponseError(
                            request_info=response.request_info,
                            history=response.history,
                            status=response.status,
                            message="Permission denied"
                        )
                    raise aiohttp.ClientResponseError(
                        request_info=response.request_info,
                        history=response.history,
                        status=response.status,
                        message=error_msg
                    )
                    
                return response_data
        except aiohttp.ClientError as e:
            # 네트워크 관련 에러 처리
            error_msg = str(e)
            if "Connection refused" in error_msg:
                raise Exception("Cannot connect to the server. Please check if the server is running.")
            raise Exception(f"API request failed: {error_msg}")
        except Exception as e:
            # 기타 예외 처리
            raise Exception(f"Unexpected error: {str(e)}")
    
    async def _get(
        self, 
        endpoint: str, 
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Any:
        """GET 요청을 보냅니다."""
        return await self._request("GET", endpoint, params=params, headers=headers)
    
    async def _post(
        self, 
        endpoint: str, 
        data: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None
    ) -> Any:
        """POST 요청을 보냅니다."""
        return await self._request("POST", endpoint, data=data, headers=headers)
    
    async def _put(
        self, 
        endpoint: str, 
        data: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None
    ) -> Any:
        """PUT 요청을 보냅니다."""
        return await self._request("PUT", endpoint, data=data, headers=headers)
    
    async def _delete(
        self, 
        endpoint: str,
        headers: Optional[Dict[str, str]] = None
    ) -> Any:
        """DELETE 요청을 보냅니다."""
        return await self._request("DELETE", endpoint, headers=headers)
    
    async def close(self):
        """세션을 닫습니다."""
        if self.session:
            await self.session.close()
            self.session = None

    async def set_auth_token(self, token: str):
        """인증 토큰을 설정합니다."""
        self.default_headers["Authorization"] = f"Bearer {token}"
        # 기존 세션이 있다면 닫고 새로 생성
        await self.close() 