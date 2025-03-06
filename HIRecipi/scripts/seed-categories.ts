import { db } from '@/db';
import { categories, categoryTranslations } from '@/db/schema';

const DEFAULT_CATEGORIES = [
  {
    name: 'vegetables-fruits',
    icon: '🥬',
    translations: {
      ko: '채소/과일',
      en: 'Vegetables/Fruits',
      ja: '野菜/果物',
    },
  },
  {
    name: 'meat',
    icon: '🥩',
    translations: {
      ko: '육류',
      en: 'Meat',
      ja: '肉類',
    },
  },
  {
    name: 'seafood',
    icon: '🐟',
    translations: {
      ko: '해산물',
      en: 'Seafood',
      ja: '魚介類',
    },
  },
  {
    name: 'dairy',
    icon: '🥛',
    translations: {
      ko: '유제품',
      en: 'Dairy',
      ja: '乳製品',
    },
  },
  {
    name: 'beverages',
    icon: '🥤',
    translations: {
      ko: '음료',
      en: 'Beverages',
      ja: '飲料',
    },
  },
  {
    name: 'seasonings',
    icon: '🧂',
    translations: {
      ko: '조미료',
      en: 'Seasonings',
      ja: '調味料',
    },
  },
  {
    name: 'others',
    icon: '📦',
    translations: {
      ko: '기타',
      en: 'Others',
      ja: 'その他',
    },
  },
];

async function seedCategories() {
  try {
    console.log('시스템 카테고리 시드 시작...');

    // 트랜잭션으로 모든 작업 수행
    await db.transaction(async (tx) => {
      for (const category of DEFAULT_CATEGORIES) {
        // 1. 카테고리 생성
        const [createdCategory] = await tx
          .insert(categories)
          .values({
            name: category.name,
            icon: category.icon,
            type: 'system',
            isSystem: true,
          })
          .returning();

        // 2. 카테고리 번역 추가
        const translationValues = Object.entries(category.translations).map(([lang, name]) => ({
          categoryId: createdCategory.id,
          language: lang as 'ko' | 'en' | 'ja',
          name,
        }));

        await tx
          .insert(categoryTranslations)
          .values(translationValues);

        console.log(`카테고리 생성 완료: ${category.name}`);
      }
    });

    console.log('시스템 카테고리 시드 완료!');
  } catch (error) {
    console.error('시스템 카테고리 시드 실패:', error);
    throw error;
  }
}

// 스크립트 실행
seedCategories()
  .catch((error) => {
    console.error('스크립트 실행 실패:', error);
    process.exit(1);
  })
  .finally(async () => {
    // DB 연결 종료
    await db.end();
    process.exit(0);
  }); 