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
import { IRefrigeratorCategory } from '@/types';
import { useLanguageStore } from '@/store/language';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const INGREDIENT_UNITS = [
  { value: 'g', label: '그램' },
  { value: 'kg', label: '킬로그램' },
  { value: 'ml', label: '밀리리터' },
  { value: 'l', label: '리터' },
  { value: '개', label: '개' },
  { value: '봉', label: '봉' },
  { value: '팩', label: '팩' },
  { value: '병', label: '병' },
] as const;

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

interface AddIngredientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refrigeratorId: number;
  onSuccess: (data: IngredientFormData) => Promise<void> | void;
  categories: IRefrigeratorCategory[];
}

interface IngredientFormData {
  name: string;
  quantity: string;
  unit: string;
  expiryDate?: string | null;
  categoryId: string;
}

export function AddIngredientDialog({
  open,
  onOpenChange,
  refrigeratorId,
  onSuccess,
  categories,
}: AddIngredientDialogProps) {
  const { toast } = useToast();
  const { t, language } = useTranslations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      categoryId: '',
      quantity: '1',
      unit: 'g',
    },
    mode: 'onChange',
  });

  // 폼 값들을 실시간으로 감시
  const { name, categoryId, quantity, unit } = form.watch();
  const hasErrors = Object.keys(form.formState.errors).length > 0;
  const isFormValid = name && categoryId && quantity && unit;

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      console.log('[DEBUG] === 재료 추가 시작 ===');
      console.log('[DEBUG] 폼 데이터:', data);
      console.log('[DEBUG] 사용 가능한 카테고리:', categories.map(c => ({
        rcId: c.id,
        categoryId: c.category.id,
        name: c.category.translations[0]?.name,
        translations: c.category.translations
      })));

      // 선택된 카테고리 찾기
      const selectedCategory = categories.find(rc => rc.id.toString() === data.categoryId);
      console.log('[DEBUG] 카테고리 검색 조건:', {
        searchingForId: data.categoryId,
        searchingForIdType: typeof data.categoryId,
        firstCategoryId: categories[0]?.id,
        firstCategoryIdType: typeof categories[0]?.id
      });

      if (!selectedCategory) {
        console.error('[DEBUG] 카테고리를 찾을 수 없음:', { 
          categoryId: data.categoryId, 
          availableCategories: categories.map(c => ({ 
            rcId: c.id,
            categoryId: c.category.id,
            name: c.category.translations[0]?.name 
          }))
        });
        throw new Error('선택된 카테고리를 찾을 수 없습니다.');
      }

      await onSuccess(data);
      form.reset();
    } catch (error) {
      console.error('[ERROR] 재료 추가 중 오류:', error);
      toast({
        title: "재료 추가 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryName = (category: IRefrigeratorCategory) => {
    console.log('[DEBUG] AddIngredientDialog - getCategoryName:', {
      category,
      currentLanguage: language
    });

    const categoryData = category.category;
    if (!categoryData || !categoryData.translations) {
      console.log('[DEBUG] AddIngredientDialog - No category data');
      return t('category.unnamed');
    }

    const translations = categoryData.translations;
    console.log('[DEBUG] AddIngredientDialog - Translations:', translations);

    const currentTranslation = translations.find(t => t.language === language);
    console.log('[DEBUG] AddIngredientDialog - Current translation:', currentTranslation);

    const defaultTranslation = translations[0];
    console.log('[DEBUG] AddIngredientDialog - Default translation:', defaultTranslation);

    const name = currentTranslation?.name || defaultTranslation?.name || t('category.unnamed');
    console.log('[DEBUG] AddIngredientDialog - Final name:', name);

    return name;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{t('refrigerator.addIngredient')}</DialogTitle>
            <DialogDescription>
              {t('refrigerator.addIngredientDesc')}
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
              <Select
                value={form.watch('categoryId')}
                onValueChange={(value) => form.setValue('categoryId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('ingredient.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => {
                    console.log('[DEBUG] AddIngredientDialog - Rendering category option:', {
                      categoryId: category.id,
                      categoryData: category.category,
                      translations: category.category.translations,
                      currentLanguage: language
                    });

                    const name = getCategoryName(category);
                    const icon = category.category?.icon || '📦';

                    return (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {icon} {name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {form.formState.errors.categoryId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.categoryId.message}
                </p>
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
              onClick={() => onOpenChange(false)}
              type="button"
            >
              {t('common.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || hasErrors || !isFormValid}
            >
              {isSubmitting ? t('common.adding') : t('common.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 