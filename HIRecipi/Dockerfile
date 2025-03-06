FROM node:18-alpine

WORKDIR /app

# 패키지 파일 복사 및 의존성 설치
COPY package*.json ./
RUN npm install --legacy-peer-deps

# 소스 코드 복사
COPY . .

# Next.js 텔레메트리 비활성화
ENV NEXT_TELEMETRY_DISABLED 1

# 환경 변수 설정
ENV NODE_ENV=development
ENV IS_DOCKER=true
ENV BACKEND_URL=http://backend:8000

# 포트 설정
EXPOSE 3000

# 개발 모드로 실행
CMD ["npm", "run", "dev"]

ENTRYPOINT ["docker-entrypoint.sh"] 