import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createFixture } from '../../../test/fixture';
import { auditLogs } from '../../db/schema';

let f: Awaited<ReturnType<typeof createFixture>>;
beforeEach(async () => { f = await createFixture(); });
afterEach(() => f.sqlite.close());

test('creates trimmed To do tasks without a creation audit and isolates owners', async () => {
  const john = await f.request.post('/api/tasks').set('Origin', f.origin).set('Cookie', f.john).send({ title: '  Prepare invoice  ' });
  expect(john.status).toBe(201);
  expect(john.body.task.title).toBe('Prepare invoice');
  expect(john.body.task.status).toBe('to_do');
  expect(john.body.task.createdAt).toBe('2026-10-10T07:00:00.000Z');
  expect(john.body.task.deletedAt).toBeNull();
  expect(f.db.select().from(auditLogs).all()).toHaveLength(0);
  await f.request.post('/api/tasks').set('Origin', f.origin).set('Cookie', f.jane).send({ title: 'Jane task' });
  const result = await f.request.get('/api/tasks').set('Cookie', f.john);
  expect(result.body.tasks.map((task: { title: string }) => task.title)).toEqual(['Prepare invoice']);
});

test('validates strict creation payloads and view; defaults to active', async () => {
  for (const body of [{ title: ' ' }, { title: 'a'.repeat(121) }, { title: 'Task', ownerId: 1 }, { title: 'Task', status: 'done' }]) {
    expect((await f.request.post('/api/tasks').set('Origin', f.origin).set('Cookie', f.jane).send(body)).status).toBe(400);
  }
  expect((await f.request.get('/api/tasks?view=unknown').set('Cookie', f.john)).status).toBe(400);
  expect((await f.request.get('/api/tasks?view=deleted').set('Cookie', f.john)).body.tasks).toEqual([]);
});

test('task endpoints require a session; same timestamp tasks are newest ID first', async () => {
  expect((await f.request.get('/api/tasks')).status).toBe(401);
  expect((await f.request.post('/api/tasks').set('Origin', f.origin).send({ title: 'Task' })).status).toBe(401);
  for (const title of ['First', 'Second']) {
    await f.request.post('/api/tasks').set('Origin', f.origin).set('Cookie', f.john).send({ title });
  }
  const result = await f.request.get('/api/tasks').set('Cookie', f.john);
  expect(result.body.tasks.map((task: { title: string }) => task.title)).toEqual(['Second', 'First']);
});
