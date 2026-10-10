import { z } from 'zod';

export const taskStatuses = ['to_do', 'pending', 'in_progress', 'done'] as const;
export const taskStatusSchema = z.enum(taskStatuses);
const taskFields = {
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000),
  assigneeId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable(),
};
const actorIdSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const createTaskSchema = z.object({ ...taskFields, actorId: actorIdSchema, description: taskFields.description.default(''), assigneeId: taskFields.assigneeId.default(null) }).strict();
export const editTaskSchema = z.object({ ...taskFields, actorId: actorIdSchema, version: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) }).strict();
export const changeStatusSchema = z.object({ status: taskStatusSchema, actorId: actorIdSchema }).strict();
export const deleteTaskSchema = z.object({ actorId: actorIdSchema }).strict();
export const taskViewSchema = z.enum(['active', 'deleted']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskView = z.infer<typeof taskViewSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type EditTaskInput = z.infer<typeof editTaskSchema>;
export interface ApiMember { id: number; name: string }
export interface ApiTask {
  id: number; title: string; description: string; status: TaskStatus; version: number;
  createdBy: ApiMember; assignee: ApiMember | null; updatedBy: ApiMember;
  createdAt: string; updatedAt: string; deletedAt: string | null;
}
export type TaskFieldChange =
  | { field: 'title' | 'description'; from: string; to: string }
  | { field: 'assignee'; from: ApiMember | null; to: ApiMember | null };
export type AuditEvent =
  | { type: 'created'; title: string; description: string; assignee: ApiMember | null }
  | { type: 'updated'; changes: TaskFieldChange[] }
  | { type: 'status_changed'; fromStatus: TaskStatus; toStatus: TaskStatus }
  | { type: 'deleted'; title: string };
export interface ApiAuditLog {
  id: number; taskId: number; actorId: number; actorName: string;
  event: AuditEvent; createdAt: string;
}
export interface ApiError { error: { code: string; message: string } }
