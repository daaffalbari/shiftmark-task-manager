import type { ApiError } from '@shiftmark/contracts';

export class ApiRequestError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch('/api' + path, {
    ...init, credentials: 'same-origin',
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  });
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') window.dispatchEvent(new Event('shiftmark:unauthorized'));
    const data = await response.json().catch(() => null) as ApiError | null;
    throw new ApiRequestError(response.status, data?.error.code ?? 'REQUEST_FAILED', data?.error.message ?? 'Could not complete the request. Please try again.');
  }
  return response.status === 204 ? undefined as T : response.json();
}
