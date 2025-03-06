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
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/hooks/use-translations';

interface Props {
  refrigeratorId: number;
  refrigeratorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteRefrigeratorDialog({ 
  refrigeratorId, 
  refrigeratorName,
  open,
  onOpenChange,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useTranslations();

  async function handleDelete() {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/refrigerators/${refrigeratorId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '냉장고 삭제에 실패했습니다.');
      }

      toast({
        title: t('common.success'),
        description: `${refrigeratorName} 냉장고가 삭제되었습니다.`,
      });

      onOpenChange(false);
      router.push('/refrigerators'); // 목록 페이지로 이동
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error instanceof Error ? error.message : '냉장고 삭제에 실패했습니다.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>냉장고 삭제</DialogTitle>
          <DialogDescription>
            {refrigeratorName} 냉장고를 삭제하시겠습니까?
            <br />
            삭제된 냉장고는 복구할 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isLoading}
          >
            {isLoading ? t('common.deleting') : t('common.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 