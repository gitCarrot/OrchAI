'use client';

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Heart, ChefHat, Search, Share2, ArrowLeft, ArrowRight, Calendar, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import Link from "next/link";
import { useNavigationStore } from '@/store/navigation';
import { CategoryFilter, categories } from '@/components/recipe/category-filter';
import { cn } from "@/lib/utils";
import { useTranslations } from "@/hooks/use-translations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Recipe {
  id: number;
  type: 'custom' | 'ai';
  isPublic: boolean;
  favoriteCount: number;
  createdAt: string;
  ownerId: string;
  isFavorited: boolean;
  translation: {
    language: string;
    title: string;
    description: string | null;
    content: string;
  };
}

interface PaginationInfo {
  total: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
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

export default function SharedRecipesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { t, currentLanguage } = useTranslations();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo>({
    total: 0,
    pageSize: 12,
    currentPage: 1,
    totalPages: 1,
  });
  const [searchKeyword, setSearchKeyword] = useState('');
  const { setPage } = useNavigationStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'keyword' | 'semantic'>('keyword');

  const currentPage = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    if (!searchKeyword && !selectedCategory) {
      loadRecipes();
    }
    setPage('recipe-shared');
  }, [currentPage, setPage, searchKeyword, selectedCategory]);

  async function loadRecipes() {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/recipes/shared?page=${paginationInfo.currentPage}&language=${currentLanguage}`);
      if (!response.ok) {
        throw new Error('Failed to load recipes');
      }
      const data = await response.json();
      setRecipes(data.recipes);
      setPaginationInfo(data.pagination);
    } catch (error) {
      console.error("[SHARED_RECIPES_LOAD]", error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('recipe.error.load'),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSearch(searchKeyword?: string) {
    if (!searchKeyword?.trim()) {
      loadRecipes();
      return;
    }

    try {
      setIsLoading(true);
      const endpoint = searchType === 'semantic' 
        ? '/api/recipes/vector-search'
        : '/api/recipes/shared/search';

      const response = await fetch(`${endpoint}?language=${currentLanguage}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: searchKeyword,
          language: currentLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to search recipes');
      }

      const data = await response.json();
      
      // 검색 결과가 없을 경우 빈 배열 설정
      if (!data.recipes || data.recipes.length === 0) {
        setRecipes([]);
        setPaginationInfo({
          ...paginationInfo,
          total: 0,
          totalPages: 0,
        });
        return;
      }

      // 검색 결과의 번역 처리
      const processedRecipes = data.recipes.map((recipe: any) => ({
        ...recipe,
        translation: recipe.translation || recipe.translations?.find((t: any) => t.language === currentLanguage) || {
          language: currentLanguage,
          title: '(No translation)',
          description: null,
          content: '',
        },
      }));

      setRecipes(processedRecipes);
      setPaginationInfo({
        ...paginationInfo,
        total: data.total,
        totalPages: Math.ceil(data.total / paginationInfo.pageSize),
      });
    } catch (error) {
      console.error("[RECIPES_SEARCH]", error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('recipe.error.search'),
      });
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
        throw new Error('Failed to update favorite status');
      }

      setRecipes(prev => prev.map(recipe => 
        recipe.id === recipeId ? {
          ...recipe,
          isFavorited: !currentFavorited,
          favoriteCount: recipe.favoriteCount + (currentFavorited ? -1 : 1),
        } : recipe
      ));

      toast({
        title: currentFavorited ? "즐겨찾기에서 제거되었습니다" : "즐겨찾기에 추가되었습니다",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update favorite status.",
      });
    }
  }

  function handlePageChange(page: number) {
    router.push(`/recipes/shared?page=${page}`);
  }

  // 카테고리 선택 핸들러
  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    if (category) {
      // 카테고리 이름으로 검색
      const categoryName = categories.find(c => c.id === category)?.name || '';
      handleSearch(categoryName);
    } else {
      // 카테고리 선택 해제 시 기존 검색어로 검색하거나 전체 목록 로드
      if (searchKeyword) {
        handleSearch();
      } else {
        loadRecipes();
      }
    }
  };

  // 언어 변경 감지 및 레시피 새로고침
  useEffect(() => {
    loadRecipes();
  }, [currentLanguage, paginationInfo.currentPage]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <motion.div 
          className="space-y-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <motion.div 
              className="p-3 bg-primary/10 rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <Share2 className="w-8 h-8 text-primary" />
            </motion.div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              {t('recipes.shared.title')}
            </h1>
            <p className="text-muted-foreground max-w-[600px] text-lg">
              {t('recipes.shared.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
                <Card className="relative h-[200px] bg-card/50 backdrop-blur-sm border-muted/20 animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted/50 rounded-full w-2/3" />
                    <div className="h-4 bg-muted/50 rounded-full w-1/3 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-muted/50 rounded-full w-full" />
                      <div className="h-4 bg-muted/50 rounded-full w-4/5" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <motion.div 
        className="space-y-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <motion.div 
            className="p-3 bg-primary/10 rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <Share2 className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            {t('recipes.shared.title')}
          </h1>
          <p className="text-muted-foreground max-w-[600px] text-lg">
            {t('recipes.shared.description')}
          </p>
        </div>

        <div className="w-full max-w-5xl mx-auto space-y-6">
          <div className="relative w-full max-w-2xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl blur-xl" />
            <div className="relative bg-card/50 backdrop-blur-sm rounded-xl border-2 border-muted shadow-xl p-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
                <div className="flex items-center gap-4 w-full max-w-xl">
                  <div className="relative flex-1">
                    <Input
                      placeholder={t('recipes.search.placeholder')}
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchKeyword)}
                      className="pr-20"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => handleSearch(searchKeyword)}
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                  <Select
                    value={searchType}
                    onValueChange={(value: 'keyword' | 'semantic') => setSearchType(value)}
                  >
                    <SelectTrigger className="w-[140px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keyword">{t('recipes.search.type.keyword')}</SelectItem>
                      <SelectItem value="semantic">{t('recipes.search.type.semantic')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-3xl mx-auto">
            <CategoryFilter
              selectedCategory={selectedCategory}
              onSelectCategory={handleCategorySelect}
            />
          </div>
        </div>

        {recipes.length === 0 ? (
          <div className="flex flex-col items-center text-center space-y-4">
            <motion.div 
              className="p-3 bg-primary/10 rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <Share2 className="w-8 h-8 text-primary" />
            </motion.div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              {t('recipes.shared.no_recipes')}
            </h1>
            <p className="text-muted-foreground max-w-[600px] text-lg">
              {t('recipes.shared.no_recipes_description')}
            </p>
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {recipes.map((recipe) => (
              <motion.div key={recipe.id} variants={item} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
                <Link href={`/recipes/${recipe.id}`} className="block">
                  <Card className="relative h-[320px] bg-card hover:bg-card/80 backdrop-blur-sm border-2 border-muted/20 hover:border-primary/20 transition-all duration-300 shadow-md hover:shadow-xl overflow-hidden">
                    <CardHeader className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                            {recipe.translation?.title || t('recipe.noTitle')}
                          </CardTitle>
                          <CardDescription className="mt-2 line-clamp-2 text-sm text-muted-foreground/80">
                            {recipe.translation?.description || t('recipe.noDescription')}
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
                    <CardContent className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/80 to-transparent">
                      <Button variant="outline" className="w-full bg-background/50 hover:bg-background">
                        {t('recipe.viewDetails')}
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        {paginationInfo.totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-12">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(paginationInfo.currentPage - 1)}
              disabled={paginationInfo.currentPage === 1}
              className="rounded-full w-10 h-10 bg-background/50 border-2 border-muted hover:border-primary/20"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex gap-2">
              {[...Array(paginationInfo.totalPages)].map((_, i) => {
                const pageNumber = i + 1;
                if (
                  pageNumber === 1 ||
                  pageNumber === paginationInfo.totalPages ||
                  (pageNumber >= paginationInfo.currentPage - 2 && pageNumber <= paginationInfo.currentPage + 2)
                ) {
                  return (
                    <Button
                      key={`page-${pageNumber}`}
                      variant={paginationInfo.currentPage === pageNumber ? "default" : "outline"}
                      onClick={() => handlePageChange(pageNumber)}
                      className={cn(
                        "rounded-full w-10 h-10 border-2",
                        paginationInfo.currentPage === pageNumber 
                          ? "bg-primary/10 text-primary hover:bg-primary/20 border-primary/30" 
                          : "bg-background/50 border-muted hover:border-primary/20"
                      )}
                    >
                      {pageNumber}
                    </Button>
                  );
                } else if (
                  pageNumber === paginationInfo.currentPage - 3 ||
                  pageNumber === paginationInfo.currentPage + 3
                ) {
                  return (
                    <span key={`ellipsis-${pageNumber}`} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(paginationInfo.currentPage + 1)}
              disabled={paginationInfo.currentPage === paginationInfo.totalPages}
              className="rounded-full w-10 h-10 bg-background/50 border-2 border-muted hover:border-primary/20"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
} 