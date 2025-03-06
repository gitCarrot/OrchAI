'use client';

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Heart, Share2, Pencil, Trash2, ChefHat, Clock, Calendar, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useUser } from "@clerk/nextjs";
import { useTranslations } from "@/hooks/use-translations";
import { RecipeContent } from '@/components/recipe/recipe-content';
import { FormatRecipeButton } from '@/components/recipe/format-recipe-button';
import { cn } from '@/lib/utils';
import { useNavigationStore } from '@/store/navigation';
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import type { CSSProperties } from 'react';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Recipe {
  id: number;
  type: 'custom' | 'ai';
  isPublic: boolean;
  favoriteCount: number;
  createdAt: string;
  ownerId: string;
  translation: {
    language: 'ko' | 'en' | 'ja';
    title: string;
    description?: string;
    content: string;
  };
  tags: {
    id: number;
    name: string;
    translation: {
      language: 'ko' | 'en' | 'ja';
      name: string;
    };
  }[];
  isFavorited: boolean;
}

export default function RecipeDetailPage() {
  const { t, language: currentLanguage } = useTranslations();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const { setPage, setRecipe } = useNavigationStore();
  const [recipe, setRecipeState] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    setPage('recipes');
    loadRecipe();
  }, [params.recipeId, currentLanguage]);

  async function loadRecipe() {
    try {
      const { recipeId } = await Promise.resolve(params);
      const response = await fetch(`/api/recipes/${recipeId}?language=${currentLanguage}`);
      if (!response.ok) {
        throw new Error('Failed to load recipe');
      }

      const data = await response.json();
      
      // translations 배열에서 현재 언어에 맞는 번역을 찾거나 첫 번째 번역을 사용
      if (Array.isArray(data.translations)) {
        const currentTranslation = data.translations.find(t => t.language === currentLanguage) || data.translations[0];
        if (currentTranslation) {
          data.translation = currentTranslation;
        } else {
          throw new Error('No translation available');
        }
      } else if (!data.translation) {
        throw new Error('No translation available');
      }

      if (data.tags) {
        data.tags = data.tags.map(tag => ({
          ...tag,
          translation: Array.isArray(tag.translations) 
            ? tag.translations.find(t => t.language === currentLanguage) || tag.translations[0] || { language: currentLanguage, name: tag.name }
            : tag.translation || { language: currentLanguage, name: tag.name }
        }));
      }

      setRecipe(data);
      setRecipeState(data);
      setIsFavorited(data.isFavorited);
    } catch (error) {
      console.error('Error loading recipe:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFavorite() {
    if (!user) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('common.loginRequired'),
      });
      return;
    }

    try {
      const method = isFavorited ? 'DELETE' : 'POST';
      const response = await fetch(`/api/recipes/${recipe?.id}/favorites`, {
        method,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update favorite status');
      }

      setIsFavorited(!isFavorited);
      setRecipe(prev => prev ? {
        ...prev,
        favoriteCount: prev.favoriteCount + (isFavorited ? -1 : 1)
      } : null);

      toast({
        title: t(isFavorited ? 'recipe.unfavorited' : 'recipe.favorited'),
        description: t(isFavorited ? 'recipe.unfavoritedDesc' : 'recipe.favoritedDesc'),
      });
    } catch (error) {
      console.error('Error updating favorite:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('recipe.error.favorite'),
      });
    }
  }

  async function handleDelete() {
    if (!confirm(t('recipe.deleteConfirm'))) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/recipes/${params.recipeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete recipe');

      toast({
        title: t('recipe.deleted'),
        description: t('recipe.deletedDesc'),
      });

      router.push('/recipes');
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('recipe.deleteError'),
      });
    } finally {
      setIsDeleting(false);
    }
  }

  async function loadTags() {
    try {
      const response = await fetch(`/api/tags?language=${currentLanguage}`);
      if (!response.ok) throw new Error('Failed to load tags');
      const data = await response.json();
      setAvailableTags(data);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  }

  const currentTranslation = useMemo(() => {
    if (!recipe?.translation) {
      return null;
    }

    return recipe.translation;
  }, [recipe?.translation]);

  const getTagTranslation = useMemo(() => {
    return (tag: { translation?: { language: string; name: string; } }) => {
      if (!tag.translation || !Array.isArray(tag.translation)) {
        return tag.name;
      }

      const translation = tag.translation.find(t => t?.language === currentLanguage);
      if (translation?.name) {
        return translation.name;
      }

      const koTranslation = tag.translation.find(t => t?.language === 'ko');
      if (koTranslation?.name) {
        return koTranslation.name;
      }

      const enTranslation = tag.translation.find(t => t?.language === 'en');
      if (enTranslation?.name) {
        return enTranslation.name;
      }

      return tag.name;
    };
  }, [currentLanguage]);

  // 레시피 내용 업데이트 핸들러
  const handleRecipeUpdate = async (data: { title?: string; content: string; isPreview?: boolean }) => {
    if (!recipe) return;

    if (data.isPreview) {
      setIsPreview(true);
      setRecipeState(prev => prev ? {
        ...prev,
        translation: {
          ...prev.translation,
          title: data.title || prev.translation.title,
          content: data.content
        }
      } : null);
      return;
    }

    setIsPreview(false);
    
    // 실제 업데이트가 적용된 경우 서버에서 최신 데이터를 다시 불러옴
    try {
      setIsLoading(true);
      await loadRecipe();
    } catch (error) {
      console.error('Error refreshing recipe:', error);
      // 에러 발생 시 기존 상태로 복원
      setRecipeState(prev => prev ? {
        ...prev,
        translation: {
          ...prev.translation,
          title: data.title || prev.translation.title,
          content: data.content
        }
      } : null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Card>
          <CardHeader>
            <div className="h-8 bg-muted rounded w-1/3 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-1/4 animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-5/6 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-4/6 animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Card>
          <CardContent className="text-center p-6">
            <p className="text-muted-foreground">{t('recipe.notFound')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <Card className="overflow-hidden border-primary/10">
        <CardHeader className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
            
            <div className="flex items-center gap-2">
              {user?.id === recipe?.ownerId && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <Link href={`/recipes/${params.recipeId}/edit`}>
                      <Pencil className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFavorite}
              >
                <Heart
                  className={cn(
                    "w-4 h-4",
                    isFavorited && "fill-red-500 text-red-500"
                  )}
                />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold">
                {currentTranslation?.title}
              </CardTitle>
              {currentTranslation?.description && (
                <CardDescription className="text-lg">
                  {currentTranslation.description}
                </CardDescription>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <ChefHat className="w-4 h-4" />
                <span>{recipe?.type === 'ai' ? t('recipe.typeAI') : t('recipe.typeCustom')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(recipe?.createdAt || '').toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span>{recipe?.favoriteCount || 0}</span>
              </div>
            </div>

            {recipe?.tags && recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="rounded-full"
                  >
                    {tag.translation?.name || tag.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* 포맷팅/번역 버튼 추가 */}
            {recipe && (
              <FormatRecipeButton
                recipeId={recipe.id}
                recipeContent={currentTranslation?.content || ''}
                recipeTitle={currentTranslation?.title || ''}
                onUpdate={handleRecipeUpdate}
              />
            )}
          </div>
        </CardHeader>

        <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => (
                <h1 className="text-3xl font-bold mt-6 mb-4" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-2xl font-bold mt-5 mb-3" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-xl font-bold mt-4 mb-2" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="my-4 leading-7" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc list-inside my-4 space-y-2" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal list-inside my-4 space-y-2" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="ml-4" {...props} />
              ),
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto my-6">
                  <table className="border-collapse border border-border w-full" {...props} />
                </div>
              ),
              thead: ({ node, ...props }) => (
                <thead className="bg-muted" {...props} />
              ),
              th: ({ node, ...props }) => (
                <th className="px-4 py-2 border border-border font-semibold" {...props} />
              ),
              td: ({ node, children, ...props }) => (
                <td className="px-4 py-2 border border-border" {...props}>{children}</td>
              ),
              code: ({ node, inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                
                return !inline ? (
                  <div className="relative my-6">
                    <SyntaxHighlighter
                      language={language}
                      style={vscDarkPlus as { [key: string]: CSSProperties }}
                      className="rounded-lg !my-0"
                      showLineNumbers
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <code className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-sm" {...props}>
                    {children}
                  </code>
                );
              },
              blockquote: ({ node, ...props }) => (
                <blockquote className="border-l-4 border-primary pl-4 my-4 italic" {...props} />
              )
            }}
          >
            {currentTranslation?.content || ''}
          </ReactMarkdown>
        </CardContent>
      </Card>
    </div>
  );
} 