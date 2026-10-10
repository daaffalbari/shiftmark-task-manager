import request from 'supertest';
import { createApp } from '../src/app';
import { openDatabase } from '../src/db/client';
import { migrateDatabase } from '../src/db/migrate';
import { seedDemoUsers } from '../src/db/seed';
import { login } from '../src/modules/auth/auth.service';

export async function createFixture() {
  const context = openDatabase(':memory:');
  migrateDatabase(context.db);
  const password = 'test-password-long';
  await seedDemoUsers(context.db, password);
  const now = new Date('2026-10-10T07:00:00Z');
  const origin = 'http://localhost:5173';
  const app = createApp({ db: context.db, origin, secureCookies: false, now: () => now });
  const john = 'shiftmark_session=' + (await login(context.db, 'john@example.com', password, now))!.token;
  const jane = 'shiftmark_session=' + (await login(context.db, 'jane@example.com', password, now))!.token;
  return { ...context, app, origin, john, jane, request: request(app) };
}
