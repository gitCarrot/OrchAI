"use client";

import { useState, useEffect } from "react";
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
import { useAuth } from "@clerk/nextjs";

interface SentInvitation {
  id: number;
  refrigeratorId: number;
  refrigeratorName: string;
  invitedEmail: string;
  status: "pending" | "accepted" | "rejected";
  role: "admin" | "viewer";
  createdAt: string;
}

export function SentInvitations() {
  const [invitations, setInvitations] = useState<SentInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { isLoaded, isSignedIn } = useAuth();

  const fetchInvitations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/refrigerators/invitations/sent");
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

  const handleCancelInvitation = async (invitationId: number) => {
    try {
      const response = await fetch(`/api/refrigerators/invitations/${invitationId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "초대 취소 중 오류가 발생했습니다.");
      }

      toast({
        title: "초대 취소 성공",
        description: "초대가 취소되었습니다.",
      });

      // 목록 새로고침
      fetchInvitations();
    } catch (error) {
      toast({
        title: "초대 취소 실패",
        description: error instanceof Error ? error.message : "초대 취소 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // 인증이 완료된 상태에서만 초대 목록을 가져옴
    if (isLoaded && isSignedIn) {
      fetchInvitations();
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  if (isLoading) {
    return <div>보낸 초대 목록을 불러오는 중...</div>;
  }

  if (invitations.length === 0) {
    return <div>보낸 초대가 없습니다.</div>;
  }

  return (
    <div className="grid gap-4">
      {invitations.map((invitation) => (
        <Card key={invitation.id}>
          <CardHeader>
            <CardTitle>{invitation.refrigeratorName}</CardTitle>
            <CardDescription>
              초대된 이메일: {invitation.invitedEmail}
              <br />
              권한: {invitation.role === "admin" ? "관리자" : "뷰어"}
              <br />
              초대일: {new Date(invitation.createdAt).toLocaleDateString()}
              <br />
              상태: {
                invitation.status === "pending" ? "대기 중" :
                invitation.status === "accepted" ? "수락됨" :
                "거절됨"
              }
            </CardDescription>
          </CardHeader>
          {invitation.status === "pending" && (
            <CardFooter>
              <Button
                onClick={() => handleCancelInvitation(invitation.id)}
                variant="destructive"
              >
                초대 취소
              </Button>
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  );
} 