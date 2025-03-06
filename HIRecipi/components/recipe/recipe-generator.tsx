'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/hooks/use-translations';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface GeneratedRecipe {
  title: string;
  content: string;
}

export function RecipeGenerator() {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useTranslations();

  const handleGenerateRecipe = async () => {
    if (!content.trim()) {
      toast({
        title: t('recipe.generator.error'),
        description: t('recipe.generator.errorDesc'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      console.log('Sending request to:', `${BACKEND_URL}/api/recipe/generate`);
      console.log('Request payload:', { content });

      // 1. 백엔드 레시피 생성 API 호출
      const response = await fetch(`${BACKEND_URL}/api/recipe/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (!response.ok) {
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.error || t('recipe.generator.errorDesc'));
        } catch (e) {
          throw new Error(`${t('recipe.generator.errorDesc')} (${response.status}): ${responseText}`);
        }
      }

      const generatedRecipe: GeneratedRecipe = JSON.parse(responseText);

      // 2. Next.js API를 통해 새 레시피 생성
      console.log('Creating new recipe with data:', {
        title: generatedRecipe.title,
        content: generatedRecipe.content,
        type: "custom",
        isPublic: true,
      });

      const createResponse = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: generatedRecipe.title,
          content: generatedRecipe.content,
          type: "custom",
          isPublic: true,
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || t('recipe.generator.errorDesc'));
      }

      const newRecipe = await createResponse.json();

      toast({
        title: t('recipe.generator.success'),
        description: t('recipe.generator.successDesc'),
      });

      // 입력 필드 초기화
      setContent('');
      
      // 새로 생성된 레시피 페이지로 이동
      router.push(`/recipes/${newRecipe.id}`);
    } catch (error) {
      console.error('Error generating recipe:', error);
      toast({
        title: t('recipe.generator.error'),
        description: error instanceof Error ? error.message : t('recipe.generator.errorDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full bg-muted/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          {t('recipe.generator.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder={t('recipe.generator.placeholder')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="resize-none bg-background"
          disabled={isLoading}
        />
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          onClick={handleGenerateRecipe}
          disabled={isLoading || !content.trim()}
          variant="default"
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('recipe.generator.loading')}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {t('recipe.generator.button')}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 