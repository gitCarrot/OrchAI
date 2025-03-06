import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

export default {
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'hirecipi',
    ssl: false,
  },
} satisfies Config; 