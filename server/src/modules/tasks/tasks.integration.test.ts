import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createFixture } from '../../../test/fixture';
import { auditLogs } from '../../db/schema';

let f: Awaited<ReturnType<typeof createFixture>>;
beforeEach(async () => { f = await createFixture(); });
afterEach(() => f.sqlite.close());

test('creates trimmed To do tasks with a creation event and shares the team list', async () => {
  const john = await f.request.post('/api/tasks').set('Origin', f.origin).send({ title: '  Prepare invoice  ', actorId: f.john });
  expect(john.status).toBe(201);
  expect(john.body.task.title).toBe('Prepare invoice');
  expect(john.body.task.status).toBe('to_do');
  expect(john.body.task.createdAt).toBe('2026-10-10T07:00:00.000Z');
  expect(john.body.task.deletedAt).toBeNull();
  expect(f.db.select().from(auditLogs).all()).toHaveLength(1);
  await f.request.post('/api/tasks').set('Origin', f.origin).send({ title: 'Jane task', actorId: f.jane });
  const result = await f.request.get('/api/tasks');
  expect(result.body.tasks.map((task: { title: string }) => task.title)).toEqual(['Jane task', 'Prepare invoice']);
});

test('validates strict creation payloads and view; defaults to active', async () => {
  for (const body of [{ title: ' ' }, { title: 'a'.repeat(121) }, { title: 'Task', ownerId: 1 }, { title: 'Task', status: 'done' }]) {
    expect((await f.request.post('/api/tasks').set('Origin', f.origin).send({ ...body, actorId: f.jane })).status).toBe(400);
  }
  expect((await f.request.get('/api/tasks?view=unknown')).status).toBe(400);
  expect((await f.request.get('/api/tasks?view=deleted')).body.tasks).toEqual([]);
});

test('task reads need no login; writes require an actor and equal timestamps sort newest ID first', async () => {
  expect((await f.request.get('/api/tasks')).status).toBe(200);
  expect((await f.request.post('/api/tasks').set('Origin', f.origin).send({ title: 'Task' })).status).toBe(400);
  for (const title of ['First', 'Second']) {
    await f.request.post('/api/tasks').set('Origin', f.origin).send({ title, actorId: f.john });
  }
  const result = await f.request.get('/api/tasks');
  expect(result.body.tasks.map((task: { title: string }) => task.title)).toEqual(['Second', 'First']);
});
