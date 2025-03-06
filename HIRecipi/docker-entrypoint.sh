#!/bin/sh

# 데이터베이스가 준비될 때까지 대기
echo "Waiting for database to be ready..."
while ! nc -z db 5432; do
  sleep 1
done

# 추가 대기 시간 (데이터베이스 초기화 완료를 위해)
sleep 5

# 마이그레이션 실행
echo "Running database migrations..."
npm run db:push

# 앱 시작
echo "Starting the application..."
npm run dev 