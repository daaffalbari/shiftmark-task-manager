import { and, asc, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import type { ApiAuditLog, ApiMember, ApiTask, CreateTaskInput, EditTaskInput, TaskFieldChange, TaskStatus, TaskView } from '@shiftmark/contracts';
import type { Db } from '../../db/client';
import { auditLogs, tasks, users } from '../../db/schema';
import { ApiFailure } from '../../domain/api-error';
import { evaluateTransition } from '../../domain/task-status';

type ReadDb = Pick<Db, 'select'>;
const creator = alias(users, 'creator');
const assignee = alias(users, 'assignee');
const editor = alias(users, 'editor');

function taskQuery(db: ReadDb) {
  return db.select({ task: tasks, createdBy: { id: creator.id, name: creator.name }, assignee: { id: assignee.id, name: assignee.name }, updatedBy: { id: editor.id, name: editor.name } }).from(tasks)
    .innerJoin(creator, eq(tasks.creatorId, creator.id))
    .leftJoin(assignee, eq(tasks.assigneeId, assignee.id))
    .leftJoin(editor, eq(tasks.updatedById, editor.id));
}

function toApiTask(task: typeof tasks.$inferSelect, createdBy: ApiMember, assignee: ApiMember | null, updatedBy: ApiMember | null): ApiTask {
  return {
    id: task.id, title: task.title, description: task.description, status: task.status, version: task.version,
    createdBy, assignee, updatedBy: updatedBy ?? createdBy,
    createdAt: task.createdAt.toISOString(), updatedAt: task.updatedAt.toISOString(),
    deletedAt: task.deletedAt?.toISOString() ?? null,
  };
}

export function getTeamTask(db: ReadDb, taskId: number): ApiTask {
  const row = taskQuery(db).where(eq(tasks.id, taskId)).get();
  if (!row) throw new ApiFailure(404, 'TASK_NOT_FOUND', 'Task not found.');
  return toApiTask(row.task, row.createdBy, row.assignee, row.updatedBy);
}

function activeTask(db: ReadDb, taskId: number) {
  const task = db.select().from(tasks).where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt))).get();
  if (!task) throw new ApiFailure(404, 'TASK_NOT_FOUND', 'Task not found.');
  return task;
}

function getAssignee(db: ReadDb, id: number | null): ApiMember | null {
  if (id === null) return null;
  const member = db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, id)).get();
  if (!member) throw new ApiFailure(400, 'INVALID_ASSIGNEE', 'Choose a team member.');
  return member;
}

export function listTeamTasks(db: Db, view: TaskView): ApiTask[] {
  return taskQuery(db).where(view === 'deleted' ? isNotNull(tasks.deletedAt) : isNull(tasks.deletedAt))
    .orderBy(desc(view === 'deleted' ? tasks.deletedAt : tasks.updatedAt), desc(tasks.id)).all()
    .map((row) => toApiTask(row.task, row.createdBy, row.assignee, row.updatedBy));
}

export function createTeamTask(db: Db, actorId: number, input: CreateTaskInput, now: Date): ApiTask {
  return db.transaction((tx) => {
    const assignee = getAssignee(tx, input.assigneeId);
    const task = tx.insert(tasks).values({ ...input, creatorId: actorId, updatedById: actorId, createdAt: now, updatedAt: now }).returning().get();
    tx.insert(auditLogs).values({ taskId: task.id, actorId, event: { type: 'created', title: task.title, description: task.description, assignee }, createdAt: now }).run();
    return getTeamTask(tx, task.id);
  }, { behavior: 'immediate' });
}

export function editTeamTask(db: Db, actorId: number, taskId: number, input: EditTaskInput, now: Date) {
  return db.transaction((tx) => {
    const task = activeTask(tx, taskId);
    if (task.version !== input.version) throw new ApiFailure(409, 'TASK_CHANGED', 'This task changed since you opened it. Reload before saving.');
    const assignee = getAssignee(tx, input.assigneeId);
    const changes: TaskFieldChange[] = [];
    for (const field of ['title', 'description'] as const) {
      if (task[field] !== input[field]) changes.push({ field, from: task[field], to: input[field] });
    }
    if (task.assigneeId !== input.assigneeId) changes.push({ field: 'assignee', from: getAssignee(tx, task.assigneeId), to: assignee });
    if (!changes.length) return { task: getTeamTask(tx, taskId), changed: false };
    tx.update(tasks).set({ title: input.title, description: input.description, assigneeId: input.assigneeId, updatedById: actorId, updatedAt: now, version: task.version + 1 }).where(eq(tasks.id, taskId)).run();
    tx.insert(auditLogs).values({ taskId, actorId, event: { type: 'updated', changes }, createdAt: now }).run();
    return { task: getTeamTask(tx, taskId), changed: true };
  }, { behavior: 'immediate' });
}

export function changeTeamTaskStatus(db: Db, actorId: number, taskId: number, requested: TaskStatus, now: Date) {
  return db.transaction((tx) => {
    const task = activeTask(tx, taskId);
    const transition = evaluateTransition(task.status, requested);
    if (transition === 'invalid') throw new ApiFailure(409, 'INVALID_TRANSITION', 'Tasks must move forward one step at a time.');
    if (transition === 'no_change') return { task: getTeamTask(tx, taskId), changed: false };
    tx.update(tasks).set({ status: requested, updatedById: actorId, updatedAt: now, version: task.version + 1 }).where(eq(tasks.id, taskId)).run();
    tx.insert(auditLogs).values({ taskId, actorId, event: { type: 'status_changed', fromStatus: task.status, toStatus: requested }, createdAt: now }).run();
    return { task: getTeamTask(tx, taskId), changed: true };
  }, { behavior: 'immediate' });
}

export function softDeleteTeamTask(db: Db, actorId: number, taskId: number, now: Date): void {
  db.transaction((tx) => {
    const task = activeTask(tx, taskId);
    tx.update(tasks).set({ deletedAt: now, updatedAt: now, updatedById: actorId, version: task.version + 1 }).where(eq(tasks.id, taskId)).run();
    tx.insert(auditLogs).values({ taskId, actorId, event: { type: 'deleted', title: task.title }, createdAt: now }).run();
  }, { behavior: 'immediate' });
}

export function getTeamTaskAuditLogs(db: Db, taskId: number): ApiAuditLog[] {
  getTeamTask(db, taskId);
  return db.select({ id: auditLogs.id, taskId: auditLogs.taskId, actorId: auditLogs.actorId, actorName: users.name, event: auditLogs.event, createdAt: auditLogs.createdAt })
    .from(auditLogs).innerJoin(users, eq(auditLogs.actorId, users.id))
    .where(eq(auditLogs.taskId, taskId)).orderBy(asc(auditLogs.createdAt), asc(auditLogs.id)).all()
    .map((log) => ({ ...log, createdAt: log.createdAt.toISOString() }));
}
