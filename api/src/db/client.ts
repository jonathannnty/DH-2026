import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { loadEnv } from '../env.js';

const INIT_SQL = `
  CREATE TABLE IF NOT EXISTS sessions (
    id           TEXT PRIMARY KEY,
    status       TEXT NOT NULL DEFAULT 'intake',
    track_id     TEXT,
    profile      TEXT NOT NULL DEFAULT '{}',
    messages     TEXT NOT NULL DEFAULT '[]',
    recommendations TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  );
`;

/** Add track_id column to existing databases that lack it. */
const MIGRATE_SQL = `
  ALTER TABLE sessions ADD COLUMN track_id TEXT;
`;

let _sqlite: Database.Database | null = null;
let _db: BetterSQLite3Database<typeof schema> | null = null;

function ensureInit(): { sqlite: Database.Database; db: BetterSQLite3Database<typeof schema> } {
  if (_sqlite && _db) return { sqlite: _sqlite, db: _db };
  const env = loadEnv();
  _sqlite = new Database(env.DATABASE_URL);
  _sqlite.pragma('journal_mode = WAL');
  _sqlite.exec(INIT_SQL);
  // Migrate existing databases that lack the track_id column
  try { _sqlite.exec(MIGRATE_SQL); } catch { /* column already exists */ }
  _db = drizzle(_sqlite, { schema });
  return { sqlite: _sqlite, db: _db };
}

/** Main drizzle instance — lazily initialized. */
export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_target, prop, receiver) {
    const { db: real } = ensureInit();
    const value = Reflect.get(real, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(real);
    }
    return value;
  },
});

/** Create a fresh in-memory DB for testing. Returns db + cleanup fn. */
export function createTestDb(): {
  db: BetterSQLite3Database<typeof schema>;
  close: () => void;
} {
  const sqlite = new Database(':memory:');
  sqlite.exec(INIT_SQL);
  const testDb = drizzle(sqlite, { schema });
  return { db: testDb, close: () => sqlite.close() };
}

/** Expose for health checks */
export function dbHealthCheck(): boolean {
  try {
    const { sqlite } = ensureInit();
    sqlite.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}

/** Graceful close */
export function closeDb(): void {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
    _db = null;
  }
}
