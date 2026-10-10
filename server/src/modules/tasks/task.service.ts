import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import type { ApiTask, TaskStatus, TaskView } from '@shiftmark/contracts';
import type { Db } from '../../db/client';
import { auditLogs, tasks } from '../../db/schema';
import { ApiFailure } from '../../domain/api-error';
import { evaluateTransition } from '../../domain/task-status';

function toApiTask(task: typeof tasks.$inferSelect): ApiTask {
  return {
    id: task.id, title: task.title, status: task.status,
    createdAt: task.createdAt.toISOString(), updatedAt: task.updatedAt.toISOString(),
    deletedAt: task.deletedAt?.toISOString() ?? null,
  };
}

export function listOwnedTasks(db: Db, ownerId: number, view: TaskView): ApiTask[] {
  return db.select().from(tasks)
    .where(and(eq(tasks.ownerId, ownerId), view === 'deleted' ? isNotNull(tasks.deletedAt) : isNull(tasks.deletedAt)))
    .orderBy(desc(view === 'deleted' ? tasks.deletedAt : tasks.updatedAt), desc(tasks.id)).all().map(toApiTask);
}

export function createOwnedTask(db: Db, ownerId: number, title: string, now: Date): ApiTask {
  return toApiTask(db.insert(tasks).values({ ownerId, title, createdAt: now, updatedAt: now }).returning().get());
}

export function changeOwnedTaskStatus(db: Db, ownerId: number, taskId: number, requested: TaskStatus, now: Date) {
  return db.transaction((tx) => {
    const task = tx.select().from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.ownerId, ownerId), isNull(tasks.deletedAt))).get();
    if (!task) throw new ApiFailure(404, 'TASK_NOT_FOUND', 'Task not found.');
    const transition = evaluateTransition(task.status, requested);
    if (transition === 'invalid') throw new ApiFailure(409, 'INVALID_TRANSITION', 'Tasks must move forward one step at a time.');
    if (transition === 'no_change') return { task: toApiTask(task), changed: false };
    const updated = tx.update(tasks).set({ status: requested, updatedAt: now }).where(eq(tasks.id, taskId)).returning().get();
    tx.insert(auditLogs).values({
      taskId, actorId: ownerId, fromStatus: task.status, toStatus: requested, createdAt: now,
    }).run();
    return { task: toApiTask(updated), changed: true };
  }, { behavior: 'immediate' });
}
