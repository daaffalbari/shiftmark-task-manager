import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { openDatabase, type Db } from './client';

export function migrateDatabase(db: Db): void {
  migrate(db, { migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)) });
}

if (import.meta.main) {
  const { sqlite, db } = openDatabase(process.env.DB_FILE_NAME ?? 'shiftmark.sqlite');
  try {
    migrateDatabase(db);
    console.log('Database migrations applied.');
  } finally {
    sqlite.close();
  }
}
