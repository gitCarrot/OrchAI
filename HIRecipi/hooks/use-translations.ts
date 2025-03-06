import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ko } from '@/locales/ko';
import { en } from '@/locales/en';
import { ja } from '@/locales/ja';
import { useEffect, useState } from 'react';

type Language = 'ko' | 'en' | 'ja';
type Variables = { [key: string]: string | number };

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

type TranslationKey = NestedKeyOf<typeof ko>;

interface TranslationStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: TranslationKey, variables?: Variables) => string;
}

const translations = {
  ko,
  en,
  ja,
};

function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object') {
      return acc[part];
    }
    return path;
  }, obj);
}

// 서버에 언어 설정을 저장하는 함수
async function saveLanguageToServer(lang: Language) {
  try {
    const response = await fetch('/api/users/language', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ language: lang }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save language setting');
    }
  } catch (error) {
    console.error('Error saving language setting:', error);
  }
}

const useTranslationStore = create<TranslationStore>()(
  persist(
    (set, get) => ({
      language: 'ko',
      setLanguage: (lang) => {
        console.log('[DEBUG] Setting language to:', lang);
        set({ language: lang });
        // 언어 변경 시 서버에도 저장
        saveLanguageToServer(lang);
        // 브라우저의 언어 설정도 업데이트
        document.documentElement.lang = lang;
      },
      t: (path, variables) => {
        const currentLanguage = get().language;
        console.log('[DEBUG] Current language in t():', currentLanguage);
        const currentTranslations = translations[currentLanguage];
        const value = getNestedValue(currentTranslations, path as string);
        
        if (typeof value !== 'string') {
          console.warn(`Translation missing for key: ${path}`);
          return path as string;
        }
        
        if (variables) {
          return Object.entries(variables).reduce(
            (acc, [key, val]) => acc.replace(`{{${key}}}`, String(val)),
            value
          );
        }
        
        return value;
      },
    }),
    {
      name: 'language-storage',
      partialize: (state) => ({ language: state.language }),
    }
  )
);

export const useTranslations = () => {
  const store = useTranslationStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // 컴포넌트 마운트 시 현재 언어 설정을 확인하고 HTML lang 속성 업데이트
    document.documentElement.lang = store.language;
  }, [store.language]);

  return {
    language: store.language,
    currentLanguage: store.language, // currentLanguage도 동일한 값을 반환
    setLanguage: store.setLanguage,
    t: (path: TranslationKey, variables?: Variables) => {
      if (!isMounted) {
        const value = getNestedValue(translations[store.language], path as string);
        return typeof value === 'string' ? value : path as string;
      }
      return store.t(path, variables);
    },
  };
};

// 기존 useLanguageStore 대신 useTranslations를 사용하도록 export
export const useLanguageStore = useTranslations; 