import { afterEach, expect, test } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LoginPage } from './LoginPage';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('labeled form submits credentials and reveals password on request', async () => {
  let sent: unknown;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    sent = JSON.parse(init!.body as string);
    return Response.json({ user: { id: 1, name: 'John', email: 'john@example.com' } });
  }) as unknown as typeof fetch;
  let name = '';
  render(<LoginPage onSignedIn={(user) => { name = user.name; }} />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'test-password-long' } });
  fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
  expect((screen.getByLabelText('Password', { exact: true }) as HTMLInputElement).type).toBe('text');
  fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);
  await waitFor(() => expect(name).toBe('John'));
  expect(sent).toEqual({ email: 'john@example.com', password: 'test-password-long' });
});

test('invalid login shows generic error and retains masked password', async () => {
  globalThis.fetch = (async () => Response.json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } }, { status: 401 })) as unknown as typeof fetch;
  render(<LoginPage onSignedIn={() => {}} />);
  fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
  expect((screen.getByLabelText('Password', { exact: true }) as HTMLInputElement).type).toBe('password');
});
