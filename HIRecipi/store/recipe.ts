import { create } from 'zustand';

interface Recipe {
  id: number;
  title: string;
  content: string;
  type: 'custom' | 'ai';
  isPublic: boolean;
  favoriteCount: number;
  createdAt: string;
  ownerId: string;
  isFavorited?: boolean;
}

interface RecipeStore {
  recipes: Recipe[];
  isLoading: boolean;
  error: string | null;
  originalRecipe: string | null;
  formattedRecipe: string | null;
  isFormatting: boolean;
  showFormatOptions: boolean;
  setRecipes: (recipes: Recipe[]) => void;
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (id: number, data: Partial<Recipe>) => void;
  deleteRecipe: (id: number) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  refreshList: () => Promise<void>;
  setOriginalRecipe: (recipe: string) => void;
  setFormattedRecipe: (recipe: string | null) => void;
  setIsFormatting: (isFormatting: boolean) => void;
  setShowFormatOptions: (show: boolean) => void;
  resetState: () => void;
}

export const useRecipeStore = create<RecipeStore>((set, get) => ({
  recipes: [],
  isLoading: false,
  error: null,
  originalRecipe: null,
  formattedRecipe: null,
  isFormatting: false,
  showFormatOptions: false,
  
  setRecipes: (recipes) => set({ recipes }),
  
  addRecipe: (recipe) => 
    set((state) => ({ 
      recipes: [...state.recipes, recipe] 
    })),
  
  updateRecipe: (id, data) =>
    set((state) => ({
      recipes: state.recipes.map((r) =>
        r.id === id ? { ...r, ...data } : r
      ),
    })),
  
  deleteRecipe: (id) =>
    set((state) => ({
      recipes: state.recipes.filter((r) => r.id !== id),
    })),
  
  setIsLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  refreshList: async () => {
    const store = get();
    store.setIsLoading(true);
    store.setError(null);
    
    try {
      const response = await fetch('/api/recipes');
      if (!response.ok) throw new Error('Failed to fetch recipes');
      
      const data = await response.json();
      store.setRecipes(data);
    } catch (error) {
      store.setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      store.setIsLoading(false);
    }
  },

  setOriginalRecipe: (recipe) => set({ originalRecipe: recipe }),
  
  setFormattedRecipe: (recipe) => set({ formattedRecipe: recipe }),
  
  setIsFormatting: (isFormatting) => set({ isFormatting }),
  
  setShowFormatOptions: (show) => set({ showFormatOptions: show }),
  
  resetState: () => set({
    originalRecipe: null,
    formattedRecipe: null,
    isFormatting: false,
    showFormatOptions: false
  })
})); 