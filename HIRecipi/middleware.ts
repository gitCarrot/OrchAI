import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY

// 디버깅을 위한 로그
console.log('Middleware INTERNAL_API_KEY:', INTERNAL_API_KEY ? '설정됨' : '설정되지 않음')

// 공개 라우트에 홈페이지 추가
const isPublicRoute = createRouteMatcher([
    '/',  // 홈페이지
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/(.*)'
])

export default clerkMiddleware(async (auth, request) => {
    // 내부 API 호출 확인
    const apiKey = request.headers.get('x-api-key')
    console.log('Received API Key:', apiKey)
    
    // API 키가 있고 유효한 경우 즉시 통과
    if (apiKey && INTERNAL_API_KEY && apiKey === INTERNAL_API_KEY) {
        console.log('Internal API call authorized')
        return NextResponse.next()
    }

    // API 키가 없거나 유효하지 않은 경우에만 Clerk 인증 체크
    if (!isPublicRoute(request)) {
        await auth.protect()
    }

    return NextResponse.next()
})

export const config = {
    matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)']
} 