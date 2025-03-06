from typing import Dict, Any, List, Optional
from .base import BaseTool

class UserTool(BaseTool):
    # Safe Tools (조회)
    async def get_user_info(self, user_id: str) -> Dict[str, Any]:
        """사용자 정보를 조회합니다."""
        return await self.make_request(f"/users/{user_id}")
    
    async def get_user_by_email(self, email: str) -> Dict[str, Any]:
        """이메일로 사용자를 조회합니다."""
        return await self.make_request("/users/by-email", params={"email": email})
    
    async def get_user_recipes(self, user_id: str) -> Dict[str, Any]:
        """사용자의 레시피 목록을 조회합니다."""
        return await self.make_request("/recipes", params={"userId": user_id})
    
    async def get_user_refrigerators(self, user_id: str) -> Dict[str, Any]:
        """사용자의 냉장고 목록을 조회합니다."""
        return await self.make_request("/refrigerators", params={"userId": user_id})
    
    async def get_received_invitations(self, user_id: str) -> Dict[str, Any]:
        """받은 초대 목록을 조회합니다."""
        return await self.make_request("/refrigerators/invitations", params={"userId": user_id})
    
    async def get_sent_invitations(self, user_id: str) -> Dict[str, Any]:
        """보낸 초대 목록을 조회합니다."""
        return await self.make_request("/refrigerators/invitations/sent", params={"userId": user_id})
    
    # Sensitive Tools (수정)
    async def update_user_profile(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """사용자 프로필을 수정합니다."""
        return await self.make_request(f"/users/{user_id}", method="PUT", data=data)
    
    async def send_invitation(self, refrigerator_id: str, email: str) -> Dict[str, Any]:
        """냉장고 초대를 보냅니다."""
        return await self.make_request(
            f"/refrigerators/{refrigerator_id}/invitations", 
            method="POST", 
            data={"email": email}
        )
    
    async def accept_invitation(self, invitation_id: str) -> Dict[str, Any]:
        """냉장고 초대를 수락합니다."""
        return await self.make_request(
            f"/refrigerators/invitations/{invitation_id}/accept", 
            method="POST"
        )
    
    async def reject_invitation(self, invitation_id: str) -> Dict[str, Any]:
        """냉장고 초대를 거절합니다."""
        return await self.make_request(
            f"/refrigerators/invitations/{invitation_id}/reject", 
            method="POST"
        ) 