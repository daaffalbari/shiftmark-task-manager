import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import type { ApiUser } from '@shiftmark/contracts';
import type { Db } from '../../db/client';
import { sessions, users } from '../../db/schema';

export const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const publicUser = (user: typeof users.$inferSelect): ApiUser => ({ id: user.id, name: user.name, email: user.email });

export async function login(db: Db, email: string, password: string, now: Date) {
  const user = db.select().from(users).where(eq(users.email, email)).get();
  if (!user || !await Bun.password.verify(password, user.passwordHash)) return null;
  const token = randomBytes(32).toString('hex');
  db.insert(sessions).values({
    id: digest(token), userId: user.id, createdAt: now,
    expiresAt: new Date(now.getTime() + sessionLifetimeMs),
  }).run();
  return { user: publicUser(user), token };
}

export function getSessionUser(db: Db, token: string | undefined, now: Date): ApiUser | null {
  if (!token) return null;
  const result = db.select({ user: users }).from(sessions).innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, digest(token)), gt(sessions.expiresAt, now))).get();
  return result ? publicUser(result.user) : null;
}

export function logout(db: Db, token: string | undefined): void {
  if (token) db.delete(sessions).where(eq(sessions.id, digest(token))).run();
}

export function readSessionCookie(cookie: string | undefined): string | undefined {
  return cookie?.split(';').map((value) => value.trim()).find((value) => /^shiftmark_session=[a-f0-9]{64}$/.test(value))?.split('=')[1];
}
