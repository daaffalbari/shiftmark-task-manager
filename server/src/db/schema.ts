import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { taskStatuses, type AuditEvent } from '@shiftmark/contracts';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('sessions_user_idx').on(table.userId)]);

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  creatorId: integer('owner_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  assigneeId: integer('assignee_id').references(() => users.id),
  updatedById: integer('updated_by_id').references(() => users.id),
  version: integer('version').notNull().default(1),
  status: text('status', { enum: taskStatuses }).notNull().default('to_do'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
}, (table) => [
  index('tasks_deleted_updated_idx').on(table.deletedAt, table.updatedAt),
  check('tasks_status_check', sql`${table.status} IN ('to_do', 'pending', 'in_progress', 'done')`),
]);

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id').notNull().references(() => tasks.id, { onDelete: 'restrict' }),
  actorId: integer('actor_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  event: text('event', { mode: 'json' }).$type<AuditEvent>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [
  index('audit_task_time_id_idx').on(table.taskId, table.createdAt, table.id),
  check('audit_event_check', sql`json_valid("event") AND json_extract("event", '$.type') IN ('created', 'updated', 'status_changed', 'deleted')`),
]);
