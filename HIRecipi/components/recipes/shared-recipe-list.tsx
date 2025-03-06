'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/hooks/use-translations';

interface SharedRecipe {
  id: number;
  title: string;
  description: string;
  authorEmail: string;
  createdAt: string;
  updatedAt: string;
  ingredients: string[];
  steps: string[];
  imageUrl?: string;
}

export function SharedRecipeList() {
  const [recipes, setRecipes] = useState<SharedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const initialLoadDone = useRef(false);
  const { toast } = useToast();
  const { t } = useTranslations();
  
  const { ref, inView } = useInView({
    threshold: 0,
  });

  console.log('SharedRecipeList component mounted');

  const fetchRecipes = async () => {
    if (isLoading || !hasMore) return;

    try {
      console.log('Fetching recipes...');
      setIsLoading(true);
      const response = await fetch(`/api/recipes/shared?page=${pageRef.current}&limit=9`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('recipe.loadError'));
      }

      console.log('Fetched recipes:', data);

      if (data.length < 9) {
        setHasMore(false);
      }

      setRecipes(prev => [...prev, ...data]);
      pageRef.current += 1;
    } catch (error) {
      console.error('Error fetching recipes:', error);
      toast({
        title: t('recipe.loadError'),
        description: error instanceof Error ? error.message : t('common.unknownError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 초기 데이터 로딩
  useEffect(() => {
    if (!initialLoadDone.current) {
      console.log('Initial loading effect');
      initialLoadDone.current = true;
      fetchRecipes();
    }
  }, []);

  // 무한 스크롤을 위한 추가 데이터 로딩
  useEffect(() => {
    console.log('Infinite scroll effect, inView:', inView);
    if (inView && initialLoadDone.current) {
      fetchRecipes();
    }
  }, [inView]);

  if (recipes.length === 0 && !isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">{t('recipe.noRecipes')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {recipes.map((recipe) => (
          <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
            <Card className="overflow-hidden hover:border-primary transition-colors">
              {recipe.imageUrl && (
                <div className="aspect-video relative overflow-hidden">
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
              <CardHeader>
                <CardTitle className="line-clamp-2">{recipe.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('recipe.role')}: {recipe.authorEmail}
                  <br />
                  {t('recipe.createdAt')}: {new Date(recipe.createdAt).toLocaleDateString()}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {recipe.description}
                </p>
                <div className="mt-4">
                  <Button variant="outline" size="sm" className="w-full">
                    {t('recipe.viewDetails')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      
      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <div className="aspect-video">
                <Skeleton className="w-full h-full" />
              </div>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5 mt-2" />
                <Skeleton className="h-4 w-2/3 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <div ref={ref} className="h-1" />
    </div>
  );
} 