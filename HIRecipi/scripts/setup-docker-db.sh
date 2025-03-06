#!/bin/bash

# 오류 발생 시 스크립트 중단
set -e

echo "🔄 도커 데이터베이스 초기화 중..."

# 데이터베이스가 준비될 때까지 대기
echo "⏳ 데이터베이스 준비 대기 중..."
sleep 10

# 기존 연결 모두 끊기
echo "🔌 기존 데이터베이스 연결 종료 중..."
docker-compose exec -T db psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'hirecipi' AND pid <> pg_backend_pid();"

# 기존 데이터베이스가 있다면 삭제
echo "🗑 기존 데이터베이스 삭제 중..."
docker-compose exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS hirecipi;"

# 새 데이터베이스 생성
echo "🚀 새 데이터베이스 생성 중..."
docker-compose exec -T db psql -U postgres -c "CREATE DATABASE hirecipi;"

# vector 확장 설치
echo "📦 vector 확장 설치 중..."
docker-compose exec -T db psql -U postgres -d hirecipi -c "CREATE EXTENSION IF NOT EXISTS vector;"

echo "✅ 데이터베이스가 생성되었습니다!"

# 스키마 생성
echo "📦 스키마 생성 중..."
# Docker 컨테이너 내부에서 스키마 생성 실행
docker-compose exec -T frontend sh -c "DATABASE_URL=postgresql://postgres:postgres@db:5432/hirecipi npm run db:push -- --config drizzle.docker.config.ts"

# 스키마가 제대로 생성되었는지 확인
echo "🔍 스키마 확인 중..."
if docker-compose exec -T db psql -U postgres -d hirecipi -c "\dt" | grep -q 'categories'; then
    echo "✅ 스키마 확인 완료"
    
    # 초기 데이터 생성 시도
    if [ -f "./scripts/init-db.sql" ]; then
        echo "🌱 초기 데이터 생성 중..."
        if docker-compose exec -T db psql -U postgres -d hirecipi < ./scripts/init-db.sql; then
            echo "✅ 초기 데이터 생성 완료"
        else
            echo "❌ 초기 데이터 생성 실패"
            exit 1
        fi
    else
        echo "ℹ️ 초기 데이터 파일이 없습니다."
    fi
else
    echo "❌ 스키마가 제대로 생성되지 않았습니다"
    exit 1
fi

echo "✨ 도커 데이터베이스 설정이 완료되었습니다!"
echo "🔍 연결 정보:"
echo "  External: postgres://postgres:postgres@localhost:5432/hirecipi"
echo "  Internal: postgres://postgres:postgres@db:5432/hirecipi" 