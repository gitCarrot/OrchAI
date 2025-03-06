import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { tags, tagTranslations } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getUserId } from '../refrigerators/utils';
import { z } from 'zod';

// 태그 생성 스키마
const createTagSchema = z.object({
  name: z.string().min(1, "태그 이름을 입력해주세요."),
  language: z.enum(['ko', 'en', 'ja'])
});

// GET /api/tags - 태그 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const language = searchParams.get('language') || 'ko';

    const allTags = await db.query.tags.findMany({
      with: {
        translations: true
      }
    });

    // 각 태그의 번역 정보를 포함하여 반환
    const formattedTags = allTags.map(tag => ({
      id: tag.id,
      name: tag.name,
      translations: tag.translations
    }));

    return NextResponse.json(formattedTags);
  } catch (error) {
    console.error("[TAGS_GET]", error);
    return NextResponse.json({ error: "태그 목록을 불러오는데 실패했습니다." }, { status: 500 });
  }
}

// POST /api/tags - 새 태그 생성
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createTagSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json({ 
        error: "잘못된 요청입니다.",
        details: validatedData.error.format()
      }, { status: 400 });
    }

    const { name, language } = validatedData.data;

    // 이미 존재하는 태그인지 확인
    const existingTag = await db.query.tags.findFirst({
      where: eq(tags.name, name),
      with: {
        translations: true
      }
    });

    if (existingTag) {
      return NextResponse.json(existingTag);
    }

    // 트랜잭션으로 태그와 번역 생성
    const [newTag] = await db.transaction(async (tx) => {
      const [tag] = await tx
        .insert(tags)
        .values({
          name,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      await tx
        .insert(tagTranslations)
        .values({
          tagId: tag.id,
          language,
          name,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      return [tag];
    });

    return NextResponse.json({
      id: newTag.id,
      name: newTag.name,
      translations: [{
        language,
        name
      }]
    });
  } catch (error) {
    console.error("[TAGS_POST]", error);
    return NextResponse.json({ error: "태그 생성에 실패했습니다." }, { status: 500 });
  }
} 