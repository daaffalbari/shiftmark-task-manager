import type { ApiUser } from '@shiftmark/contracts';
import { apiFetch } from '../../api/http';

export const getMe = async () => (await apiFetch<{ user: ApiUser }>('/auth/me')).user;
export const signIn = async (email: string, password: string) =>
  (await apiFetch<{ user: ApiUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })).user;
export const signOut = () => apiFetch<void>('/auth/logout', { method: 'POST' });
