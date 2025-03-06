export const INGREDIENT_UNITS = [
  { value: 'g', label: '그램' },
  { value: 'kg', label: '킬로그램' },
  { value: 'ml', label: '밀리리터' },
  { value: 'l', label: '리터' },
  { value: '개', label: '개' },
  { value: '봉', label: '봉' },
  { value: '팩', label: '팩' },
  { value: '병', label: '병' },
] as const;

export const CATEGORIES = [
  { id: 'vegetablesFruits', icon: '🥬' },
  { id: 'meat', icon: '🥩' },
  { id: 'seafood', icon: '🐟' },
  { id: 'dairy', icon: '🥛' },
  { id: 'beverages', icon: '🥤' },
  { id: 'seasonings', icon: '🧂' },
  { id: 'others', icon: '🍱' },
] as const;

export const SUPPORTED_LANGUAGES = {
  ko: {
    name: '한국어',
    flag: '🇰🇷',
    label: '한국',
  },
  en: {
    name: 'English',
    flag: '🇺🇸',
    label: 'United States',
  },
  ja: {
    name: '日本語',
    flag: '🇯🇵',
    label: '日本',
  },
} as const;

export type Language = keyof typeof SUPPORTED_LANGUAGES; 