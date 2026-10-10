import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createFixture } from '../../../test/fixture';

let f: Awaited<ReturnType<typeof createFixture>>;
let id: number;
beforeEach(async () => {
  f = await createFixture();
  id = (await f.request.post('/api/tasks').set('Origin', f.origin).send({ title: 'Invoice', actorId: f.john })).body.task.id;
  for (const status of ['pending', 'in_progress', 'done']) {
    await f.request.patch('/api/tasks/' + id + '/status').set('Origin', f.origin).send({ status, actorId: f.john });
  }
});
afterEach(() => f.sqlite.close());
const audit = (taskId: number) => f.request.get('/api/tasks/' + taskId + '/audit-logs');
const remove = (actorId = f.john) => f.request.delete('/api/tasks/' + id).set('Origin', f.origin).send({ actorId });

test('chronological history includes actor and ISO time; equal timestamps order by id', async () => {
  const result = await audit(id);
  expect(result.status).toBe(200);
  expect(result.body.logs.slice(1).map((log: { event: { toStatus: string } }) => log.event.toStatus)).toEqual(['pending', 'in_progress', 'done']);
  expect(result.body.logs.map((log: { id: number }) => log.id)).toEqual([1, 2, 3, 4]);
  expect(result.body.logs[1]).toEqual({
    id: 2, taskId: id, actorId: 1, actorName: 'John Doe',
    event: { type: 'status_changed', fromStatus: 'to_do', toStatus: 'pending' }, createdAt: '2026-10-10T07:00:00.000Z',
  });
});

test('shares history and deletion with teammates and returns 404 for missing tasks', async () => {
  expect((await audit(id)).status).toBe(200);
  expect((await audit(999)).status).toBe(404);
  expect((await remove(f.jane)).status).toBe(204);
  expect((await audit(id)).body.logs).toHaveLength(5);
});

test('deleted tasks are read-only and retain immutable history', async () => {
  expect((await remove()).status).toBe(204);
  expect((await f.request.get('/api/tasks')).body.tasks).toEqual([]);
  const deleted = (await f.request.get('/api/tasks?view=deleted')).body.tasks;
  expect(deleted).toHaveLength(1);
  expect(deleted[0].deletedAt).toBe('2026-10-10T07:00:00.000Z');
  expect((await audit(id)).body.logs).toHaveLength(5);
  expect((await remove()).status).toBe(404);
  expect((await f.request.patch('/api/tasks/' + id + '/status').set('Origin', f.origin).send({ status: 'done', actorId: f.john })).status).toBe(404);
  expect(() => f.sqlite.run('UPDATE audit_logs SET actor_id = 2')).toThrow('immutable');
  expect(() => f.sqlite.run('DELETE FROM audit_logs')).toThrow('immutable');
});
