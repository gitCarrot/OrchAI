import { getAuth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

// 사용자 ID 확인 함수
export async function getUserId(request: NextRequest): Promise<string | null> {
  // 1. 내부 API 호출 확인
  const apiKey = request.headers.get('x-api-key');
  const targetUserId = request.headers.get('x-user-id');

  // 내부 API 호출이면서 x-user-id가 있는 경우
  if (apiKey && INTERNAL_API_KEY && apiKey === INTERNAL_API_KEY && targetUserId) {
    return targetUserId;
  }

  // 2. 일반 사용자 인증
  const { userId } = await getAuth(request);
  return userId;
} 