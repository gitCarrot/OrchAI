'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/hooks/use-translations';

interface EditRefrigeratorDialogProps {
  refrigeratorId: number;
  initialName: string;
  initialDescription: string;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditRefrigeratorDialog({
  refrigeratorId,
  initialName,
  initialDescription,
  onSuccess,
  open,
  onOpenChange,
}: EditRefrigeratorDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formSchema = z.object({
    name: z.string().min(1, '냉장고 이름을 입력해주세요.'),
    description: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialName,
      description: initialDescription,
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/refrigerators/${refrigeratorId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '냉장고 수정에 실패했습니다.');
      }

      toast({
        title: t('common.success'),
        description: '냉장고가 성공적으로 수정되었습니다.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error instanceof Error ? error.message : '냉장고 수정에 실패했습니다.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>냉장고 수정</DialogTitle>
            <DialogDescription>
              냉장고 정보를 수정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">냉장고 이름</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="냉장고 이름을 입력하세요"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">설명</Label>
              <Input
                id="description"
                {...form.register('description')}
                placeholder="냉장고에 대한 설명을 입력하세요"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              type="button"
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 