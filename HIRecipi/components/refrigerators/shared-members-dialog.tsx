'use client'

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import { ISharedMember } from '@/types';
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "@/hooks/use-translations";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refrigeratorId: number;
  onUpdate?: () => void;
  isOwner: boolean;
}

export function SharedMembersDialog({ 
  open,
  onOpenChange,
  refrigeratorId, 
  onUpdate,
  isOwner 
}: Props) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<ISharedMember[]>([]);
  const { getToken } = useAuth();
  const { t } = useTranslations();

  // 멤버 목록 로드
  const loadMembers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/refrigerators/${refrigeratorId}/members`);
      if (!response.ok) {
        throw new Error(t('refrigerator.members.loadError'));
      }
      const data = await response.json();
      setMembers(data);
    } catch (error) {
      console.error('멤버 로드 오류:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('refrigerator.members.loadError'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 다이얼로그가 열릴 때 멤버 목록 로드
  useEffect(() => {
    if (open) {
      loadMembers();
    }
  }, [open, refrigeratorId]);

  const getRoleDisplay = (role: string) => {
    const roleLower = role.toLowerCase();
    switch (roleLower) {
      case 'owner':
        return {
          text: t('refrigerator.roles.owner'),
          className: 'bg-purple-100 text-purple-800',
          icon: <ShieldAlert className="h-4 w-4 text-purple-800" />
        };
      case 'admin':
        return {
          text: t('refrigerator.roles.admin'),
          className: 'bg-blue-100 text-blue-800',
          icon: <ShieldCheck className="h-4 w-4 text-blue-800" />
        };
      case 'viewer':
        return {
          text: t('refrigerator.roles.viewer'),
          className: 'bg-gray-100 text-gray-800',
          icon: <Shield className="h-4 w-4 text-gray-800" />
        };
      default:
        return {
          text: roleLower,
          className: 'bg-gray-100 text-gray-800',
          icon: <Shield className="h-4 w-4 text-gray-800" />
        };
    }
  };

  // 권한 변경 핸들러
  const handleRoleChange = async (member: ISharedMember, newRole: string) => {
    try {
      console.log('handleRoleChange 호출됨:', { member, newRole });
      
      if (!member?.id || !refrigeratorId) {
        console.error('필수 정보 누락:', { member, refrigeratorId });
        throw new Error(t('common.error'));
      }

      setIsUpdating(true);
      const token = await getToken();
      
      const response = await fetch(`/api/refrigerators/${refrigeratorId}/members/${member.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('refrigerator.members.updateError'));
      }

      toast({
        title: t('common.success'),
        description: t('refrigerator.members.updateSuccess'),
      });

      // 멤버 목록 다시 로드
      loadMembers();
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('권한 변경 상세 오류:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('refrigerator.members.updateError'),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveMember = async (member: ISharedMember) => {
    try {
      console.log('handleRemoveMember 호출됨:', { member });
      
      if (!member?.id || !refrigeratorId) {
        console.error('필수 정보 누락:', { member, refrigeratorId });
        throw new Error(t('common.error'));
      }

      setIsUpdating(true);
      const token = await getToken();

      const response = await fetch(`/api/refrigerators/${refrigeratorId}/members/${member.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('refrigerator.members.removeError'));
      }

      toast({
        title: t('common.success'),
        description: t('refrigerator.members.removeSuccess'),
      });

      // 멤버 목록 다시 로드
      loadMembers();
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("멤버 삭제 상세 오류:", error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('refrigerator.members.removeError'),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // 멤버를 소유자가 맨 위로 오도록 정렬
  const sortedMembers = [...members].sort((a, b) => {
    if (a.role.toLowerCase() === 'owner') return -1;
    if (b.role.toLowerCase() === 'owner') return 1;
    if (a.role.toLowerCase() === 'admin' && b.role.toLowerCase() === 'viewer') return -1;
    if (a.role.toLowerCase() === 'viewer' && b.role.toLowerCase() === 'admin') return 1;
    return 0;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-3">
          <DialogTitle>{t('refrigerator.members.title')}</DialogTitle>
          <DialogDescription>
            {t('refrigerator.members.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">
                {t('common.loading')}
              </p>
            </div>
          ) : sortedMembers.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">
                {t('refrigerator.members.noMembers')}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {sortedMembers.map((member) => {
                const roleInfo = getRoleDisplay(member.role);
                const isOwnerRole = member.role.toLowerCase() === 'owner';
                
                return (
                  <div
                    key={`${member.id}-${member.role}`}
                    className="flex items-center justify-between p-4 rounded-lg bg-card hover:bg-accent/5 border border-border/50 hover:border-border transition-all duration-200"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <Avatar className="h-10 w-10 flex-shrink-0 border-2 border-primary/10">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {member.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium text-card-foreground truncate">
                          {member.email}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          {roleInfo.icon}
                          <span className={`text-sm px-2 py-0.5 rounded-full ${roleInfo.className}`}>
                            {roleInfo.text}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isOwner && !isOwnerRole && (
                      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                        <Select
                          value={member.role.toLowerCase()}
                          onValueChange={(value) => handleRoleChange(member, value)}
                          disabled={isUpdating || member.role.toLowerCase() === 'owner'}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">{t('refrigerator.roles.admin')}</SelectItem>
                            <SelectItem value="viewer">{t('refrigerator.roles.viewer')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member)}
                          disabled={isUpdating || member.role.toLowerCase() === 'owner'}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 