import { afterEach, expect, test } from 'bun:test';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const user = { id: 1, name: 'John Doe', email: 'john@example.com' };

test('signed-out protected route renders sign in', async () => {
  globalThis.fetch = (async () => Response.json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } }, { status: 401 })) as unknown as typeof fetch;
  render(<MemoryRouter initialEntries={['/tasks']}><App /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Sign in to shiftmark' })).toBeVisible();
});

test('authenticated workspace clears private view on 401', async () => {
  globalThis.fetch = (async (path: unknown) => Response.json(String(path).endsWith('/me') ? { user } : { tasks: [] })) as typeof fetch;
  render(<MemoryRouter initialEntries={['/tasks']}><App /></MemoryRouter>);
  expect(await screen.findByText('john@example.com')).toBeVisible();
  await act(async () => { window.dispatchEvent(new Event('shiftmark:unauthorized')); });
  expect(await screen.findByRole('heading', { name: 'Sign in to shiftmark' })).toBeVisible();
  expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Your session has ended.');
});

test('signing out clears the workspace and redirects', async () => {
  globalThis.fetch = (async (path: unknown) => String(path).endsWith('/logout') ? new Response(null, { status: 204 }) : Response.json(String(path).endsWith('/me') ? { user } : { tasks: [] })) as typeof fetch;
  render(<MemoryRouter initialEntries={['/tasks']}><App /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
  await waitFor(() => expect(screen.queryByText('john@example.com')).not.toBeInTheDocument());
  expect(await screen.findByRole('heading', { name: 'Sign in to shiftmark' })).toBeVisible();
});

test('an auth check started before logout cannot restore the previous user', async () => {
  let checks = 0;
  let finish: (response: Response) => void = () => {};
  const pending = new Promise<Response>((resolve) => { finish = resolve; });
  globalThis.fetch = (async (path: unknown) => {
    if (String(path).endsWith('/logout')) return new Response(null, { status: 204 });
    if (String(path).endsWith('/me')) return ++checks === 1 ? Response.json({ user }) : pending;
    return Response.json({ tasks: [] });
  }) as typeof fetch;
  render(<MemoryRouter initialEntries={['/tasks']}><App /></MemoryRouter>);
  await screen.findByText('john@example.com');
  fireEvent(window, new Event('focus'));
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await screen.findByRole('heading', { name: 'Sign in to shiftmark' });
  await act(async () => { finish(Response.json({ user })); });
  expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Sign in to shiftmark' })).toBeVisible();
});
