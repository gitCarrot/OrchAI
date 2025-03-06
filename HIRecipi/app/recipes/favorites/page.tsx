'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { RecipeList } from '@/components/recipes/recipe-list';
import { Card, CardContent } from '@/components/ui/card';

interface Recipe {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  isPublic: boolean;
  favoriteCount: number;
}

interface ApiRecipe {
  id: number;
  title: string;
  content: string;
  type: 'custom' | 'ai';
  isPublic: boolean;
  favoriteCount: number;
  createdAt: string;
  ownerId: string;
}

interface FavoriteRecipesResponse {
  recipes: ApiRecipe[];
  pagination: {
    total: number;
    pageSize: number;
    currentPage: number;
    totalPages: number;
  };
}

export default function FavoriteRecipesPage() {
  const { data, isLoading, error } = useQuery<{ recipes: Recipe[] }>({
    queryKey: ['recipes', 'favorites'],
    queryFn: async () => {
      const response = await fetch('/api/recipes/favorites');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch favorite recipes');
      }
      const data: FavoriteRecipesResponse = await response.json();
      
      // 서버 응답을 RecipeList 컴포넌트가 기대하는 형식으로 변환
      return {
        recipes: data.recipes.map(recipe => ({
          id: String(recipe.id),
          title: recipe.title,
          authorId: recipe.ownerId,
          authorName: 'Unknown', // 실제로는 사용자 정보를 가져와서 설정해야 함
          isPublic: recipe.isPublic,
          favoriteCount: recipe.favoriteCount,
        })),
      };
    },
  });

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardContent className="p-8 text-center text-red-500">
            <p>즐겨찾기한 레시피를 불러오는 중 오류가 발생했습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardContent className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">즐겨찾기한 레시피</h1>
      <RecipeList
        recipes={data?.recipes || []}
        emptyMessage="즐겨찾기한 레시피가 없습니다."
      />
    </div>
  );
} 