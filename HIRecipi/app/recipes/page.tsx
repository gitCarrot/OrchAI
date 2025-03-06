'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Heart, ChefHat, Plus, Calendar, Search, BookmarkIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import Link from "next/link";
import { useNavigationStore } from '@/store/navigation';
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "@/hooks/use-translations";
import { MultilingualRecipeGenerator } from '@/components/recipe/multilingual-recipe-generator';

interface Recipe {
  id: number;
  type: 'custom' | 'ai';
  isPublic: boolean;
  favoriteCount: number;
  createdAt: string;
  ownerId: string;
  isFavorited: boolean;
  translations: {
    language: 'ko' | 'en' | 'ja';
    title: string;
    description?: string;
    content: string;
  }[];
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export default function RecipesPage() {
  const { toast } = useToast();
  const { t, language: currentLanguage } = useTranslations();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { setPage } = useNavigationStore();
  const [currentTab, setCurrentTab] = useState('all');

  // 현재 언어에 맞는 번역 가져오기
  const getTranslation = (recipe: Recipe) => {
    const translation = recipe.translations?.find(t => t.language === currentLanguage) 
      || recipe.translations?.[0];
    return translation || { 
      language: currentLanguage, 
      title: '(No translation)', 
      description: '', 
      content: '' 
    };
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        if (currentTab === 'favorites') {
          await loadFavoriteRecipes();
        } else if (searchTerm) {
          await handleSearch(searchTerm);
        } else {
          await loadRecipes();
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
    setPage('recipes');
  }, [currentLanguage, currentTab, setPage]);

  // 탭 변경 핸들러
  const handleTabChange = async (value: string) => {
    setCurrentTab(value as 'all' | 'favorites');
    setSearchTerm('');
    setIsLoading(true);
    
    try {
      if (value === 'favorites') {
        await loadFavoriteRecipes();
      } else {
        await loadRecipes();
      }
    } catch (error) {
      console.error('Error changing tab:', error);
    } finally {
      setIsLoading(false);
    }
  };

  async function loadRecipes() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/recipes');
      if (!response.ok) {
        throw new Error('Failed to load recipes');
      }
      const data = await response.json();
      
      // 각 레시피의 즐겨찾기 상태 확인
      const recipesWithFavorites = await Promise.all(
        data.map(async (recipe: Recipe) => {
          try {
            const favoriteResponse = await fetch(`/api/recipes/${recipe.id}/favorites/check`);
            if (favoriteResponse.ok) {
              const { isFavorited } = await favoriteResponse.json();
              return { ...recipe, isFavorited };
            }
            return { ...recipe, isFavorited: false };
          } catch (error) {
            console.error(`Error checking favorite status for recipe ${recipe.id}:`, error);
            return { ...recipe, isFavorited: false };
          }
        })
      );
      
      setRecipes(recipesWithFavorites);
    } catch (error) {
      console.error('Error loading recipes:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('recipes.error.load'),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadFavoriteRecipes() {
    try {
      setIsLoading(true);

      const response = await fetch('/api/recipes/favorites', {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load favorite recipes');
      }

      if (!data.recipes || !Array.isArray(data.recipes)) {
        throw new Error('Invalid response format: recipes array is missing');
      }

      // 각 레시피에 isFavorited를 true로 설정
      const recipesWithFavorites = data.recipes.map((recipe: Recipe) => ({
        ...recipe,
        isFavorited: true
      }));

      setRecipes(recipesWithFavorites);
    } catch (error) {
      console.error('Error loading favorite recipes:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('recipes.error.loadFavorites'),
      });
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSearch(searchKeyword?: string) {
    if (!searchKeyword?.trim()) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/recipes/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: searchKeyword.trim(),
          language: currentLanguage
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '검색 중 오류가 발생했습니다.');
      }

      const data = await response.json();
      
      // 검색 결과가 없는 경우에도 유효한 응답으로 처리
      if (!data.recipes) {
        setRecipes([]);
        toast({
          variant: "default",
          title: "검색 결과",
          description: "검색 결과가 없습니다.",
        });
        return;
      }

      setRecipes(data.recipes);
      if (data.message) {
        toast({
          variant: "default",
          title: "검색 결과",
          description: data.message,
        });
      }
    } catch (error) {
      console.error("[SEARCH] Error:", error);
      toast({
        variant: "destructive",
        title: "검색 실패",
        description: error instanceof Error ? error.message : "레시피 검색 중 오류가 발생했습니다.",
      });
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFavorite(recipeId: number, currentFavorited: boolean) {
    try {
      const method = currentFavorited ? 'DELETE' : 'POST';
      const response = await fetch(`/api/recipes/${recipeId}/favorites`, {
        method,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update favorite status');
      }

      // 즐겨찾기 상태 업데이트 전에 현재 상태 저장
      const updatedFavoriteStatus = !currentFavorited;
      
      setRecipes(prev => prev.map(recipe => 
        recipe.id === recipeId ? {
          ...recipe,
          isFavorited: updatedFavoriteStatus,
          favoriteCount: recipe.favoriteCount + (updatedFavoriteStatus ? 1 : -1),
        } : recipe
      ));

      // 성공 메시지 표시
      toast({
        title: updatedFavoriteStatus ? "즐겨찾기에 추가되었습니다" : "즐겨찾기에서 제거되었습니다",
        description: updatedFavoriteStatus ? "레시피가 즐겨찾기에 추가되었습니다." : "레시피가 즐겨찾기에서 제거되었습니다.",
      });

      // 현재 필터가 즐겨찾기인 경우 목록 새로고침
      if (currentTab === 'favorites') {
        await loadFavoriteRecipes();
      }
    } catch (error) {
      console.error('Error updating favorite status:', error);
      toast({
        variant: "destructive",
        title: "즐겨찾기 실패",
        description: error instanceof Error ? error.message : "즐겨찾기 상태 업데이트에 실패했습니다.",
      });
      
      // 에러 발생 시 상태 롤백
      setRecipes(prev => prev.map(recipe => 
        recipe.id === recipeId ? {
          ...recipe,
          isFavorited: currentFavorited,
          favoriteCount: recipe.favoriteCount
        } : recipe
      ));
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 히어로 섹션 */}
      <div className="w-full bg-gradient-to-b from-primary/5 to-background py-12">
        <div className="container mx-auto px-4">
          {/* 제목 및 설명 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">{t('recipes.title')}</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('recipes.description')}
            </p>
          </div>

          {/* 검색 및 필터링 컨테이너 */}
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 레시피 제너레이터 카드 */}
            <Card className="border-2 border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-6">
                <MultilingualRecipeGenerator />
              </CardContent>
            </Card>

            {/* 검색 및 필터링 섹션 */}
            <div className="space-y-4">
              {/* 검색 바 */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder={t('common.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
                    className="w-full"
                  />
                </div>
                <Button onClick={() => handleSearch(searchTerm)}>
                  <Search className="w-4 h-4 mr-2" />
                  {t('common.search')}
                </Button>
              </div>

              {/* 탭 */}
              <div className="flex justify-between items-center">
                <Tabs defaultValue={currentTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-12">
                    <TabsTrigger value="all" className="text-base">
                      {t('recipes.filter.all')}
                    </TabsTrigger>
                    <TabsTrigger value="favorites" className="text-base">
                      <BookmarkIcon className="w-4 h-4 mr-2" />
                      {t('recipes.filter.favorites')}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <Link href="/recipes/create" className="ml-4">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('recipes.create')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 레시피 목록 */}
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial="hidden"
          animate="show"
          variants={container}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                variants={item}
                className="relative group"
              >
                <Card className="h-[250px] bg-card/50 backdrop-blur-sm border-2 border-muted/20 animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted/50 rounded-full w-2/3" />
                    <div className="h-4 bg-muted/50 rounded-full w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-muted/50 rounded-full w-full" />
                      <div className="h-4 bg-muted/50 rounded-full w-4/5" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : recipes.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground text-lg">
                {currentTab === 'favorites' 
                  ? t('recipes.empty.favorites') 
                  : searchTerm 
                    ? t('recipes.empty.search') 
                    : t('recipes.empty.all')}
              </p>
            </div>
          ) : (
            recipes.map((recipe) => {
              const translation = recipe.translations.find(
                t => t.language === currentLanguage
              ) || recipe.translations[0];

              return (
                <motion.div
                  key={recipe.id}
                  variants={item}
                  className="relative group"
                >
                  <Link href={`/recipes/${recipe.id}`} className="block">
                    <Card className="relative h-[250px] bg-card hover:bg-card/80 backdrop-blur-sm border-2 border-muted/20 hover:border-primary/20 transition-all duration-300 shadow-md hover:shadow-xl overflow-hidden">
                      <CardHeader className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                              {translation?.title || t('common.noTranslation')}
                            </CardTitle>
                            <CardDescription className="mt-2 line-clamp-2 text-sm text-muted-foreground/80">
                              {translation?.description || t('recipe.noDescription')}
                            </CardDescription>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleFavorite(recipe.id, recipe.isFavorited);
                            }}
                            className={cn(
                              "shrink-0 hover:bg-background/50",
                              recipe.isFavorited && "text-red-500"
                            )}
                          >
                            <Heart className={cn(
                              "w-5 h-5 transition-colors",
                              recipe.isFavorited && "fill-current"
                            )} />
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground pt-2">
                          <div className="flex items-center gap-1.5">
                            <ChefHat className="w-4 h-4" />
                            <span>{recipe.type === 'ai' ? t('recipe.typeAI') : t('recipe.typeCustom')}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(recipe.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </div>
    </div>
  );
} 