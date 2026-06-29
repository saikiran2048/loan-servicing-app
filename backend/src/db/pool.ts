import { Pool, QueryResultRow } from 'pg';
import { env } from '../config/env';

// Neon requires SSL; local Postgres (used for dev/test) typically doesn't
// have it configured. DB_SSL=false opts out explicitly — defaults to true
// since Neon is the real target environment.
const useSsl = process.env.DB_SSL !== 'false';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]) {
  return pool.query<T>(text, params);
}
