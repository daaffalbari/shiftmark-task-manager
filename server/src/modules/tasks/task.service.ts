import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import type { ApiTask, TaskView } from '@shiftmark/contracts';
import type { Db } from '../../db/client';
import { tasks } from '../../db/schema';

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
