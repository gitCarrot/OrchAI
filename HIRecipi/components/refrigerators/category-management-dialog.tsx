'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from '@/hooks/use-translations';
import { IRefrigeratorCategory } from '@/types';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/store/language';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refrigeratorId: number;
  onSuccess: () => void;
  categories: IRefrigeratorCategory[];
}

interface Translation {
  language: 'ko' | 'en' | 'ja';
  name: string;
}

interface EditingCategory {
  id: number;
  type: 'system' | 'custom';
  icon: string;
  translations: Translation[];
  name?: string;
}

interface NewCategory {
  type: 'system' | 'custom';
  icon: string;
  name: string;
  translations: Translation[];
}

interface CategoryData {
  id: number;
  type: 'system' | 'custom';
  icon: string;
  translations?: Translation[];
}

const LANGUAGES = ['ko', 'en', 'ja'] as const;

// 번역 키 타입 정의
const TRANSLATION_KEYS = {
  'common.deleteConfirm': '삭제하시겠습니까?',
  'common.language.ko': '한국어',
  'common.language.en': '영어',
  'common.language.ja': '일본어',
  'category.systemCategories': '시스템 카테고리',
  'category.customCategories': '사용자 카테고리',
  'category.noSystemCategories': '시스템 카테고리가 없습니다.',
  'category.noCustomCategories': '사용자 카테고리가 없습니다.',
  'category.unnamed': '이름 없음',
  'category.icon': '아이콘',
  'category.name': '이름',
  'category.namePlaceholder': '카테고리 이름을 입력하세요',
  'category.manage': '카테고리 관리',
  'category.manageDescription': '카테고리를 관리합니다.',
  'category.newSystem': '새 시스템 카테고리',
  'category.newCustom': '새 일반 카테고리',
  'category.translationRequired': '최소 하나의 이름이 필요합니다.',
  'category.createSuccess': '카테고리가 생성되었습니다.',
  'category.createError': '카테고리 생성에 실패했습니다.',
  'category.updateSuccess': '카테고리가 수정되었습니다.',
  'category.updateError': '카테고리 수정에 실패했습니다.',
  'category.deleteSuccess': '카테고리가 삭제되었습니다.',
  'category.deleteError': '카테고리 삭제에 실패했습니다.',
  'category.systemDeleteError': '시스템 카테고리는 삭제할 수 없습니다.',
  'common.optional': '선택사항',
  'common.success': '성공',
  'common.error': '오류',
  'common.cancel': '취소',
  'common.save': '저장',
  'common.saving': '저장 중...',
  'common.create': '생성',
  'common.creating': '생성 중...',
  'common.deleting': '삭제 중...',
} as const;

type TranslationKey = keyof typeof TRANSLATION_KEYS;

export function CategoryManagementDialog({
  open,
  onOpenChange,
  refrigeratorId,
  onSuccess,
  categories
}: Props) {
  const { toast } = useToast();
  const { t } = useTranslations();
  const { currentLanguage } = useLanguageStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EditingCategory | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'system' | 'custom'>('custom');
  const [newCategory, setNewCategory] = useState<NewCategory>({
    type: 'custom',
    icon: '📦',
    name: '',
    translations: []
  });

  // 카테고리 타입 확인 함수
  const getCategoryType = (category: IRefrigeratorCategory): 'system' | 'custom' => {
    const categoryData = (category.category || category) as CategoryData;
    return categoryData.type === 'system' ? 'system' : 'custom';
  };

  // 시스템 카테고리 필터링
  const systemCategories = categories.filter(c => getCategoryType(c) === 'system');
  // 일반 카테고리 필터링
  const customCategories = categories.filter(c => getCategoryType(c) === 'custom');

  const handleEdit = (category: IRefrigeratorCategory) => {
    const categoryData = (category.category || category) as CategoryData;
    const type = getCategoryType(category);
    
    if (type === 'system') {
      const translations = categoryData.translations?.map(t => ({
        language: t.language,
        name: t.name
      })) || [];

      // 번역이 없는 언어에 대해 빈 번역 추가
      LANGUAGES.forEach(lang => {
        if (!translations.find(t => t.language === lang)) {
          translations.push({ language: lang, name: '' });
        }
      });

      setEditingCategory({
        id: categoryData.id,
        type,
        icon: categoryData.icon || '📦',
        translations
      });
    } else {
      // 일반 카테고리의 경우
      const translation = categoryData.translations?.find(t => t.language === currentLanguage) ||
                        categoryData.translations?.[0];
      
      setEditingCategory({
        id: categoryData.id,
        type,
        icon: categoryData.icon || '📦',
        translations: [],
        name: translation?.name || ''
      });
    }
    setIsEditing(true);
  };

  const handleDelete = async (categoryId: number) => {
    const category = categories.find(c => {
      const categoryData = c.category || c;
      return categoryData.id === categoryId;
    });
    if (!category) return;

    const categoryData = category.category || category;
    if (categoryData.type === 'system') {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('category.systemDeleteError')
      });
      return;
    }

    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/refrigerators/${refrigeratorId}/categories/${categoryData.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('category.deleteError'));
      }

      toast({
        title: t('common.success'),
        description: t('category.deleteSuccess')
      });
      onSuccess();
    } catch (error) {
      console.error('카테고리 삭제 실패:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('category.deleteError')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingCategory) return;

    setIsLoading(true);
    try {
      const requestBody = {
        icon: editingCategory.icon,
        translations: editingCategory.type === 'system'
          ? editingCategory.translations.filter(t => t.name.trim() !== '')
          : [{ language: currentLanguage, name: editingCategory.name || '' }]
      };

      if (requestBody.translations.length === 0) {
        throw new Error(t('category.translationRequired'));
      }

      const response = await fetch(`/api/refrigerators/${refrigeratorId}/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('category.updateError'));
      }

      toast({
        title: t('common.success'),
        description: t('category.updateSuccess')
      });
      setIsEditing(false);
      setEditingCategory(null);
      onSuccess();
    } catch (error) {
      console.error('카테고리 수정 실패:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('category.updateError')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const requestBody = {
        type: selectedTab,
        icon: newCategory.icon,
        translations: selectedTab === 'system'
          ? newCategory.translations.filter(t => t.name.trim() !== '')
          : [{ language: currentLanguage, name: newCategory.name }]
      };

      if (requestBody.translations.length === 0) {
        throw new Error(t('category.translationRequired'));
      }

      const response = await fetch(`/api/refrigerators/${refrigeratorId}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('category.createError'));
      }

      toast({
        title: t('common.success'),
        description: t('category.createSuccess')
      });
      setIsAdding(false);
      setNewCategory({
        type: selectedTab,
        icon: '📦',
        name: '',
        translations: []
      });
      onSuccess();
    } catch (error) {
      console.error('카테고리 생성 실패:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('category.createError')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartAdd = (type: 'system' | 'custom') => {
    setNewCategory({
      type,
      icon: '📦',
      name: '',
      translations: type === 'system' ? LANGUAGES.map(lang => ({ language: lang, name: '' })) : []
    });
    setIsAdding(true);
  };

  const renderCategoryForm = (category: NewCategory | EditingCategory, onChange: (field: string, value: any) => void) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="icon">{t('category.icon')}</Label>
        <Input
          id="icon"
          value={category.icon}
          onChange={(e) => onChange('icon', e.target.value)}
          placeholder="🥕"
        />
      </div>

      {category.type === 'system' ? (
        // 시스템 카테고리 폼
        category.translations.map((translation, index) => (
          <div key={translation.language} className="space-y-2">
            <Label>
              {t(`common.language.${translation.language}`)}
              {index > 0 && <span className="text-sm text-muted-foreground ml-2">({t('common.optional')})</span>}
            </Label>
            <Input
              value={translation.name}
              onChange={(e) => {
                const newTranslations = [...category.translations];
                newTranslations[index] = { ...translation, name: e.target.value };
                onChange('translations', newTranslations);
              }}
              placeholder={t('category.namePlaceholder')}
            />
          </div>
        ))
      ) : (
        // 일반 카테고리 폼
        <div className="space-y-2">
          <Label>{t('category.name')}</Label>
          <Input
            value={category.name || ''}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder={t('category.namePlaceholder')}
          />
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('category.manage')}</DialogTitle>
          <DialogDescription>
            {t('category.manageDescription')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'system' | 'custom')}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="system">{t('category.systemCategory')}</TabsTrigger>
            <TabsTrigger value="custom">{t('category.customCategory')}</TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="mt-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('category.systemCategory')}</h3>
              {!isEditing && !isAdding && (
                <Button onClick={() => handleStartAdd('system')} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('category.new')}
                </Button>
              )}
            </div>
            {systemCategories.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  {t('category.noSystemCategories')}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {systemCategories.map((category) => {
                  const categoryData = category.category || category;
                  const translation = categoryData.translations?.find(t => t.language === currentLanguage) || categoryData.translations?.[0];
                  return (
                    <div 
                      key={category.id} 
                      className="flex items-center justify-between p-4 rounded-lg bg-card hover:bg-accent/5 border border-border/50 hover:border-border transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{categoryData.icon || '📦'}</span>
                        <span className="font-medium">{translation?.name || t('category.unnamed')}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        {t('common.edit')}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="mt-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('category.customCategory')}</h3>
              {!isEditing && !isAdding && (
                <Button onClick={() => handleStartAdd('custom')} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('category.new')}
                </Button>
              )}
            </div>
            {customCategories.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  {t('category.noCustomCategories')}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {customCategories.map((category) => {
                  const categoryData = category.category || category;
                  const translation = categoryData.translations?.find(t => t.language === currentLanguage) || categoryData.translations?.[0];
                  return (
                    <div 
                      key={categoryData.id} 
                      className="flex items-center justify-between p-4 rounded-lg bg-card hover:bg-accent/5 border border-border/50 hover:border-border transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{categoryData.icon || '📦'}</span>
                        <span className="font-medium">{translation?.name || t('category.unnamed')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {t('common.edit')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(categoryData.id)} disabled={isLoading}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          {isLoading ? t('common.deleting') : t('common.delete')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {(isEditing || isAdding) && (
          <div className="mt-6 space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">
              {isEditing ? t('common.edit') : t('category.new')}
            </h3>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>{t('category.icon')}</Label>
                <Input
                  value={isEditing ? editingCategory?.icon : newCategory.icon}
                  onChange={(e) => {
                    if (isEditing && editingCategory) {
                      setEditingCategory({ ...editingCategory, icon: e.target.value });
                    } else {
                      setNewCategory({ ...newCategory, icon: e.target.value });
                    }
                  }}
                  placeholder="📦"
                  className="max-w-[120px]"
                />
              </div>

              {(isEditing && editingCategory?.type === 'system' || (!isEditing && selectedTab === 'system')) ? (
                <div className="space-y-4">
                  {LANGUAGES.map((lang) => (
                    <div key={lang} className="grid gap-2">
                      <Label className="flex items-center gap-2">
                        {t(`common.language.${lang}`)}
                        {lang !== currentLanguage && (
                          <span className="text-sm text-muted-foreground">({t('common.optional')})</span>
                        )}
                      </Label>
                      <Input
                        value={
                          isEditing
                            ? editingCategory?.translations.find((t) => t.language === lang)?.name || ''
                            : newCategory.translations.find((t) => t.language === lang)?.name || ''
                        }
                        onChange={(e) => {
                          if (isEditing && editingCategory) {
                            const newTranslations = [...editingCategory.translations];
                            const index = newTranslations.findIndex((t) => t.language === lang);
                            if (index >= 0) {
                              newTranslations[index] = { ...newTranslations[index], name: e.target.value };
                            } else {
                              newTranslations.push({ language: lang, name: e.target.value });
                            }
                            setEditingCategory({ ...editingCategory, translations: newTranslations });
                          } else {
                            const newTranslations = [...newCategory.translations];
                            const index = newTranslations.findIndex((t) => t.language === lang);
                            if (index >= 0) {
                              newTranslations[index] = { ...newTranslations[index], name: e.target.value };
                            } else {
                              newTranslations.push({ language: lang, name: e.target.value });
                            }
                            setNewCategory({ ...newCategory, translations: newTranslations });
                          }
                        }}
                        placeholder={t('category.namePlaceholder')}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>{t('category.name')}</Label>
                  <Input
                    value={isEditing ? editingCategory?.name : newCategory.name}
                    onChange={(e) => {
                      if (isEditing && editingCategory) {
                        setEditingCategory({ ...editingCategory, name: e.target.value });
                      } else {
                        setNewCategory({ ...newCategory, name: e.target.value });
                      }
                    }}
                    placeholder={t('category.namePlaceholder')}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setIsAdding(false);
                  setEditingCategory(null);
                  setNewCategory({
                    type: selectedTab,
                    icon: '📦',
                    name: '',
                    translations: []
                  });
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={isEditing ? handleUpdate : handleCreate}
                disabled={isLoading}
              >
                {isLoading ? (
                  isEditing ? t('common.saving') : t('common.creating')
                ) : (
                  isEditing ? t('common.save') : t('common.create')
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 