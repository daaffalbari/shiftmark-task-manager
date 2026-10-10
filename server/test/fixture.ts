import request from 'supertest';
import { createApp } from '../src/app';
import { openDatabase } from '../src/db/client';
import { migrateDatabase } from '../src/db/migrate';
import { seedDemoUsers } from '../src/db/seed';

export async function createFixture() {
  const context = openDatabase(':memory:');
  migrateDatabase(context.db);
  seedDemoUsers(context.db);
  const now = new Date('2026-10-10T07:00:00Z');
  const origin = 'http://localhost:5173';
  const app = createApp({ db: context.db, origin, now: () => now });
  const john = 1;
  const jane = 2;
  return { ...context, app, origin, john, jane, request: request(app) };
}
