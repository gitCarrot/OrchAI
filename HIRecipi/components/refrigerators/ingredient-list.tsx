'use client'

import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { IIngredient, IRefrigeratorCategory } from '@/types'
import { EditIngredientDialog } from './edit-ingredient-dialog'
import { DeleteIngredientDialog } from './delete-ingredient-dialog'
import { useTranslations } from '@/hooks/use-translations'
import { useLanguageStore } from '@/store/language'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface IngredientListProps {
  ingredients: IIngredient[];
  onUpdate: () => void;
  refrigeratorId: number;
  categories: IRefrigeratorCategory[];
}

export function IngredientList({
  ingredients,
  onUpdate,
  refrigeratorId,
  categories,
}: IngredientListProps) {
  const { toast } = useToast()
  const { t } = useTranslations()
  const { currentLanguage } = useLanguageStore()

  if (ingredients.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">{t('refrigerator.noIngredients')}</p>
      </div>
    );
  }

  // 모바일 뷰
  const MobileView = () => (
    <div className="grid grid-cols-1 gap-4">
      {ingredients.map((ingredient) => {
        const category = categories.find(rc => rc.id === ingredient.refrigeratorCategoryId);
        if (!category) return null;

        const translations = category.category.translations || [];
        const currentTranslation = translations.find(t => t.language === currentLanguage);
        const defaultTranslation = translations[0];
        const translation = currentTranslation || defaultTranslation;
        
        const icon = category.category.icon || '📦';
        const name = translation?.name || t('refrigerator.categories.others');

        return (
          <Card key={ingredient.id} className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium truncate">{ingredient.name}</h3>
                    <p className="text-sm text-muted-foreground">{name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <EditIngredientDialog
                      ingredient={ingredient}
                      onSuccess={onUpdate}
                      refrigeratorId={refrigeratorId}
                      categories={categories}
                    />
                    <DeleteIngredientDialog
                      ingredientId={ingredient.id}
                      ingredientName={ingredient.name}
                      refrigeratorId={refrigeratorId}
                      categoryId={category.category.id}
                      onSuccess={onUpdate}
                    />
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('refrigerator.quantity')}: </span>
                    <span>{ingredient.quantity} {t(`refrigerator.units.${ingredient.unit}`)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('refrigerator.expiryDate')}: </span>
                    <span>
                      {ingredient.expiryDate 
                        ? new Date(ingredient.expiryDate).toLocaleDateString()
                        : '-'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );

  // 데스크톱 뷰
  const DesktopView = () => (
    <div className="relative overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4 font-medium text-muted-foreground w-[50px]">
              {t('refrigerator.category')}
            </th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">
              {t('refrigerator.ingredientName')}
            </th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">
              {t('refrigerator.quantity')}
            </th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">
              {t('refrigerator.expiryDate')}
            </th>
            <th className="text-right py-3 px-4 font-medium text-muted-foreground w-[100px]">
              {t('common.actions')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {ingredients.map((ingredient) => {
            const category = categories.find(rc => rc.id === ingredient.refrigeratorCategoryId);
            if (!category) return null;

            const translations = category.category.translations || [];
            const currentTranslation = translations.find(t => t.language === currentLanguage);
            const defaultTranslation = translations[0];
            const translation = currentTranslation || defaultTranslation;
            
            const icon = category.category.icon || '📦';
            const name = translation?.name || t('refrigerator.categories.others');

            return (
              <tr
                key={ingredient.id}
                className="hover:bg-muted/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                    {icon}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium">{ingredient.name}</div>
                  <div className="text-sm text-muted-foreground">{name}</div>
                </td>
                <td className="py-3 px-4">
                  {ingredient.quantity} {t(`refrigerator.units.${ingredient.unit}`)}
                </td>
                <td className="py-3 px-4 text-muted-foreground">
                  {ingredient.expiryDate 
                    ? new Date(ingredient.expiryDate).toLocaleDateString()
                    : '-'
                  }
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <EditIngredientDialog
                      ingredient={ingredient}
                      onSuccess={onUpdate}
                      refrigeratorId={refrigeratorId}
                      categories={categories}
                    />
                    <DeleteIngredientDialog
                      ingredientId={ingredient.id}
                      ingredientName={ingredient.name}
                      refrigeratorId={refrigeratorId}
                      categoryId={category.category.id}
                      onSuccess={onUpdate}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="md:hidden">
        <MobileView />
      </div>
      <div className="hidden md:block">
        <DesktopView />
      </div>
    </div>
  );
} 