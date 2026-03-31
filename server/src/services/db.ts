import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool;

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/mastery';
    pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
      max: 10,
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]): Promise<pg.QueryResult<any>> {
  return getPool().query(text, params);
}

export async function initDb(): Promise<void> {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS graphs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      graph_json JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS student_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      graph_id TEXT REFERENCES graphs(id) ON DELETE CASCADE,
      masteries_json JSONB NOT NULL DEFAULT '{}',
      overall_progress REAL NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, graph_id)
    );

    CREATE TABLE IF NOT EXISTS quiz_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      graph_id TEXT REFERENCES graphs(id) ON DELETE CASCADE,
      quiz_json JSONB NOT NULL,
      result_json JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  console.log('Database initialized (PostgreSQL)');
}
