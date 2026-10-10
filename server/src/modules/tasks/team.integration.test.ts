import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createFixture } from '../../../test/fixture';
import { auditLogs, tasks } from '../../db/schema';

let f: Awaited<ReturnType<typeof createFixture>>;
beforeEach(async () => { f = await createFixture(); });
afterEach(() => f.sqlite.close());
const create = (body: object = { title: 'Invoice' }) => f.request.post('/api/tasks').set('Origin', f.origin).set('Cookie', f.john).send(body);
const edit = (id: number, body: object, cookie = f.jane) => f.request.patch('/api/tasks/' + id).set('Origin', f.origin).set('Cookie', cookie).send(body);

test('team members share tasks and directory without exposing authentication data', async () => {
  const members = await f.request.get('/api/members').set('Cookie', f.jane);
  expect(members.status).toBe(200);
  expect(members.body.members).toEqual([{ id: 2, name: 'Jane Doe' }, { id: 1, name: 'John Doe' }]);
  const created = await create({ title: '  Invoice  ', description: '  Check totals  ', assigneeId: 2 });
  expect(created.status).toBe(201);
  expect(created.body.task).toMatchObject({ title: 'Invoice', description: 'Check totals', createdBy: { id: 1, name: 'John Doe' }, assignee: { id: 2, name: 'Jane Doe' }, updatedBy: { id: 1, name: 'John Doe' }, version: 1 });
  const id = created.body.task.id;
  expect((await f.request.get('/api/tasks').set('Cookie', f.jane)).body.tasks).toEqual([created.body.task]);
  expect((await f.request.get('/api/tasks/' + id).set('Cookie', f.jane)).body.task).toEqual(created.body.task);
  const history = await f.request.get('/api/tasks/' + id + '/audit-logs').set('Cookie', f.jane);
  expect(history.body.logs[0]).toMatchObject({ actorId: 1, actorName: 'John Doe', event: { type: 'created', title: 'Invoice', description: 'Check totals', assignee: { id: 2, name: 'Jane Doe' } } });
});

test('edits record exact before/after values and the session actor independently of creator and assignee', async () => {
  const original = (await create({ title: 'Invoice', description: 'Draft', assigneeId: 1 })).body.task;
  const result = await edit(original.id, { title: 'Final invoice', description: 'Approved', assigneeId: 2, version: original.version });
  expect(result.status).toBe(200);
  expect(result.body.changed).toBe(true);
  expect(result.body.task).toMatchObject({ title: 'Final invoice', description: 'Approved', createdBy: { id: 1, name: 'John Doe' }, assignee: { id: 2, name: 'Jane Doe' }, updatedBy: { id: 2, name: 'Jane Doe' }, version: 2 });
  const logs = (await f.request.get('/api/tasks/' + original.id + '/audit-logs').set('Cookie', f.john)).body.logs;
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
  expect((await f.request.get('/api/tasks/' + original.id).set('Cookie', f.john)).body.task.title).toBe('Jane edited this');
  expect(f.db.select().from(auditLogs).all()).toHaveLength(2);
});

test('strict schemas reject forged identities, invalid members, oversized descriptions and invalid versions', async () => {
  for (const body of [{ title: 'Task', actorId: 2 }, { title: 'Task', createdById: 2 }, { title: 'Task', assigneeId: 999 }, { title: 'Task', description: 'x'.repeat(2001) }]) {
    expect((await create(body)).status).toBe(400);
  }
  const { id } = (await create()).body.task;
  const body = { title: 'Task', description: '', assigneeId: null, version: 1 };
  for (const payload of [{ ...body, actorId: 1 }, { ...body, assigneeId: 999 }, { ...body, version: 0 }, { ...body, status: 'done' }, { ...body, title: ' ' }]) {
    expect((await edit(id, payload)).status).toBe(400);
  }
  expect(f.db.select().from(auditLogs).all()).toHaveLength(1);
  expect((await edit(999, body)).status).toBe(404);
});

test('shared workspace endpoints still require a session', async () => {
  const { id } = (await create()).body.task;
  for (const path of ['/api/members', '/api/tasks', '/api/tasks/' + id, '/api/tasks/' + id + '/audit-logs']) {
    expect((await f.request.get(path)).status).toBe(401);
  }
  expect((await f.request.patch('/api/tasks/' + id).set('Origin', f.origin).send({ title: 'Task', description: '', assigneeId: null, version: 1 })).status).toBe(401);
});

test('a teammate can delete and both members retain complete read-only history', async () => {
  const { id } = (await create()).body.task;
  expect((await f.request.delete('/api/tasks/' + id).set('Origin', f.origin).set('Cookie', f.jane)).status).toBe(204);
  for (const cookie of [f.john, f.jane]) {
    expect((await f.request.get('/api/tasks').set('Cookie', cookie)).body.tasks).toEqual([]);
    const deleted = (await f.request.get('/api/tasks?view=deleted').set('Cookie', cookie)).body.tasks;
    expect(deleted[0]).toMatchObject({ updatedBy: { id: 2, name: 'Jane Doe' }, deletedAt: '2026-10-10T07:00:00.000Z', version: 2 });
    const logs = (await f.request.get('/api/tasks/' + id + '/audit-logs').set('Cookie', cookie)).body.logs;
    expect(logs.at(-1)).toMatchObject({ actorId: 2, event: { type: 'deleted', title: 'Invoice' } });
  }
  expect((await edit(id, { title: 'Changed', description: '', assigneeId: null, version: 2 })).status).toBe(404);
});

for (const operation of ['create', 'edit', 'delete'] as const) {
  test(`failed ${operation} audit insert rolls back the entire mutation`, async () => {
    const original = operation === 'create' ? null : (await create()).body.task;
    f.sqlite.exec("CREATE TRIGGER test_fail_audit BEFORE INSERT ON audit_logs BEGIN SELECT RAISE(ABORT, 'test audit failure'); END;");
    const result = operation === 'create' ? await create() : operation === 'edit'
      ? await edit(original.id, { title: 'Changed', description: 'New', assigneeId: 2, version: 1 })
      : await f.request.delete('/api/tasks/' + original.id).set('Origin', f.origin).set('Cookie', f.jane);
    expect(result.status).toBe(500);
    expect(f.db.select().from(auditLogs).all()).toHaveLength(original ? 1 : 0);
    if (original) {
      expect((await f.request.get('/api/tasks/' + original.id).set('Cookie', f.john)).body.task).toEqual(original);
    } else expect(f.db.select().from(tasks).all()).toHaveLength(0);
  });
}
