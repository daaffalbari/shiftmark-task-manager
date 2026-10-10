import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { openDatabase, type Db } from './client';
import { migrateDatabase } from './migrate';
import { users } from './schema';

export async function seedDemoUsers(db: Db, demoPassword: string): Promise<void> {
  z.string().min(12).parse(demoPassword);
  for (const user of [
    { name: 'John Doe', email: 'john@example.com' },
    { name: 'Jane Doe', email: 'jane@example.com' },
  ]) {
    if (db.select().from(users).where(eq(users.email, user.email)).get()) continue;
    const passwordHash = await Bun.password.hash(demoPassword, { algorithm: 'argon2id' });
    db.insert(users).values({ ...user, passwordHash, createdAt: new Date() }).onConflictDoNothing().run();
  }
}

if (import.meta.main) {
  const password = z.string().min(12, 'Set DEMO_PASSWORD to at least 12 characters.').parse(process.env.DEMO_PASSWORD);
  const { db, sqlite } = openDatabase(process.env.DB_FILE_NAME ?? 'shiftmark.sqlite');
  try {
    migrateDatabase(db);
    await seedDemoUsers(db, password);
    console.log('Demo users ready: john@example.com and jane@example.com');
  } finally {
    sqlite.close();
  }
}
