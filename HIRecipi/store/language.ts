import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language, SUPPORTED_LANGUAGES } from '@/types';

interface LanguageState {
  currentLanguage: Language;
  setLanguage: (language: Language) => Promise<void>;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      currentLanguage: 'ko',
      setLanguage: async (language: Language) => {
        try {
          const response = await fetch('/api/users/language', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ language }),
          });

          if (!response.ok) {
            throw new Error('Failed to update language preference');
          }

          set({ currentLanguage: language });
        } catch (error) {
          console.error('Error updating language:', error);
        }
      },
    }),
    {
      name: 'language-storage',
    }
  )
); 