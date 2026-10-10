import { eq } from 'drizzle-orm';
import { openDatabase, type Db } from './client';
import { migrateDatabase } from './migrate';
import { users } from './schema';

export function seedDemoUsers(db: Db): void {
  for (const user of [
    { name: 'John Doe', email: 'john@example.com' },
    { name: 'Jane Doe', email: 'jane@example.com' },
  ]) {
    if (db.select().from(users).where(eq(users.email, user.email)).get()) continue;
    // The legacy column remains for compatibility with existing databases; actors do not log in.
    db.insert(users).values({ ...user, passwordHash: '', createdAt: new Date() }).onConflictDoNothing().run();
  }
}

if (import.meta.main) {
  const { db, sqlite } = openDatabase(process.env.DB_FILE_NAME ?? 'shiftmark.sqlite');
  try {
    migrateDatabase(db);
    seedDemoUsers(db);
    console.log('Predefined actors ready: John Doe and Jane Doe');
  } finally {
    sqlite.close();
  }
}
