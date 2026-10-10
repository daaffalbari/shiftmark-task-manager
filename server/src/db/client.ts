import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';

export function openDatabase(path: string) {
  const sqlite = new Database(path);
  sqlite.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  if (path !== ':memory:') sqlite.exec('PRAGMA journal_mode = WAL;');
  return { sqlite, db: drizzle(sqlite, { schema }) };
}

export type DbContext = ReturnType<typeof openDatabase>;
export type Db = DbContext['db'];
