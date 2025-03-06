#!/bin/bash

# 오류 발생 시 스크립트 중단
set -e

echo "🔄 데이터베이스 초기화 중..."
# 기존 데이터베이스가 있다면 삭제
psql -U postgres -c "DROP DATABASE IF EXISTS hirecipi;"

# 새 데이터베이스 생성
echo "🚀 새 데이터베이스 생성 중..."
psql -U postgres -c "CREATE DATABASE hirecipi;"

echo "✅ 데이터베이스가 생성되었습니다!"

echo "📦 스키마 생성 중..."
npm run db:push
echo "✅ 스키마 생성 완료"

# 초기 데이터 파일이 있는 경우에만 실행
if [ -f "./scripts/init-db.sql" ]; then
  echo "🌱 초기 데이터 생성 중..."
  psql -U postgres -d hirecipi -f ./scripts/init-db.sql
  echo "✅ 초기 데이터 생성 완료"
fi

echo "✨ 데이터베이스 설정이 완료되었습니다!"
echo "🔍 연결 정보:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  User: postgres"
echo "  Database: hirecipi" 