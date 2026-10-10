import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createFixture } from '../../../test/fixture';
import { auditLogs, tasks } from '../../db/schema';

let f: Awaited<ReturnType<typeof createFixture>>;
beforeEach(async () => { f = await createFixture(); });
afterEach(() => f.sqlite.close());
const create = (body: object = { title: 'Invoice' }) => f.request.post('/api/tasks').set('Origin', f.origin).send({ actorId: f.john, ...body });
const edit = (id: number, body: object, actorId = f.jane) => f.request.patch('/api/tasks/' + id).set('Origin', f.origin).send({ actorId, ...body });

test('team members share tasks and directory without exposing legacy password fields', async () => {
  const members = await f.request.get('/api/members');
  expect(members.status).toBe(200);
  expect(members.body.members).toEqual([{ id: 2, name: 'Jane Doe' }, { id: 1, name: 'John Doe' }]);
  const created = await create({ title: '  Invoice  ', description: '  Check totals  ', assigneeId: 2 });
  expect(created.status).toBe(201);
  expect(created.body.task).toMatchObject({ title: 'Invoice', description: 'Check totals', createdBy: { id: 1, name: 'John Doe' }, assignee: { id: 2, name: 'Jane Doe' }, updatedBy: { id: 1, name: 'John Doe' }, version: 1 });
  const id = created.body.task.id;
  expect((await f.request.get('/api/tasks')).body.tasks).toEqual([created.body.task]);
  expect((await f.request.get('/api/tasks/' + id)).body.task).toEqual(created.body.task);
  const history = await f.request.get('/api/tasks/' + id + '/audit-logs');
  expect(history.body.logs[0]).toMatchObject({ actorId: 1, actorName: 'John Doe', event: { type: 'created', title: 'Invoice', description: 'Check totals', assignee: { id: 2, name: 'Jane Doe' } } });
});

test('edits record exact before/after values and the selected actor independently of creator and assignee', async () => {
  const original = (await create({ title: 'Invoice', description: 'Draft', assigneeId: 1 })).body.task;
  const result = await edit(original.id, { title: 'Final invoice', description: 'Approved', assigneeId: 2, version: original.version });
  expect(result.status).toBe(200);
  expect(result.body.changed).toBe(true);
  expect(result.body.task).toMatchObject({ title: 'Final invoice', description: 'Approved', createdBy: { id: 1, name: 'John Doe' }, assignee: { id: 2, name: 'Jane Doe' }, updatedBy: { id: 2, name: 'Jane Doe' }, version: 2 });
  const logs = (await f.request.get('/api/tasks/' + original.id + '/audit-logs')).body.logs;
  expect(logs).toHaveLength(2);
  expect(logs[1]).toMatchObject({ actorId: 2, actorName: 'Jane Doe', event: { type: 'updated', changes: [
    { field: 'title', from: 'Invoice', to: 'Final invoice' },
    { field: 'description', from: 'Draft', to: 'Approved' },
    { field: 'assignee', from: { id: 1, name: 'John Doe' }, to: { id: 2, name: 'Jane Doe' } },
  ] } });
  const unassigned = await edit(original.id, { title: 'Final invoice', description: 'Approved', assigneeId: null, version: 2 }, f.john);
  expect(unassigned.body.task.assignee).toBeNull();
  expect(f.db.select().from(auditLogs).all().at(-1)?.event).toEqual({ type: 'updated', changes: [{ field: 'assignee', from: { id: 2, name: 'Jane Doe' }, to: null }] });
});

test('no-op edits preserve task and history; stale drafts cannot overwrite a teammate', async () => {
  const original = (await create()).body.task;
  const body = { title: 'Invoice', description: '', assigneeId: null, version: 1 };
  const unchanged = await edit(original.id, body);
  expect(unchanged.body).toEqual({ task: original, changed: false });
  const changed = await edit(original.id, { ...body, title: 'Jane edited this' });
  expect(changed.status).toBe(200);
  const stale = await edit(original.id, { ...body, title: 'Stale John draft' }, f.john);
  expect(stale.status).toBe(409);
  expect(stale.body.error.code).toBe('TASK_CHANGED');
  expect((await f.request.get('/api/tasks/' + original.id)).body.task.title).toBe('Jane edited this');
  expect(f.db.select().from(auditLogs).all()).toHaveLength(2);
});

test('strict schemas reject unknown actors and supplied creators, invalid members, oversized descriptions and invalid versions', async () => {
  for (const body of [{ title: 'Task', actorId: 999 }, { title: 'Task', createdById: 2 }, { title: 'Task', assigneeId: 999 }, { title: 'Task', description: 'x'.repeat(2001) }]) {
    expect((await create(body)).status).toBe(400);
  }
  const { id } = (await create()).body.task;
  const body = { title: 'Task', description: '', assigneeId: null, version: 1 };
  for (const payload of [{ ...body, actorId: 999 }, { ...body, assigneeId: 999 }, { ...body, version: 0 }, { ...body, status: 'done' }, { ...body, title: ' ' }]) {
    expect((await edit(id, payload)).status).toBe(400);
  }
  expect(f.db.select().from(auditLogs).all()).toHaveLength(1);
  expect((await edit(999, body)).status).toBe(404);
});

test('reads need no login and every mutation rejects missing or unknown actors without changing data', async () => {
  const original = (await create()).body.task;
  const id = original.id;
  for (const path of ['/api/members', '/api/tasks', '/api/tasks/' + id, '/api/tasks/' + id + '/audit-logs']) {
    expect((await f.request.get(path)).status).toBe(200);
  }
  for (const actorId of [undefined, 999, '2', 0]) {
    expect((await f.request.post('/api/tasks').set('Origin', f.origin).send({ title: 'Task', actorId })).status).toBe(400);
    expect((await f.request.patch('/api/tasks/' + id).set('Origin', f.origin).send({ title: 'Task', description: '', assigneeId: null, version: 1, actorId })).status).toBe(400);
    expect((await f.request.patch('/api/tasks/' + id + '/status').set('Origin', f.origin).send({ status: 'pending', actorId })).status).toBe(400);
    expect((await f.request.delete('/api/tasks/' + id).set('Origin', f.origin).send({ actorId })).status).toBe(400);
  }
  expect((await f.request.get('/api/tasks/' + id)).body.task).toEqual(original);
  expect(f.db.select().from(auditLogs).all()).toHaveLength(1);
});

test('predefined actor seeding is idempotent and unsafe requests still require the configured origin', async () => {
  const { seedDemoUsers } = await import('../../db/seed');
  seedDemoUsers(f.db);
  expect((await f.request.get('/api/members')).body.members).toHaveLength(2);
  for (const origin of [undefined, 'https://other.example']) {
    const request = f.request.post('/api/tasks');
    if (origin) request.set('Origin', origin);
    expect((await request.send({ title: 'Task', actorId: f.john })).status).toBe(403);
  }
  expect(f.db.select().from(tasks).all()).toHaveLength(0);
});

test('selected actor deletion retains complete shared read-only history', async () => {
  const { id } = (await create()).body.task;
  expect((await f.request.delete('/api/tasks/' + id).set('Origin', f.origin).send({ actorId: f.jane })).status).toBe(204);
  expect((await f.request.get('/api/tasks')).body.tasks).toEqual([]);
  const deleted = (await f.request.get('/api/tasks?view=deleted')).body.tasks;
  expect(deleted[0]).toMatchObject({ updatedBy: { id: 2, name: 'Jane Doe' }, deletedAt: '2026-10-10T07:00:00.000Z', version: 2 });
  const logs = (await f.request.get('/api/tasks/' + id + '/audit-logs')).body.logs;
  expect(logs.at(-1)).toMatchObject({ actorId: 2, event: { type: 'deleted', title: 'Invoice' } });
  expect((await edit(id, { title: 'Changed', description: '', assigneeId: null, version: 2 })).status).toBe(404);
});

for (const operation of ['create', 'edit', 'delete'] as const) {
  test(`failed ${operation} audit insert rolls back the entire mutation`, async () => {
    const original = operation === 'create' ? null : (await create()).body.task;
    f.sqlite.exec("CREATE TRIGGER test_fail_audit BEFORE INSERT ON audit_logs BEGIN SELECT RAISE(ABORT, 'test audit failure'); END;");
    const result = operation === 'create' ? await create() : operation === 'edit'
      ? await edit(original.id, { title: 'Changed', description: 'New', assigneeId: 2, version: 1 })
      : await f.request.delete('/api/tasks/' + original.id).set('Origin', f.origin).send({ actorId: f.jane });
    expect(result.status).toBe(500);
    expect(f.db.select().from(auditLogs).all()).toHaveLength(original ? 1 : 0);
    if (original) {
      expect((await f.request.get('/api/tasks/' + original.id)).body.task).toEqual(original);
    } else expect(f.db.select().from(tasks).all()).toHaveLength(0);
  });
}
