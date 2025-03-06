import { create } from 'zustand';

interface Refrigerator {
  id: number;
  name: string;
  description: string | null;
  ownerId: string;
  isOwner: boolean;
  role: 'owner' | 'admin' | 'viewer';
  memberCount: number;
  ingredientCount: number;
  createdAt: string;
  updatedAt: string;
}

interface RefrigeratorStore {
  refrigerators: Refrigerator[];
  isLoading: boolean;
  error: string | null;
  setRefrigerators: (refrigerators: Refrigerator[]) => void;
  addRefrigerator: (refrigerator: Refrigerator) => void;
  updateRefrigerator: (id: number, data: Partial<Refrigerator>) => void;
  deleteRefrigerator: (id: number) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  refreshList: () => Promise<void>;
}

export const useRefrigeratorStore = create<RefrigeratorStore>((set, get) => ({
  refrigerators: [],
  isLoading: false,
  error: null,
  
  setRefrigerators: (refrigerators) => set({ refrigerators }),
  
  addRefrigerator: (refrigerator) => 
    set((state) => ({ 
      refrigerators: [...state.refrigerators, refrigerator] 
    })),
  
  updateRefrigerator: (id, data) =>
    set((state) => ({
      refrigerators: state.refrigerators.map((r) =>
        r.id === id ? { ...r, ...data } : r
      ),
    })),
  
  deleteRefrigerator: (id) =>
    set((state) => ({
      refrigerators: state.refrigerators.filter((r) => r.id !== id),
    })),
  
  setIsLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  refreshList: async () => {
    const store = get();
    store.setIsLoading(true);
    store.setError(null);
    
    try {
      const response = await fetch('/api/refrigerators');
      if (!response.ok) throw new Error('Failed to fetch refrigerators');
      
      const data = await response.json();
      store.setRefrigerators(data);
    } catch (error) {
      store.setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      store.setIsLoading(false);
    }
  },
})); 