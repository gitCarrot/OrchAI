'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRecipeStore } from '@/store/recipe';
import { Loader2, FileText, Languages, Check, X } from 'lucide-react';
import { BACKEND_URL, SUPPORTED_LANGUAGES } from '@/lib/constants';
import { useLanguageStore } from '@/store/language';
import { useTranslations } from '@/hooks/use-translations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

interface FormatRecipeButtonProps {
  recipeId: number;
  recipeContent: string;
  recipeTitle: string;
  onUpdate: (data: { title?: string; content: string; isPreview?: boolean }) => void;
}

interface TranslatedRecipe {
  title: string;
  content: string;
}

export function FormatRecipeButton({ recipeId, recipeContent, recipeTitle, onUpdate }: FormatRecipeButtonProps) {
  const { toast } = useToast();
  const { t } = useTranslations();
  const { currentLanguage } = useLanguageStore();
  const [mode, setMode] = useState<'idle' | 'translating' | 'formatting' | 'preview'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<string>(currentLanguage);
  const [translatedPreview, setTranslatedPreview] = useState<TranslatedRecipe | null>(null);
  const [originalRecipe, setOriginalRecipe] = useState<TranslatedRecipe | null>(null);
  const {
    formattedRecipe,
    isFormatting,
    showFormatOptions,
    setFormattedRecipe,
    setIsFormatting,
    setShowFormatOptions,
  } = useRecipeStore();

  // 작업 취소 및 상태 초기화
  const resetUIState = () => {
    setMode('idle');
    setIsLoading(false);
    setTranslatedPreview(null);
    setOriginalRecipe(null);
    
    // 원본 내용으로 복구
    if (originalRecipe) {
      onUpdate({
        title: originalRecipe.title,
        content: originalRecipe.content,
        isPreview: false
      });
    }
  };

  // 포맷팅 시작
  const formatRecipe = async () => {
    try {
      setMode('formatting');
      setIsLoading(true);
      
      // 원본 저장
      setOriginalRecipe({
        title: recipeTitle,
        content: recipeContent
      });
      
      const response = await fetch(`${BACKEND_URL}/api/recipe/format`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe: recipeContent }),
      });

      if (!response.ok) {
        throw new Error(t('recipe.formatError'));
      }

      const data = await response.json();
      
      setTranslatedPreview({
        title: recipeTitle,
        content: data.formatted_recipe
      });

      onUpdate({
        content: data.formatted_recipe,
        isPreview: true
      });
      
      setMode('preview');
    } catch (error) {
      console.error('Formatting error:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('recipe.formatError'),
      });
      resetUIState();
    } finally {
      setIsLoading(false);
    }
  };

  // 번역 시작
  const translateRecipe = async () => {
    try {
      setMode('translating');
      setIsLoading(true);
      
      // 원본 저장
      setOriginalRecipe({
        title: recipeTitle,
        content: recipeContent
      });
      
      const response = await fetch(`${BACKEND_URL}/api/recipe/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          recipe: recipeContent,
          title: recipeTitle,
          target_language: targetLanguage 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('recipe.translateError'));
      }

      const data = await response.json();
      
      const translatedData = {
        title: data.translated_title || recipeTitle,
        content: data.translated_recipe
      };
      
      setTranslatedPreview(translatedData);
      onUpdate({
        title: translatedData.title,
        content: translatedData.content,
        isPreview: true
      });
      
      setMode('preview');
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('recipe.translateError'),
      });
      resetUIState();
    } finally {
      setIsLoading(false);
    }
  };

  // 변경사항 적용
  const applyChanges = async () => {
    if (!translatedPreview) return;
    
    try {
      setIsLoading(true);
      
      const updateData = {
        translations: [{
          language: mode === 'translating' ? targetLanguage as 'ko' | 'en' | 'ja' : currentLanguage,
          title: mode === 'translating' ? translatedPreview.title : recipeTitle,
          content: translatedPreview.content,
          description: ""
        }],
        isPublic: true,
        tags: []
      };

      const updateResponse = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || t('recipe.updateError'));
      }

      // 서버에서 최신 데이터를 가져와서 UI 업데이트
      const refreshResponse = await fetch(`/api/recipes/${recipeId}?language=${targetLanguage}`);
      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh recipe data');
      }

      const refreshedData = await refreshResponse.json();
      onUpdate({
        title: refreshedData.translation?.title || translatedPreview.title,
        content: refreshedData.translation?.content || translatedPreview.content,
        isPreview: false
      });
      
      toast({
        title: t(mode === 'translating' ? 'recipe.translateSuccess' : 'recipe.formatSuccess'),
        description: t(mode === 'translating' ? 'recipe.translateSuccessDesc' : 'recipe.formatSuccessDesc'),
      });
      
      resetUIState();
    } catch (error) {
      console.error('Update error:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('recipe.updateError'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* 기본 모드 - 포맷팅/번역 버튼 */}
      {mode === 'idle' && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={formatRecipe}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading && mode === 'formatting' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {isLoading && mode === 'formatting' ? '포맷팅 중...' : '포맷팅'}
          </Button>

          <div className="flex items-center gap-2">
            <Select
              value={targetLanguage}
              onValueChange={setTargetLanguage}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[100px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, langInfo]) => (
                  <SelectItem key={code} value={code}>
                    {langInfo.name} {langInfo.flag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={translateRecipe}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading && mode === 'translating' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Languages className="h-4 w-4" />
              )}
              {isLoading && mode === 'translating' ? '번역 중...' : '번역'}
            </Button>
          </div>
        </>
      )}

      {/* 미리보기 모드 - 변경사항 적용/취소 */}
      {mode === 'preview' && (
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            {translatedPreview?.title !== recipeTitle ? '번역' : '포맷팅'} 미리보기
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetUIState}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              취소
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={applyChanges}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              적용
            </Button>
          </div>
        </div>
      )}

      {/* 로딩 상태 표시 */}
      {isLoading && !mode.includes('preview') && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {mode === 'formatting' ? '포맷팅 중...' : '번역 중...'}
        </div>
      )}
    </div>
  );
} 