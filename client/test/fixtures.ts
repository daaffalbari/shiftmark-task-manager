import type { ApiTask, ApiAuditLog } from '@shiftmark/contracts';
export const sampleTask: ApiTask = {
  id: 104, title: 'Prepare invoice', status: 'pending',
  createdAt: '2026-10-10T07:00:00.000Z', updatedAt: '2026-10-10T07:30:00.000Z', deletedAt: null,
};
export const sampleLog: ApiAuditLog = {
  id: 1, taskId: 104, actorId: 1, actorName: 'John Doe', fromStatus: 'to_do', toStatus: 'pending', createdAt: '2026-10-10T07:30:00.000Z',
};
export function mockFetch(handler: (path: string, init?: RequestInit) => Response | Promise<Response>) {
  globalThis.fetch = ((path: unknown, init?: RequestInit) => Promise.resolve(handler(String(path), init))) as typeof fetch;
}
