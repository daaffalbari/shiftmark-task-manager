import type { ApiTask, ApiAuditLog, TaskStatus, TaskView } from '@shiftmark/contracts';
import { apiFetch } from '../../api/http';

export const listTasks = async (view: TaskView) => (await apiFetch<{ tasks: ApiTask[] }>('/tasks?view=' + view)).tasks;
export const createTask = async (title: string) => (await apiFetch<{ task: ApiTask }>('/tasks', { method: 'POST', body: JSON.stringify({ title }) })).task;
export const changeStatus = (id: number, status: TaskStatus) => apiFetch<{ task: ApiTask; changed: boolean }>('/tasks/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status }) });
export const deleteTask = (id: number) => apiFetch<void>('/tasks/' + id, { method: 'DELETE' });
export const getAuditLogs = async (id: number) => (await apiFetch<{ logs: ApiAuditLog[] }>('/tasks/' + id + '/audit-logs')).logs;
