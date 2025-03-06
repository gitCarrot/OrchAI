'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/hooks/use-translations';
import { Trash2 } from 'lucide-react';

interface DeleteIngredientDialogProps {
  ingredientId: number;
  ingredientName: string;
  refrigeratorId: number;
  categoryId: number;
  onSuccess: () => void;
}

export function DeleteIngredientDialog({
  ingredientId,
  ingredientName,
  refrigeratorId,
  categoryId,
  onSuccess,
}: DeleteIngredientDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      console.log('[DEBUG] === 재료 삭제 시작 ===');
      console.log('[DEBUG] 재료 정보:', { ingredientId, ingredientName, categoryId });
      console.log('[DEBUG] API 경로:', `/api/refrigerators/${refrigeratorId}/categories/${categoryId}/ingredients/${ingredientId}`);

      const response = await fetch(
        `/api/refrigerators/${refrigeratorId}/categories/${categoryId}/ingredients/${ingredientId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '서버 오류가 발생했습니다.' }));
        console.error('[DEBUG] API 에러:', errorData);
        throw new Error(errorData.error || '서버 오류가 발생했습니다.');
      }

      toast({
        title: '성공',
        description: `${ingredientName} 재료가 삭제되었습니다.`,
      });

      onSuccess();
      setOpen(false);
    } catch (error) {
      console.error('[DEBUG] 재료 삭제 실패:', error);
      toast({
        variant: "destructive",
        title: '오류',
        description: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('refrigerator.deleteIngredient')}</DialogTitle>
          <DialogDescription>
            {t('refrigerator.deleteIngredientDesc', { name: ingredientName })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isDeleting}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? t('common.deleting') : t('common.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 