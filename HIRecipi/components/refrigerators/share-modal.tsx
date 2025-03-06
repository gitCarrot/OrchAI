'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Users } from 'lucide-react';

interface Props {
  refrigeratorId: number;
}

export function ShareModal({ refrigeratorId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'admin'>('viewer');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/refrigerators/${refrigeratorId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '초대장 전송에 실패했습니다.');
      }

      toast({
        title: "초대장이 전송되었습니다",
        description: `${email}로 초대장이 전송되었습니다.`,
      });

      setIsOpen(false);
      setEmail('');
      setRole('viewer');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "오류가 발생했습니다",
        description: error instanceof Error ? error.message : "초대장 전송에 실패했습니다.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Users className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>냉장고 공유하기</DialogTitle>
          <DialogDescription>
            이메일 주소를 입력하고 권한을 선택하여 냉장고를 공유하세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">권한</Label>
            <Select value={role} onValueChange={(value: 'viewer' | 'admin') => setRole(value)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="권한을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">뷰어 (보기만 가능)</SelectItem>
                <SelectItem value="admin">관리자 (수정/삭제 가능)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "전송 중..." : "초대장 보내기"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 