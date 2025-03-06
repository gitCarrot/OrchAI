import { drizzle } from 'drizzle-orm/node-postgres';
import { pool } from './pool';
import * as schema from './schema';

// 개발 환경인지 확인 (Next.js의 NODE_ENV 사용)
const isDevelopment = process.env.NODE_ENV === 'development';
const isDocker = process.env.IS_DOCKER === 'true';

// DATABASE_URL이 있으면 그것을 사용
const databaseUrl = process.env.DATABASE_URL;

let connectionConfig;

if (databaseUrl) {
  // DATABASE_URL이 제공된 경우 그것을 사용
  connectionConfig = { connectionString: databaseUrl };
} else if (isDevelopment && !isDocker) {
  // 로컬 개발 환경 설정
  connectionConfig = {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'hirecipi',
    ssl: false,
  };
} else {
  // 도커 또는 프로덕션 환경 설정
  connectionConfig = {
    host: process.env.POSTGRES_HOST || 'db',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'hirecipi',
    ssl: false,
  };
}

// 환경변수 디버깅
console.log('Current Environment:', process.env.NODE_ENV);
console.log('Is Docker:', isDocker);
console.log('Database URL:', databaseUrl);
console.log('Database Connection Config:', connectionConfig);

// 연결 풀 에러 핸들링 추가
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// 연결 테스트
pool.connect()
  .then(() => console.log('✅ 데이터베이스 연결 성공'))
  .catch((err) => console.error('❌ 데이터베이스 연결 실패:', err));

// drizzle ORM 인스턴스 생성
export const db = drizzle(pool, { schema });

// 애플리케이션 종료 시 연결 풀 정리
process.on('SIGINT', () => {
  pool.end().then(() => {
    console.log('Pool has ended');
    process.exit(0);
  });
});

// 스키마 export
export * from './schema';

// 데이터베이스 연결 상태 확인
export async function checkDbConnection() {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT version()');
      console.log('Database connected:', result.rows[0].version);
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error);
    return false;
  }
}

// 초기 연결 확인
checkDbConnection().catch(console.error); 