import { db } from './index';
import { categories, categoryTranslations, refrigerators, refrigeratorCategories } from './schema';
import { sql } from 'drizzle-orm';

const systemCategories = [
  {
    icon: '🥬',
    translations: {
      ko: '채소/과일',
      en: 'Vegetables/Fruits',
      ja: '野菜/果物',
    },
  },
  {
    icon: '🥩',
    translations: {
      ko: '육류',
      en: 'Meat',
      ja: '肉類',
    },
  },
  {
    icon: '🐟',
    translations: {
      ko: '해산물',
      en: 'Seafood',
      ja: '魚介類',
    },
  },
  {
    icon: '🥛',
    translations: {
      ko: '유제품',
      en: 'Dairy',
      ja: '乳製品',
    },
  },
  {
    icon: '🥚',
    translations: {
      ko: '계란/달걀',
      en: 'Eggs',
      ja: '卵',
    },
  },
  {
    icon: '🍶',
    translations: {
      ko: '양념/소스',
      en: 'Seasonings/Sauces',
      ja: '調味料/ソース',
    },
  },
  {
    icon: '🥫',
    translations: {
      ko: '가공식품',
      en: 'Processed Foods',
      ja: '加工食品',
    },
  },
];

async function main() {
  try {
    console.log('Seeding database...');

    // 기존 데이터 삭제
    await db.execute(sql`TRUNCATE TABLE ${categories} CASCADE`);

    // 시스템 카테고리 생성
    for (const category of systemCategories) {
      const [newCategory] = await db
        .insert(categories)
        .values({
          type: 'system',
          icon: category.icon,
        })
        .returning();

      // 카테고리 번역 추가
      const translations = Object.entries(category.translations).map(([language, name]) => ({
        categoryId: newCategory.id,
        language: language as 'ko' | 'en' | 'ja',
        name,
      }));

      await db.insert(categoryTranslations).values(translations);
    }

    console.log('Database seeding completed.');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

main(); 