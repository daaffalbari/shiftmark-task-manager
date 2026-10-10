import type { ApiTask, ApiAuditLog, ApiMember } from '@shiftmark/contracts';
export const sampleMembers: ApiMember[] = [{ id: 2, name: 'Jane Doe' }, { id: 1, name: 'John Doe' }];
export const sampleTask: ApiTask = {
  id: 104, title: 'Prepare invoice', description: 'Check invoice totals.', status: 'pending', version: 2,
  createdBy: { id: 1, name: 'John Doe' }, assignee: { id: 2, name: 'Jane Doe' }, updatedBy: { id: 1, name: 'John Doe' },
  createdAt: '2026-10-10T07:00:00.000Z', updatedAt: '2026-10-10T07:30:00.000Z', deletedAt: null,
};
export const sampleLog: ApiAuditLog = {
  id: 1, taskId: 104, actorId: 1, actorName: 'John Doe', event: { type: 'status_changed', fromStatus: 'to_do', toStatus: 'pending' }, createdAt: '2026-10-10T07:30:00.000Z',
};
export function mockFetch(handler: (path: string, init?: RequestInit) => Response | Promise<Response>) {
  globalThis.fetch = ((path: unknown, init?: RequestInit) => Promise.resolve(handler(String(path), init))) as typeof fetch;
}
