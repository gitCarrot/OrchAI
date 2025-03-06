"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Invitation {
  id: number;
  refrigeratorId: number;
  refrigeratorName: string;
  invitedBy: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  role: "admin" | "viewer";
}

export function InvitationList() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchInvitations = async () => {
    try {
      const response = await fetch("/api/refrigerators/invitations");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "초대 목록을 불러오는데 실패했습니다.");
      }

      setInvitations(data);
    } catch (error) {
      toast({
        title: "초대 목록 조회 실패",
        description: error instanceof Error ? error.message : "초대 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvitation = async (invitationId: number, accept: boolean) => {
    try {
      const response = await fetch(`/api/refrigerators/invitations/${invitationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accept }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "초대 응답 중 오류가 발생했습니다.");
      }

      toast({
        title: accept ? "초대 수락" : "초대 거절",
        description: accept ? "냉장고 공유 초대를 수락했습니다." : "냉장고 공유 초대를 거절했습니다.",
      });

      // 목록 새로고침
      fetchInvitations();
    } catch (error) {
      toast({
        title: "초대 응답 실패",
        description: error instanceof Error ? error.message : "초대 응답 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  if (isLoading) {
    return <div>초대 목록을 불러오는 중...</div>;
  }

  if (invitations.length === 0) {
    return <div>받은 초대가 없습니다.</div>;
  }

  return (
    <div className="grid gap-4">
      {invitations.map((invitation) => (
        <Card key={invitation.id}>
          <CardHeader>
            <CardTitle>{invitation.refrigeratorName}</CardTitle>
            <CardDescription>
              초대한 사람: {invitation.invitedBy}
              <br />
              초대일: {new Date(invitation.createdAt).toLocaleDateString()}
              <br />
              권한: {invitation.role === "admin" ? "관리자 (읽기/쓰기)" : "뷰어 (읽기 전용)"}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-end gap-2">
            <Button
              onClick={() => handleInvitation(invitation.id, false)}
              variant="outline"
            >
              거절
            </Button>
            <Button
              onClick={() => handleInvitation(invitation.id, true)}
            >
              수락
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
} 