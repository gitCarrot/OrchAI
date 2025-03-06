'use client';

import { useEffect, useState, useRef, TouchEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { IngredientList } from '@/components/refrigerators/ingredient-list';
import { AddIngredientDialog } from '@/components/refrigerators/add-ingredient-dialog';
import { ShareDialog } from '@/components/refrigerators/share-dialog';
import { SharedMembersDialog } from '@/components/refrigerators/shared-members-dialog';
import { EditRefrigeratorDialog } from '@/components/refrigerators/edit-refrigerator-dialog';
import { DeleteRefrigeratorDialog } from '@/components/refrigerators/delete-refrigerator-dialog';
import { CategoryManagementDialog } from '@/components/refrigerators/category-management-dialog';
import { SettingsMenu } from '@/components/refrigerators/settings-menu';
import { IIngredient, IRefrigeratorCategory, ISharedMember } from '@/types';
import { useTranslations } from '@/hooks/use-translations';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/store/language';
import { redirect } from 'next/navigation';
import { useNavigationStore } from '@/store/navigation';

interface RefrigeratorDetail {
  id: number;
  name: string;
  description: string | null;
  ownerId: string;
  isOwner: boolean;
  role: 'owner' | 'admin' | 'viewer';
  memberCount: number;
  ingredientCount: number;
  ingredients: IIngredient[];
  categories: IRefrigeratorCategory[];
  members: ISharedMember[];
}

interface IngredientFormData {
  name: string;
  quantity: string;
  unit: string;
  expiryDate?: string | null;
  categoryId: string;
}

export default function RefrigeratorPage() {
  const params = useParams<{ refrigeratorId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { t, language } = useTranslations();
  const { setPage, setRefrigerator, reset } = useNavigationStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refrigeratorData, setRefrigeratorData] = useState<RefrigeratorDetail | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSharedMembersOpen, setIsSharedMembersOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCategoryManageOpen, setIsCategoryManageOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // 최소 스와이프 거리
  const minSwipeDistance = 50;

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || !refrigeratorData) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    const categories = refrigeratorData.categories || [];
    
    if (isLeftSwipe) {
      const currentIndex = categories.findIndex(c => c.id.toString() === selectedCategory);
      if (currentIndex === -1 || currentIndex === categories.length - 1) {
        setSelectedCategory(categories[0]?.id.toString() ?? 'all');
      } else {
        const nextCategory = categories[currentIndex + 1];
        if (nextCategory) {
          setSelectedCategory(nextCategory.id.toString());
        }
      }
    }
    
    if (isRightSwipe) {
      const currentIndex = categories.findIndex(c => c.id.toString() === selectedCategory);
      if (currentIndex === -1 || currentIndex === 0) {
        setSelectedCategory('all');
      } else {
        const prevCategory = categories[currentIndex - 1];
        if (prevCategory) {
          setSelectedCategory(prevCategory.id.toString());
        }
      }
    }
  };

  // 데이터 로딩 함수
  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('[DEBUG] 냉장고 정보 로딩 시작:', { refrigeratorId: params.refrigeratorId });
      
      // 냉장고 정보 가져오기
      const refrigeratorResponse = await fetch(`/api/refrigerators/${params.refrigeratorId}`);
      console.log('[DEBUG] 냉장고 API 응답:', { 
        status: refrigeratorResponse.status,
        ok: refrigeratorResponse.ok 
      });
      
      if (!refrigeratorResponse.ok) {
        const errorData = await refrigeratorResponse.json();
        console.log('[DEBUG] 냉장고 API 에러:', errorData);
        
        // 에러 코드에 따른 처리
        switch (errorData.code) {
          case 'AUTH_REQUIRED':
          case 'EMAIL_REQUIRED':
            router.push('/sign-in');
            return;
          
          case 'INVALID_ID':
            toast({
              variant: "destructive",
              title: t('common.error'),
              description: t('refrigerator.invalidId'),
            });
            router.push('/refrigerators');
            return;
          
          case 'REFRIGERATOR_NOT_FOUND':
            toast({
              variant: "destructive",
              title: t('common.error'),
              description: t('refrigerator.notFound'),
            });
            router.push('/refrigerators');
            return;
          
          case 'ACCESS_DENIED':
            toast({
              variant: "destructive",
              title: t('common.error'),
              description: t('refrigerator.accessDenied'),
            });
            router.push('/refrigerators');
            return;
          
          default:
            toast({
              variant: "destructive",
              title: t('common.error'),
              description: errorData.message || t('refrigerator.loadError'),
            });
            return;
        }
      }
      
      const refrigeratorData = await refrigeratorResponse.json();
      console.log('[DEBUG] 냉장고 데이터:', refrigeratorData);
      
      // 카테고리와 재료 목록 가져오기
      const categoriesResponse = await fetch(`/api/refrigerators/${params.refrigeratorId}/categories`);
      console.log('[DEBUG] 카테고리 API 응답:', { 
        status: categoriesResponse.status,
        ok: categoriesResponse.ok
      });
      
      if (!categoriesResponse.ok) {
        const errorData = await categoriesResponse.json();
        console.log('[DEBUG] 카테고리 API 에러:', errorData);
        
        toast({
          variant: "destructive",
          title: t('common.error'),
          description: errorData.message || t('refrigerator.categories.loadError'),
        });
        return;
      }
      
      const categoriesData = await categoriesResponse.json();
      console.log('[DEBUG] 카테고리 데이터:', categoriesData);
      
      // 모든 재료를 하나의 배열로 합치기
      const allIngredients = categoriesData.reduce((acc: any[], category: any) => {
        return [...acc, ...(category.ingredients || [])];
      }, []);
      
      // 데이터 유효성 검사
      if (!refrigeratorData || !Array.isArray(categoriesData)) {
        console.log('[DEBUG] 유효하지 않은 응답 데이터:', { refrigeratorData, categoriesData });
        toast({
          variant: "destructive",
          title: t('common.error'),
          description: t('refrigerator.invalidData'),
        });
        return;
      }
      
      // 냉장고 데이터 업데이트
      setRefrigeratorData({
        ...refrigeratorData,
        categories: categoriesData,
        ingredients: allIngredients
      });
      
      // 선택된 카테고리가 유효한지 확인
      if (selectedCategory !== 'all' && !categoriesData.some((c: any) => c.id.toString() === selectedCategory)) {
        setSelectedCategory('all');
      }
    } catch (error) {
      console.error('[DEBUG] 데이터 로딩 에러:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('refrigerator.loadError'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reset();
    setPage(`refrigerator-page-refrigeratorId:${params.refrigeratorId}`);
    setRefrigerator(Number(params.refrigeratorId));
    loadData();
  }, [params.refrigeratorId, setPage, setRefrigerator]);

  useEffect(() => {
    console.log('[DEBUG] Language changed:', language);
    // 언어가 변경될 때 카테고리 이름 리렌더링을 위해 상태 업데이트
    if (refrigeratorData) {
      setRefrigeratorData({...refrigeratorData});
    }
  }, [language]);

  if (isLoading || !refrigeratorData) {
    return <LoadingSkeleton />;
  }

  const filteredIngredients = selectedCategory === 'all'
    ? refrigeratorData.ingredients
    : refrigeratorData.ingredients.filter(i => i.refrigeratorCategoryId.toString() === selectedCategory);

  // 카테고리 이름 가져오기 함수 수정
  const getCategoryName = (category: IRefrigeratorCategory) => {
    console.log('[DEBUG] getCategoryName - Input:', {
      category,
      currentLanguage: language,
    });

    const categoryData = category.category;
    if (!categoryData || !categoryData.translations) {
      console.log('[DEBUG] getCategoryName - No category data or translations');
      return t('category.unnamed');
    }

    console.log('[DEBUG] getCategoryName - Translations:', categoryData.translations);
    
    const currentTranslation = categoryData.translations.find(t => t.language === language);
    console.log('[DEBUG] getCategoryName - Current translation:', currentTranslation);

    const defaultTranslation = categoryData.translations[0];
    console.log('[DEBUG] getCategoryName - Default translation:', defaultTranslation);

    const name = currentTranslation?.name || defaultTranslation?.name || t('category.unnamed');
    console.log('[DEBUG] getCategoryName - Final name:', name);

    return name;
  };

  // 카테고리 아이콘 가져오기 함수 수정
  const getCategoryIcon = (category: IRefrigeratorCategory) => {
    const categoryData = category.category;
    return categoryData?.icon || '📦';
  };

  async function handleAddIngredient(data: IngredientFormData) {
    try {
      console.log('[DEBUG] === 재료 추가 시작 ===');
      console.log('[DEBUG] 폼 데이터:', data);
      console.log('[DEBUG] 사용 가능한 카테고리:', refrigeratorData?.categories.map(c => ({
        rcId: c.id,
        categoryId: c.category.id,
        name: c.category.translations[0]?.name
      })));

      if (!refrigeratorData) {
        throw new Error('냉장고 정보를 찾을 수 없습니다.');
      }

      // 선택된 카테고리 찾기
      const selectedCategory = refrigeratorData.categories.find(rc => rc.id.toString() === data.categoryId);
      console.log('[DEBUG] 카테고리 검색 조건:', {
        searchingForId: data.categoryId,
        searchingForIdType: typeof data.categoryId,
        firstCategoryId: refrigeratorData.categories[0]?.id,
        firstCategoryIdType: typeof refrigeratorData.categories[0]?.id
      });

      if (!selectedCategory) {
        console.error('[DEBUG] 카테고리를 찾을 수 없음:', {
          categoryId: data.categoryId,
          availableCategories: refrigeratorData.categories.map(c => ({
            rcId: c.id,
            categoryId: c.category.id,
            name: c.category.translations[0]?.name
          }))
        });
        throw new Error('선택된 카테고리를 찾을 수 없습니다.');
      }

      console.log('[DEBUG] 선택된 카테고리:', {
        rcId: selectedCategory.id,
        categoryId: selectedCategory.category.id,
        name: selectedCategory.category.translations[0]?.name
      });

      // API 호출
      const apiPath = `/api/refrigerators/${params.refrigeratorId}/categories/${selectedCategory.category.id}/ingredients`;
      console.log('[DEBUG] API 경로:', apiPath);
      console.log('[DEBUG] 요청 데이터:', {
        name: data.name,
        quantity: data.quantity,
        unit: data.unit,
        expiryDate: data.expiryDate || null
      });

      const response = await fetch(apiPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          quantity: data.quantity,
          unit: data.unit,
          expiryDate: data.expiryDate || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '재료 추가에 실패했습니다.');
      }

      const newIngredient = await response.json();
      console.log('[DEBUG] 재료 추가 결과:', newIngredient);

      // 상태 업데이트 개선
      setRefrigeratorData(prev => {
        if (!prev) return prev;

        // 새로운 재료를 전체 재료 목록과 해당 카테고리에 추가
        const updatedCategories = prev.categories.map(rc => {
          if (rc.id === selectedCategory.id) {
            return {
              ...rc,
              ingredients: [...(rc.ingredients || []), newIngredient]
            };
          }
          return rc;
        });

        return {
          ...prev,
          categories: updatedCategories,
          ingredients: [...prev.ingredients, newIngredient]  // 전체 재료 목록에도 추가
        };
      });

      // 성공 메시지 표시
      toast({
        title: "재료 추가 성공",
        description: `${data.name}이(가) 추가되었습니다.`,
      });

      // 다이얼로그 닫기
      setIsAddIngredientOpen(false);

    } catch (error) {
      console.error('[ERROR] 재료 추가 중 오류:', error);
      toast({
        variant: "destructive",
        title: "재료 추가 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      });
    }
  }

  async function handleUpdateIngredient(id: number, data: any) {
    if (!refrigeratorData) return;

    try {
      console.log('[DEBUG] === 재료 수정 시작 ===');
      console.log('[DEBUG] 재료 ID:', id);
      console.log('[DEBUG] 수정 데이터:', data);

      // 선택된 카테고리 찾기
      const selectedCategory = refrigeratorData.categories.find(rc => rc.id === data.refrigeratorCategoryId);
      if (!selectedCategory) {
        throw new Error('선택된 카테고리를 찾을 수 없습니다.');
      }

      const requestData = {
        name: data.name,
        quantity: data.quantity,
        unit: data.unit,
        expiryDate: data.expiryDate || null,
      };

      console.log('[DEBUG] 요청 데이터:', requestData);
      console.log('[DEBUG] API 경로:', `/api/refrigerators/${params.refrigeratorId}/categories/${selectedCategory.category.id}/ingredients/${id}`);

      const response = await fetch(
        `/api/refrigerators/${params.refrigeratorId}/categories/${selectedCategory.category.id}/ingredients/${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '서버 오류가 발생했습니다.' }));
        console.error('[DEBUG] API 에러:', errorData);
        throw new Error(errorData.error || '서버 오류가 발생했습니다.');
      }

      const updatedIngredient = await response.json();
      console.log('[DEBUG] 수정된 재료:', updatedIngredient);

      // 상태 업데이트
      setRefrigeratorData(prev => {
        if (!prev) return prev;

        // 카테고리별 재료 목록 업데이트
        const updatedCategories = prev.categories.map(rc => {
          if (rc.id === data.refrigeratorCategoryId) {
            return {
              ...rc,
              ingredients: [...(rc.ingredients || []).filter(i => i.id !== id), updatedIngredient]
            };
          }
          // 이전 카테고리에서 재료 제거
          if (rc.ingredients?.some(i => i.id === id)) {
            return {
              ...rc,
              ingredients: rc.ingredients.filter(i => i.id !== id)
            };
          }
          return rc;
        });

        return {
          ...prev,
          categories: updatedCategories,
          ingredients: prev.ingredients.map(ing => ing.id === id ? updatedIngredient : ing)
        };
      });

      toast({
        title: '성공',
        description: `${updatedIngredient.name} 재료가 수정되었습니다.`,
      });
    } catch (error) {
      console.error('[DEBUG] 재료 수정 실패:', error);
      toast({
        variant: "destructive",
        title: '오류',
        description: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
      });
    }
  }

  async function handleDeleteIngredient(id: number) {
    if (!refrigeratorData) return;

    try {
      console.log('[DEBUG] === 재료 삭제 시작 ===');
      console.log('[DEBUG] 재료 ID:', id);

      // 재료가 속한 카테고리 찾기
      const ingredient = refrigeratorData.ingredients.find(i => i.id === id);
      if (!ingredient) {
        throw new Error('삭제할 재료를 찾을 수 없습니다.');
      }

      const category = refrigeratorData.categories.find(rc => rc.id === ingredient.refrigeratorCategoryId);
      if (!category) {
        throw new Error('재료가 속한 카테고리를 찾을 수 없습니다.');
      }

      console.log('[DEBUG] API 경로:', `/api/refrigerators/${params.refrigeratorId}/categories/${category.category.id}/ingredients/${id}`);

      const response = await fetch(
        `/api/refrigerators/${params.refrigeratorId}/categories/${category.category.id}/ingredients/${id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '서버 오류가 발생했습니다.' }));
        console.error('[DEBUG] API 에러:', errorData);
        throw new Error(errorData.error || '서버 오류가 발생했습니다.');
      }

      // 상태 업데이트
      setRefrigeratorData(prev => {
        if (!prev) return prev;

        // 카테고리별 재료 목록 업데이트
        const updatedCategories = prev.categories.map(rc => {
          if (rc.id === ingredient.refrigeratorCategoryId) {
            return {
              ...rc,
              ingredients: (rc.ingredients || []).filter(i => i.id !== id)
            };
          }
          return rc;
        });

        return {
          ...prev,
          categories: updatedCategories,
          ingredients: prev.ingredients.filter(ing => ing.id !== id)
        };
      });

      toast({
        title: '성공',
        description: `${ingredient.name} 재료가 삭제되었습니다.`,
      });
    } catch (error) {
      console.error('[DEBUG] 재료 삭제 실패:', error);
      toast({
        variant: "destructive",
        title: '오류',
        description: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
      });
    }
  }

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{refrigeratorData.name}</h1>
        {(refrigeratorData.isOwner || refrigeratorData.role === 'admin') && (
          <SettingsMenu
            onAddIngredient={() => setIsAddIngredientOpen(true)}
            onManageCategories={() => setIsCategoryManageOpen(true)}
            onShare={() => setIsShareOpen(true)}
            onManageMembers={() => setIsSharedMembersOpen(true)}
            onEdit={() => setIsEditOpen(true)}
            onDelete={() => setIsDeleteOpen(true)}
            isOwner={refrigeratorData.isOwner}
          />
        )}
      </div>

      {refrigeratorData.description && (
        <p className="text-muted-foreground mb-6">{refrigeratorData.description}</p>
      )}

      <div className="relative mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const currentIndex = refrigeratorData.categories.findIndex(c => c.id.toString() === selectedCategory);
              if (currentIndex === -1 || currentIndex === 0) {
                setSelectedCategory('all');
              } else {
                setSelectedCategory(refrigeratorData.categories[currentIndex - 1].id.toString());
              }
            }}
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div 
            className="flex-1 relative"
            ref={scrollContainerRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-2 max-w-full scroll-smooth">
              <Button
                variant={selectedCategory === 'all' ? "default" : "ghost"}
                onClick={() => setSelectedCategory('all')}
                className="shrink-0 whitespace-nowrap"
              >
                {t('common.all')}
              </Button>
              {refrigeratorData.categories.map((category) => {
                console.log('[DEBUG] Rendering category:', {
                  categoryId: category.id,
                  categoryData: category.category,
                  translations: category.category.translations,
                  currentLanguage: language
                });
                
                const icon = getCategoryIcon(category);
                const name = getCategoryName(category);
                
                return (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id.toString() ? "default" : "ghost"}
                    onClick={() => setSelectedCategory(category.id.toString())}
                    className="shrink-0 whitespace-nowrap"
                  >
                    {icon} {name}
                  </Button>
                );
              })}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const currentIndex = refrigeratorData.categories.findIndex(c => c.id.toString() === selectedCategory);
              if (currentIndex === -1 || currentIndex === refrigeratorData.categories.length - 1) {
                setSelectedCategory(refrigeratorData.categories[0]?.id.toString() ?? 'all');
              } else {
                setSelectedCategory(refrigeratorData.categories[currentIndex + 1].id.toString());
              }
            }}
            className="shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <IngredientList
        ingredients={filteredIngredients}
        onUpdate={loadData}
        refrigeratorId={refrigeratorData.id}
        categories={refrigeratorData.categories}
      />

      <AddIngredientDialog
        open={isAddIngredientOpen}
        onOpenChange={setIsAddIngredientOpen}
        refrigeratorId={refrigeratorData.id}
        onSuccess={(data) => handleAddIngredient(data)}
        categories={refrigeratorData.categories}
      />

      <ShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        refrigeratorId={refrigeratorData.id}
        onSuccess={loadData}
      />

      <SharedMembersDialog
        open={isSharedMembersOpen}
        onOpenChange={setIsSharedMembersOpen}
        refrigeratorId={refrigeratorData.id}
        onUpdate={loadData}
        isOwner={refrigeratorData.isOwner}
      />

      <EditRefrigeratorDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        refrigeratorId={refrigeratorData.id}
        initialName={refrigeratorData.name}
        initialDescription={refrigeratorData.description || ''}
        onSuccess={loadData}
      />

      <DeleteRefrigeratorDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        refrigeratorId={refrigeratorData.id}
        refrigeratorName={refrigeratorData.name}
      />

      <CategoryManagementDialog
        open={isCategoryManageOpen}
        onOpenChange={setIsCategoryManageOpen}
        refrigeratorId={refrigeratorData.id}
        onSuccess={loadData}
        categories={refrigeratorData.categories}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <Skeleton className="h-4 w-full mb-6" />
      <Skeleton className="h-10 w-full mb-6" />
      <div className="grid gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
} 