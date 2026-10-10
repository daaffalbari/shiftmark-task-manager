import type { ApiTask, ApiAuditLog, ApiMember, CreateTaskInput, EditTaskInput, TaskStatus, TaskView } from '@shiftmark/contracts';
import { apiFetch } from '../../api/http';

export const listTasks = async (view: TaskView) => (await apiFetch<{ tasks: ApiTask[] }>('/tasks?view=' + view)).tasks;
export const getTask = async (id: number) => (await apiFetch<{ task: ApiTask }>('/tasks/' + id)).task;
export const listMembers = async () => (await apiFetch<{ members: ApiMember[] }>('/members')).members;
export const createTask = async (input: CreateTaskInput) => (await apiFetch<{ task: ApiTask }>('/tasks', { method: 'POST', body: JSON.stringify(input) })).task;
export const editTask = (id: number, input: EditTaskInput) => apiFetch<{ task: ApiTask; changed: boolean }>('/tasks/' + id, { method: 'PATCH', body: JSON.stringify(input) });
export const changeStatus = (id: number, status: TaskStatus) => apiFetch<{ task: ApiTask; changed: boolean }>('/tasks/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status }) });
export const deleteTask = (id: number) => apiFetch<void>('/tasks/' + id, { method: 'DELETE' });
export const getAuditLogs = async (id: number) => (await apiFetch<{ logs: ApiAuditLog[] }>('/tasks/' + id + '/audit-logs')).logs;
