import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createFixture } from '../../../test/fixture';
import { auditLogs, tasks } from '../../db/schema';

let f: Awaited<ReturnType<typeof createFixture>>;
let id: number;
beforeEach(async () => {
  f = await createFixture();
  const result = await f.request.post('/api/tasks').set('Origin', f.origin).set('Cookie', f.john).send({ title: 'Invoice' });
  id = result.body.task.id;
});
afterEach(() => f.sqlite.close());
const patch = (status: string, cookie?: string) => f.request.patch('/api/tasks/' + id + '/status').set('Origin', f.origin).set('Cookie', cookie ?? f.john).send({ status });

test('adjacent changes are logged once; same status preserves timestamp and history', async () => {
  const first = await patch('pending', f.jane);
  expect(first.status).toBe(200);
  expect(first.body.changed).toBe(true);
  const duplicate = await patch('pending');
  expect(duplicate.body).toEqual({ task: first.body.task, changed: false });
  const logs = f.db.select().from(auditLogs).all();
  expect(logs).toHaveLength(2);
  expect(logs[1]).toMatchObject({ actorId: 2, event: { type: 'status_changed', fromStatus: 'to_do', toStatus: 'pending' } });
  expect(first.body.task.createdBy.id).toBe(1);
  expect(first.body.task.updatedBy.id).toBe(2);
});

test('skips, backwards moves, unknown statuses, forged actors and missing tasks are rejected', async () => {
  expect((await patch('done')).status).toBe(409);
  expect((await patch('unknown')).status).toBe(400);
  expect((await f.request.patch('/api/tasks/999/status').set('Origin', f.origin).set('Cookie', f.jane).send({ status: 'pending' })).status).toBe(404);
  expect((await f.request.patch('/api/tasks/' + id + '/status').set('Origin', f.origin).set('Cookie', f.jane).send({ status: 'pending', actorId: 1 })).status).toBe(400);
  await patch('pending');
  expect((await patch('to_do')).status).toBe(409);
  expect((await patch('done')).body.error.code).toBe('INVALID_TRANSITION');
  expect(f.db.select().from(tasks).get()!.status).toBe('pending');
  expect(f.db.select().from(auditLogs).all()).toHaveLength(2);
});

test('duplicate requests are idempotent', async () => {
  const results = await Promise.all([patch('pending'), patch('pending', f.jane)]);
  expect(results.map((result) => result.status)).toEqual([200, 200]);
  expect(results.map((result) => result.body.changed).sort()).toEqual([false, true]);
  expect(f.db.select().from(auditLogs).all()).toHaveLength(2);
});

test('failure to insert audit rolls back the task update', async () => {
  f.sqlite.exec("CREATE TRIGGER test_fail_audit BEFORE INSERT ON audit_logs BEGIN SELECT RAISE(ABORT, 'test audit failure'); END;");
  expect((await patch('pending')).status).toBe(500);
  expect(f.db.select().from(tasks).get()!.status).toBe('to_do');
  expect(f.db.select().from(auditLogs).all()).toHaveLength(1);
});
