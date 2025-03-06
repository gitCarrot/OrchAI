import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { Pool, PoolConfig } from 'pg';

// 환경 변수에서 설정값 가져오기
const {
  DATABASE_URL = 'postgresql://postgres:postgres@db:5432/hirecipi',
  NODE_ENV = 'development',
  AWS_REGION,
} = process.env;

// 기본 풀 설정
const poolConfig: PoolConfig = {
  connectionString: DATABASE_URL,
  max: NODE_ENV === 'production' ? 20 : 10,  // 최대 커넥션 수 감소
  min: NODE_ENV === 'production' ? 5 : 2,    // 최소 유지 커넥션 수 조정
  idleTimeoutMillis: 10000,                  // 유휴 커넥션 타임아웃 감소 (10초)
  connectionTimeoutMillis: 2000,             // 커넥션 타임아웃 감소 (2초)
  maxUses: 7500,                            // 커넥션 재사용 최대 횟수
  application_name: 'hirecipi',             // 모니터링용 애플리케이션 이름
  statement_timeout: 10000,                  // 쿼리 타임아웃 감소 (10초)
  keepAlive: true,                         // TCP Keepalive 활성화
  keepAliveInitialDelayMillis: 10000,       // Keepalive 초기 지연시간 감소
};

// AWS ECS 환경 특화 설정
if (NODE_ENV === 'production' && AWS_REGION) {
  poolConfig.ssl = {
    rejectUnauthorized: true,
    ca: process.env.RDS_CA_CERT,           // RDS CA 인증서
  };
}

// 커넥션 풀 생성
export const pool = new Pool(poolConfig);

// 커넥션 이벤트 핸들러
pool.on('connect', (client) => {
  console.debug('New client connected to database');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // 에러 발생 시 클라이언트 종료 시도
  try {
    client?.release(true); // force release
  } catch (e) {
    console.error('Error releasing client', e);
  }
});

pool.on('acquire', (client) => {
  console.debug('Client acquired from pool');
});

pool.on('remove', (client) => {
  console.debug('Client removed from pool');
});

// 연결 풀 상태 모니터링 함수
export async function checkPoolStatus(): Promise<void> {
  try {
    // 기존 idle 클라이언트를 재사용
    const result = await db.execute(sql`
      SELECT count(*) as count 
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `);
    console.debug('Current database connections:', {
      total: Number(result[0].count),
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    });
  } catch (error) {
    console.error('Error checking pool status:', error);
  }
}

// 주기적으로 연결 풀 상태 체크 (개발 환경에서만)
let poolCheckInterval: NodeJS.Timeout | null = null;

if (process.env.NODE_ENV === 'development') {
  poolCheckInterval = setInterval(checkPoolStatus, 60000); // 1분마다 체크로 변경
}

// 프로세스 종료 시 풀 정리
process.on('SIGTERM', async () => {
  console.log('Closing pool connections...');
  try {
    if (poolCheckInterval) {
      clearInterval(poolCheckInterval);
    }
    await pool.end();
    console.log('Pool has ended');
  } catch (err) {
    console.error('Error closing pool', err);
  }
});

// 예기치 않은 종료 시에도 정리
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Cleaning up...');
  try {
    if (poolCheckInterval) {
      clearInterval(poolCheckInterval);
    }
    await pool.end();
    console.log('Pool has ended');
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
});

// 헬스체크 함수
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
} 