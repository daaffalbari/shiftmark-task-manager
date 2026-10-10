import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createFixture } from '../../../test/fixture';

let f: Awaited<ReturnType<typeof createFixture>>;
let id: number;
beforeEach(async () => {
  f = await createFixture();
  id = (await f.request.post('/api/tasks').set('Origin', f.origin).set('Cookie', f.john).send({ title: 'Invoice' })).body.task.id;
  for (const status of ['pending', 'in_progress', 'done']) {
    await f.request.patch('/api/tasks/' + id + '/status').set('Origin', f.origin).set('Cookie', f.john).send({ status });
  }
});
afterEach(() => f.sqlite.close());
const audit = (taskId: number, cookie = f.john) => f.request.get('/api/tasks/' + taskId + '/audit-logs').set('Cookie', cookie);
const remove = (cookie = f.john) => f.request.delete('/api/tasks/' + id).set('Origin', f.origin).set('Cookie', cookie);

test('chronological history includes actor and ISO time; equal timestamps order by id', async () => {
  const result = await audit(id);
  expect(result.status).toBe(200);
  expect(result.body.logs.map((log: { toStatus: string }) => log.toStatus)).toEqual(['pending', 'in_progress', 'done']);
  expect(result.body.logs.map((log: { id: number }) => log.id)).toEqual([1, 2, 3]);
  expect(result.body.logs[0]).toEqual({
    id: 1, taskId: id, actorId: 1, actorName: 'John Doe',
    fromStatus: 'to_do', toStatus: 'pending', createdAt: '2026-10-10T07:00:00.000Z',
  });
});

test('hides foreign and missing audit history and forbids foreign deletion', async () => {
  expect((await audit(id, f.jane)).status).toBe(404);
  expect((await audit(999)).status).toBe(404);
  expect((await remove(f.jane)).status).toBe(404);
  expect((await audit(id)).body.logs).toHaveLength(3);
});

test('deleted tasks are read-only and retain immutable history', async () => {
  expect((await remove()).status).toBe(204);
  expect((await f.request.get('/api/tasks').set('Cookie', f.john)).body.tasks).toEqual([]);
  const deleted = (await f.request.get('/api/tasks?view=deleted').set('Cookie', f.john)).body.tasks;
  expect(deleted).toHaveLength(1);
  expect(deleted[0].deletedAt).toBe('2026-10-10T07:00:00.000Z');
  expect((await audit(id)).body.logs).toHaveLength(3);
  expect((await remove()).status).toBe(404);
  expect((await f.request.patch('/api/tasks/' + id + '/status').set('Origin', f.origin).set('Cookie', f.john).send({ status: 'done' })).status).toBe(404);
  expect(() => f.sqlite.run('UPDATE audit_logs SET actor_id = 2')).toThrow('immutable');
  expect(() => f.sqlite.run('DELETE FROM audit_logs')).toThrow('immutable');
});
