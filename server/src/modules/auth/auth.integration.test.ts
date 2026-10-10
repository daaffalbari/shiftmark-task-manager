import { afterEach, beforeEach, expect, test } from 'bun:test';
import request from 'supertest';
import { createApp } from '../../app';
import { openDatabase, type DbContext } from '../../db/client';
import { migrateDatabase } from '../../db/migrate';
import { seedDemoUsers } from '../../db/seed';
import { sessions } from '../../db/schema';

let context: DbContext;
let app: ReturnType<typeof createApp>;
let now: Date;
const origin = 'http://localhost:5173';
const password = 'test-password-long';

beforeEach(async () => {
  context = openDatabase(':memory:');
  migrateDatabase(context.db);
  await seedDemoUsers(context.db, password);
  now = new Date('2026-10-10T07:00:00Z');
  app = createApp({ db: context.db, origin, secureCookies: false, now: () => now });
});
afterEach(() => context.sqlite.close());

test('seed is idempotent; real login issues an opaque HttpOnly session stored as a hash', async () => {
  await seedDemoUsers(context.db, password);
  const result = await request(app).post('/api/auth/login').set('Origin', origin).send({ email: 'john@example.com', password });
  expect(result.status).toBe(200);
  expect(result.body.user).toEqual({ id: 1, name: 'John Doe', email: 'john@example.com' });
  const cookie = result.headers['set-cookie'][0];
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('SameSite=Lax');
  expect(cookie).toContain('Path=/');
  expect(cookie).not.toContain(password);
  const raw = cookie.split(';')[0].split('=')[1];
  expect(raw).toHaveLength(64);
  expect(context.db.select().from(sessions).get()!.id).not.toBe(raw);
  expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).body.user.id).toBe(1);
});

test('invalid credentials and missing/expired sessions are rejected', async () => {
  for (const email of ['john@example.com', 'absent@example.com']) {
    const result = await request(app).post('/api/auth/login').set('Origin', origin).send({ email, password: 'wrong' });
    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe('INVALID_CREDENTIALS');
  }
  expect((await request(app).get('/api/auth/me')).status).toBe(401);
  const result = await request(app).post('/api/auth/login').set('Origin', origin).send({ email: 'john@example.com', password });
  now = new Date('2026-10-18T07:00:00Z');
  expect((await request(app).get('/api/auth/me').set('Cookie', result.headers['set-cookie'])).status).toBe(401);
});

test('logout invalidates session and clears cookie', async () => {
  const result = await request(app).post('/api/auth/login').set('Origin', origin).send({ email: 'john@example.com', password });
  const cookie = result.headers['set-cookie'];
  const logout = await request(app).post('/api/auth/logout').set('Origin', origin).set('Cookie', cookie);
  expect(logout.status).toBe(204);
  expect(logout.headers['set-cookie'][0]).toContain('Expires=Thu, 01 Jan 1970');
  expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
  expect(context.db.select().from(sessions).all()).toHaveLength(0);
});

test('unsafe requests require the configured Origin and production cookies are Secure', async () => {
  for (const supplied of [undefined, 'https://foreign.test']) {
    const req = request(app).post('/api/auth/login');
    if (supplied) req.set('Origin', supplied);
    expect((await req.send({ email: 'john@example.com', password })).status).toBe(403);
  }
  const secureApp = createApp({ db: context.db, origin, secureCookies: true, now: () => now });
  const result = await request(secureApp).post('/api/auth/login').set('Origin', origin).send({ email: 'john@example.com', password });
  expect(result.headers['set-cookie'][0]).toContain('Secure');
});
