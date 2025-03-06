'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface GeneratedRecipe {
  title: string;
  content: string;
}

interface GenerateRecipeButtonProps {
  recipeContent: string;
}

export function GenerateRecipeButton({ recipeContent }: GenerateRecipeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleGenerateRecipe = async () => {
    try {
      setIsLoading(true);
      console.log('Sending request to:', `${BACKEND_URL}/api/recipe/generate`);
      console.log('Request payload:', { content: recipeContent });

      // 1. 백엔드 레시피 생성 API 호출
      const response = await fetch(`${BACKEND_URL}/api/recipe/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ content: recipeContent }),
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (!response.ok) {
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.error || '레시피 생성에 실패했습니다.');
        } catch (e) {
          throw new Error(`레시피 생성 실패 (${response.status}): ${responseText}`);
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
        throw new Error(errorData.error || '레시피 저장에 실패했습니다.');
      }

      const newRecipe = await createResponse.json();

      toast({
        title: '레시피가 생성되었습니다.',
        description: '새로운 레시피가 성공적으로 생성되었습니다.',
      });

      // 새로 생성된 레시피 페이지로 이동
      router.push(`/recipes/${newRecipe.id}`);
    } catch (error) {
      console.error('Error generating recipe:', error);
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '레시피 생성 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerateRecipe}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          생성 중...
        </>
      ) : (
        <>
          <Wand2 className="mr-2 h-4 w-4" />
          레시피 생성
        </>
      )}
    </Button>
  );
} 