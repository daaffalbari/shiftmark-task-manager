import { z } from 'zod';

export const taskStatuses = ['to_do', 'pending', 'in_progress', 'done'] as const;
export const taskStatusSchema = z.enum(taskStatuses);
export const createTaskSchema = z.object({ title: z.string().trim().min(1).max(120) }).strict();
export const changeStatusSchema = z.object({ status: taskStatusSchema }).strict();
export const loginSchema = z.object({ email: z.email().trim().toLowerCase(), password: z.string().min(1) }).strict();
export const taskViewSchema = z.enum(['active', 'deleted']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskView = z.infer<typeof taskViewSchema>;
export interface ApiUser { id: number; name: string; email: string }
export interface ApiTask {
  id: number; title: string; status: TaskStatus;
  createdAt: string; updatedAt: string; deletedAt: string | null;
}
export interface ApiAuditLog {
  id: number; taskId: number; actorId: number; actorName: string;
  fromStatus: TaskStatus; toStatus: TaskStatus; createdAt: string;
}
export interface ApiError { error: { code: string; message: string } }
