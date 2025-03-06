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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/hooks/use-translations';
import { INGREDIENT_UNITS, IIngredient, IRefrigeratorCategory } from '@/types';
import { Pencil } from 'lucide-react';
import { useLanguageStore } from '@/store/language';

const formSchema = z.object({
  name: z.string().min(1, "재료 이름은 필수입니다."),
  categoryId: z.string({
    required_error: "카테고리를 선택해주세요.",
  }),
  quantity: z.string().min(1, "수량은 필수입니다."),
  unit: z.enum(['g', 'kg', 'ml', 'l', '개', '봉', '팩', '병'], {
    required_error: "단위를 선택해주세요.",
  }),
  expiryDate: z.union([
    z.string().datetime(),
    z.string().length(0).transform(() => null),
    z.null(),
  ]).optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditIngredientDialogProps {
  ingredient: IIngredient;
  onSuccess: (result: any) => void;
  refrigeratorId: number;
  categories: IRefrigeratorCategory[];
}

interface IngredientFormData {
  name: string;
  quantity: string;
  unit: string;
  expiryDate?: string | null;
  categoryId: string;
}

export function EditIngredientDialog({
  ingredient,
  onSuccess,
  refrigeratorId,
  categories,
}: EditIngredientDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslations();
  const { currentLanguage } = useLanguageStore();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: ingredient.name,
      categoryId: ingredient.refrigeratorCategoryId.toString(),
      quantity: ingredient.quantity.toString(),
      unit: ingredient.unit as typeof INGREDIENT_UNITS[number]['value'],
      expiryDate: ingredient.expiryDate || '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      console.log('[DEBUG] === 재료 수정 시작 ===');
      console.log('[DEBUG] 현재 재료 정보:', {
        id: ingredient.id,
        name: ingredient.name,
        currentCategoryId: ingredient.refrigeratorCategoryId,
      });
      console.log('[DEBUG] 폼 데이터:', data);

      // 선택된 카테고리 찾기
      const selectedCategory = categories.find(rc => rc.id.toString() === data.categoryId);
      if (!selectedCategory) {
        console.error('[DEBUG] 카테고리를 찾을 수 없음:', { 
          searchingForId: data.categoryId, 
          availableCategories: categories.map(c => ({ 
            rcId: c.id,
            name: c.category.translations[0]?.name 
          }))
        });
        throw new Error('선택된 카테고리를 찾을 수 없습니다.');
      }

      const apiPath = `/api/refrigerators/${refrigeratorId}/categories/${selectedCategory.category.id}/ingredients/${ingredient.id}`;
      console.log('[DEBUG] API 요청 경로:', apiPath);

      // API 호출
      const response = await fetch(
        apiPath,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: data.name,
            quantity: data.quantity,
            unit: data.unit,
            expiryDate: data.expiryDate || null,
            refrigeratorCategoryId: selectedCategory.id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '서버 오류가 발생했습니다.' }));
        console.error('[DEBUG] API 에러:', errorData);
        throw new Error(errorData.error || '서버 오류가 발생했습니다.');
      }

      const result = await response.json();
      console.log('[DEBUG] 재료 수정 성공:', result);

      toast({
        title: "재료 수정 성공",
        description: `${data.name} 재료가 수정되었습니다.`,
      });

      onSuccess(result);
      setOpen(false);
    } catch (error) {
      console.error('[ERROR] 재료 수정 중 오류:', error);
      toast({
        variant: "destructive",
        title: "재료 수정 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{t('refrigerator.editIngredient')}</DialogTitle>
            <DialogDescription>
              {t('refrigerator.editIngredientDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t('refrigerator.ingredientName')}</Label>
              <Input
                id="name"
                placeholder={t('refrigerator.ingredientNamePlaceholder')}
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="categoryId">{t('refrigerator.category')}</Label>
              <select
                id="categoryId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...form.register('categoryId')}
              >
                <option value="">{t('refrigerator.selectCategory')}</option>
                {categories.map((rc) => {
                  const categoryData = rc.category;
                  const translations = categoryData.translations || [];
                  const currentTranslation = translations.find(t => t.language === currentLanguage);
                  const defaultTranslation = translations[0];
                  const translation = currentTranslation || defaultTranslation;
                  
                  const icon = categoryData.icon || '📦';
                  const name = translation?.name || t('refrigerator.categories.others');
                  
                  return (
                    <option key={rc.id} value={rc.id.toString()}>
                      {icon} {name}
                    </option>
                  );
                })}
              </select>
              {form.formState.errors.categoryId && (
                <p className="text-sm text-destructive">{form.formState.errors.categoryId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">{t('refrigerator.quantity')}</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="0.1"
                  {...form.register('quantity', {
                    setValueAs: (value) => value.toString()
                  })}
                />
                {form.formState.errors.quantity && (
                  <p className="text-sm text-destructive">{form.formState.errors.quantity.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="unit">{t('refrigerator.unit')}</Label>
                <select
                  id="unit"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...form.register('unit')}
                >
                  <option value="">{t('refrigerator.selectUnit')}</option>
                  {INGREDIENT_UNITS.map(unit => (
                    <option key={unit.value} value={unit.value}>
                      {t(`refrigerator.units.${unit.value}`)}
                    </option>
                  ))}
                </select>
                {form.formState.errors.unit && (
                  <p className="text-sm text-destructive">{form.formState.errors.unit.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expiryDate">{t('refrigerator.expiryDate')}</Label>
              <Input
                id="expiryDate"
                type="date"
                {...form.register('expiryDate')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
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