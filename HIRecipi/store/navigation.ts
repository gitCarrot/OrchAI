import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// 현재 페이지 컨텍스트 정보
export interface PageContext {
  page: string;
  refrigeratorId?: number | null;
  recipeId?: number | null;
  categoryId?: string | null;
  timestamp: number;
}

interface NavigationState {
  // 현재 페이지 정보
  currentPage: string;
  currentRefrigeratorId: number | null;
  currentRecipeId: number | null;
  currentCategoryId: string | 'all' | null;

  // 페이지 이동 액션
  setPage: (page: string) => void;
  setRefrigerator: (id: number | null) => void;
  setRecipe: (id: number | null) => void;
  setCategory: (id: string | 'all' | null) => void;
  setPageInfo: (info: {
    page?: string;
    refrigeratorId?: number | null;
    recipeId?: number | null;
    categoryId?: string | 'all' | null;
  }) => void;

  // 페이지 히스토리
  pageHistory: string[];
  pageContextHistory: PageContext[];
  addToHistory: (page: string) => void;
  clearHistory: () => void;

  // 현재 페이지 컨텍스트 가져오기
  getCurrentContext: () => PageContext;

  // 상태 초기화
  reset: () => void;
}

interface NavigationStore {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const initialState = {
  currentPage: 'home',
  currentRefrigeratorId: null,
  currentRecipeId: null,
  currentCategoryId: null,
  pageHistory: [],
  pageContextHistory: [],
  isSidebarOpen: true,
};

export const useNavigationStore = create<NavigationState & NavigationStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 초기 상태
        ...initialState,

        // 페이지 설정
        setPage: (page) => {
          const context: PageContext = {
            page,
            refrigeratorId: get().currentRefrigeratorId,
            recipeId: get().currentRecipeId,
            categoryId: get().currentCategoryId,
            timestamp: Date.now(),
          };

          // 개발 환경에서만 로그 출력
          if (process.env.NODE_ENV === 'development') {
            console.group('페이지 이동 감지');
            console.log('페이지:', page);
            console.log('냉장고 ID:', context.refrigeratorId);
            console.log('레시피 ID:', context.recipeId);
            console.log('카테고리:', context.categoryId);
            console.log('시간:', new Date(context.timestamp).toLocaleString());
            console.groupEnd();
          }

          set((state) => ({
            currentPage: page,
            pageHistory: [...state.pageHistory, page].slice(-5),
            pageContextHistory: [...state.pageContextHistory, context].slice(-10),
          }));
        },

        // 냉장고 ID 설정
        setRefrigerator: (id) =>
          set({
            currentRefrigeratorId: id,
            currentCategoryId: id === null ? null : 'all',
          }),

        // 레시피 ID 설정
        setRecipe: (id) =>
          set({
            currentRecipeId: id,
          }),

        // 카테고리 설정
        setCategory: (id) =>
          set({
            currentCategoryId: id,
          }),

        // 페이지 히스토리 관리
        pageHistory: [],
        pageContextHistory: [],
        addToHistory: (page) =>
          set((state) => ({
            pageHistory: [...state.pageHistory, page].slice(-5),
          })),
        clearHistory: () =>
          set({
            pageHistory: [],
            pageContextHistory: [],
          }),

        // 현재 페이지 컨텍스트 가져오기
        getCurrentContext: () => ({
          page: get().currentPage,
          refrigeratorId: get().currentRefrigeratorId,
          recipeId: get().currentRecipeId,
          categoryId: get().currentCategoryId,
          timestamp: Date.now(),
        }),

        // 전체 상태 초기화
        reset: () =>
          set(initialState),

        // 사이드바 상태 관리
        isSidebarOpen: true,
        setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

        // 페이지 정보 일괄 설정
        setPageInfo: (info) => {
          const context: PageContext = {
            page: info.page || get().currentPage,
            refrigeratorId: info.refrigeratorId !== undefined ? info.refrigeratorId : get().currentRefrigeratorId,
            recipeId: info.recipeId !== undefined ? info.recipeId : get().currentRecipeId,
            categoryId: info.categoryId !== undefined ? info.categoryId : get().currentCategoryId,
            timestamp: Date.now(),
          };

          // 개발 환경에서만 로그 출력
          if (process.env.NODE_ENV === 'development') {
            console.group('페이지 정보 일괄 업데이트');
            console.log('페이지:', context.page);
            console.log('냉장고 ID:', context.refrigeratorId);
            console.log('레시피 ID:', context.recipeId);
            console.log('카테고리:', context.categoryId);
            console.log('시간:', new Date(context.timestamp).toLocaleString());
            console.groupEnd();
          }

          set((state) => ({
            currentPage: info.page || state.currentPage,
            currentRefrigeratorId: info.refrigeratorId !== undefined ? info.refrigeratorId : state.currentRefrigeratorId,
            currentRecipeId: info.recipeId !== undefined ? info.recipeId : state.currentRecipeId,
            currentCategoryId: info.categoryId !== undefined ? info.categoryId : state.currentCategoryId,
            pageContextHistory: [...state.pageContextHistory, context].slice(-10),
          }));
        },
      }),
      {
        name: 'navigation-storage',
        partialize: (state) => ({
          currentPage: state.currentPage,
          currentRefrigeratorId: state.currentRefrigeratorId,
          currentRecipeId: state.currentRecipeId,
          currentCategoryId: state.currentCategoryId,
          pageContextHistory: state.pageContextHistory,
        }),
      }
    )
  )
); 