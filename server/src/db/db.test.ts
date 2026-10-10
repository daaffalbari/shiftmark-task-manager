import { afterEach, expect, test } from 'bun:test';
import { openDatabase, type DbContext } from './client';
import { migrateDatabase } from './migrate';
import { users, tasks, auditLogs } from './schema';

let context: DbContext;
afterEach(() => context?.sqlite.close());

test('committed migrations enforce identity, statuses, references and immutable audit records', () => {
  context = openDatabase(':memory:');
  migrateDatabase(context.db);
  migrateDatabase(context.db);
  const now = new Date();
  const user = context.db.insert(users).values({ name: 'John', email: 'john@test.local', passwordHash: 'hash', createdAt: now }).returning().get();
  expect(() => context.db.insert(users).values({ ...user, id: undefined }).run()).toThrow();
  const task = context.db.insert(tasks).values({ ownerId: user.id, title: 'Invoice', createdAt: now, updatedAt: now }).returning().get();
  expect(task.status).toBe('to_do');
  expect(() => context.sqlite.run("UPDATE tasks SET status = 'invalid'")).toThrow();
  expect(() => context.sqlite.run("INSERT INTO audit_logs (task_id, actor_id, from_status, to_status, created_at) VALUES (999, ?, 'to_do', 'pending', 1)", [user.id])).toThrow();
  expect(() => context.sqlite.run("INSERT INTO audit_logs (task_id, actor_id, from_status, to_status, created_at) VALUES (?, 999, 'to_do', 'pending', 1)", [task.id])).toThrow();
  context.db.insert(auditLogs).values({ taskId: task.id, actorId: user.id, fromStatus: 'to_do', toStatus: 'pending', createdAt: now }).run();
  expect(() => context.sqlite.run("UPDATE audit_logs SET to_status = 'done'")).toThrow('immutable');
  expect(() => context.sqlite.run('DELETE FROM audit_logs')).toThrow('immutable');
  expect(() => context.sqlite.run('INSERT OR REPLACE INTO audit_logs SELECT * FROM audit_logs')).toThrow('immutable');
  expect(() => context.sqlite.run('DELETE FROM tasks')).toThrow();
  expect(() => context.sqlite.run("UPDATE audit_logs SET from_status = 'invalid'")).toThrow();
  expect(context.db.select().from(auditLogs).all()).toHaveLength(1);
});
