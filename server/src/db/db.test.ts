import { afterEach, expect, test } from 'bun:test';
import { openDatabase, type DbContext } from './client';
import { migrateDatabase } from './migrate';
import { users, tasks, auditLogs } from './schema';
import { getTeamTask, getTeamTaskAuditLogs } from '../modules/tasks/task.service';

let context: DbContext;
afterEach(() => context?.sqlite.close());

test('committed migrations enforce identity, statuses, references and immutable audit records', () => {
  context = openDatabase(':memory:');
  migrateDatabase(context.db);
  migrateDatabase(context.db);
  const now = new Date();
  const user = context.db.insert(users).values({ name: 'John', email: 'john@test.local', passwordHash: 'hash', createdAt: now }).returning().get();
  expect(() => context.db.insert(users).values({ ...user, id: undefined }).run()).toThrow();
  const task = context.db.insert(tasks).values({ creatorId: user.id, title: 'Invoice', createdAt: now, updatedAt: now }).returning().get();
  expect(task.status).toBe('to_do');
  expect(() => context.sqlite.run("UPDATE tasks SET status = 'invalid'")).toThrow();
  expect(() => context.sqlite.run("INSERT INTO audit_logs (task_id, actor_id, event, created_at) VALUES (999, ?, '{\"type\":\"deleted\",\"title\":\"Invoice\"}', 1)", [user.id])).toThrow();
  expect(() => context.sqlite.run("INSERT INTO audit_logs (task_id, actor_id, event, created_at) VALUES (?, 999, '{\"type\":\"deleted\",\"title\":\"Invoice\"}', 1)", [task.id])).toThrow();
  context.db.insert(auditLogs).values({ taskId: task.id, actorId: user.id, event: { type: 'status_changed', fromStatus: 'to_do', toStatus: 'pending' }, createdAt: now }).run();
  expect(() => context.sqlite.run("UPDATE audit_logs SET event = '{}' ")).toThrow('immutable');
  expect(() => context.sqlite.run('DELETE FROM audit_logs')).toThrow('immutable');
  expect(() => context.sqlite.run('INSERT OR REPLACE INTO audit_logs SELECT * FROM audit_logs')).toThrow('immutable');
  expect(() => context.sqlite.run('DELETE FROM tasks')).toThrow();
  expect(() => context.sqlite.run("INSERT INTO audit_logs (task_id, actor_id, event, created_at) VALUES (?, ?, 'invalid', 1)", [task.id, user.id])).toThrow();
  expect(() => context.db.insert(tasks).values({ creatorId: user.id, assigneeId: 999, title: 'Bad assignee', createdAt: now, updatedAt: now }).run()).toThrow();
  expect(context.db.select().from(auditLogs).all()).toHaveLength(1);
});

test('forward migration preserves legacy tasks and status events without inventing history', async () => {
  context = openDatabase(':memory:');
  for (const name of ['0000_zippy_ma_gnuci.sql', '0001_protect-audit-logs.sql']) {
    context.sqlite.exec(await Bun.file(new URL('../../drizzle/' + name, import.meta.url)).text());
  }
  context.sqlite.exec(`
    INSERT INTO users (id, name, email, password_hash, created_at) VALUES (1, 'John', 'john@test.local', 'hash', 1), (2, 'Jane', 'jane@test.local', 'hash', 1);
    INSERT INTO tasks (id, owner_id, title, status, created_at, updated_at, deleted_at) VALUES (9, 1, 'Legacy task', 'pending', 1000, 2000, 3000);
    INSERT INTO audit_logs (id, task_id, actor_id, from_status, to_status, created_at) VALUES (42, 9, 2, 'to_do', 'pending', 2000);
  `);
  const migration = await Bun.file(new URL('../../drizzle/0002_team-workspace.sql', import.meta.url)).text();
  context.sqlite.transaction(() => context.sqlite.exec(migration))();
  expect(getTeamTask(context.db, 9)).toMatchObject({ title: 'Legacy task', createdBy: { id: 1, name: 'John' }, assignee: null, updatedBy: { id: 2, name: 'Jane' }, description: '', deletedAt: '1970-01-01T00:00:03.000Z' });
  expect(getTeamTaskAuditLogs(context.db, 9)).toEqual([{ id: 42, taskId: 9, actorId: 2, actorName: 'Jane', event: { type: 'status_changed', fromStatus: 'to_do', toStatus: 'pending' }, createdAt: '1970-01-01T00:00:02.000Z' }]);
  expect(context.sqlite.query('PRAGMA foreign_key_check').all()).toEqual([]);
  expect(() => context.sqlite.run('DELETE FROM audit_logs')).toThrow('immutable');
  expect(() => context.sqlite.run('INSERT OR REPLACE INTO audit_logs SELECT * FROM audit_logs')).toThrow('immutable');
});
