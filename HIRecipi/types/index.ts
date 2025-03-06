export interface IIngredientCategory {
  id: number;
  name: string;
  icon: string;
}

export interface IIngredient {
  id: number;
  name: string;
  refrigeratorCategoryId: number;
  quantity: number;
  unit: string;
  expiryDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRecipe {
  id: number;
  title: string;
  content: string;
  ownerId: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRecipeIngredient {
  recipeId: number;
  ingredientId: number;
  amount: number;
  unit: string;
}

export const INGREDIENT_UNITS = [
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'l', label: 'l' },
  { value: '개', label: '개' },
  { value: '봉', label: '봉' },
  { value: '팩', label: '팩' },
  { value: '병', label: '병' },
] as const;

export type IngredientUnit = typeof INGREDIENT_UNITS[number]['value'];

export type Language = 'ko' | 'en' | 'ja';

export interface ILanguagePreference {
  id: number;
  userId: string;
  language: Language;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICategory {
  id: number;
  type: 'system' | 'custom';
  icon: string;
  userId: string | null;
  translations: ICategoryTranslation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICategoryTranslation {
  id: number;
  categoryId: number;
  language: Language;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRefrigeratorCategory {
  id: number;
  refrigeratorId: number;
  categoryId: number;
  category: ICategory;
  ingredients: IIngredient[];
  createdAt: Date;
  updatedAt: Date;
}

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

export interface IRefrigerator {
  id: number;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISharedMember {
  id: string;
  userId: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const CATEGORIES = [
  { id: 'vegetablesFruits', icon: '🥬' },
  { id: 'meat', icon: '🥩' },
  { id: 'seafood', icon: '🐟' },
  { id: 'dairy', icon: '🥛' },
  { id: 'beverages', icon: '🥤' },
  { id: 'seasonings', icon: '🧂' },
  { id: 'others', icon: '🍱' },
] as const;

export interface ITag {
  id: number;
  name: string;
  translations: ITagTranslation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ITagTranslation {
  id: number;
  tagId: number;
  language: Language;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRecipe {
  id: number;
  type: 'custom' | 'ai';
  isPublic: boolean;
  favoriteCount: number;
  ownerId: string;
  translations: IRecipeTranslation[];
  tags: ITag[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IRecipeTranslation {
  id: number;
  recipeId: number;
  language: Language;
  title: string;
  description?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
} 