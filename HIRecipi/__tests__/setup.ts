import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { pool } from '@/db';

// Clerk 인증 모킹
jest.mock('@clerk/nextjs', () => ({
  auth: () => ({
    userId: 'test_user_id',
    user: {
      emailAddresses: [{ emailAddress: 'test@example.com' }]
    }
  }),
  clerkClient: {
    users: {
      getUser: () => ({
        id: 'test_user_id',
        emailAddresses: [{ emailAddress: 'test@example.com' }]
      })
    }
  }
}));

async function resetDatabase() {
  try {
    // 스키마 재생성
    await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
    await db.execute(sql`CREATE SCHEMA public`);
    
    // 기본 권한 설정
    await db.execute(sql`GRANT ALL ON SCHEMA public TO public`);
    await db.execute(sql`GRANT ALL ON ALL TABLES IN SCHEMA public TO public`);
    
    // 검색 경로 설정
    await db.execute(sql`SET search_path TO public`);
    
    // 마이그레이션 파일 실행
    const migrationFile = await readFile(join(process.cwd(), 'drizzle/0000_many_betty_ross.sql'), 'utf-8');
    await db.execute(sql.raw(migrationFile));
  } catch (error) {
    console.error('Database reset failed:', error);
    throw error;
  }
}

beforeAll(async () => {
  try {
    await resetDatabase();
  } catch (error) {
    console.error('Test setup failed:', error);
    throw error;
  }
});

afterEach(async () => {
  try {
    // 각 테스트 후 데이터 초기화
    await resetDatabase();
  } catch (error) {
    console.error('Test cleanup failed:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
    await pool.end();
  } catch (error) {
    console.error('Final cleanup failed:', error);
    throw error;
  }
}); 