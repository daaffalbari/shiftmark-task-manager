import { afterEach, expect, test } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CreateTaskDialog } from './CreateTaskDialog';
import { mockFetch, sampleTask } from '../../../test/fixtures';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('focuses title, validates bounds and submits only trimmed title', async () => {
  let sent: unknown;
  let closed = false;
  let created = 0;
  mockFetch((_path, init) => { sent = JSON.parse(init!.body as string); return Response.json({ task: sampleTask }, { status: 201 }); });
  render(<CreateTaskDialog open onClose={() => { closed = true; }} onCreated={(task) => { created = task.id; }} />);
  const input = screen.getByLabelText('Task title');
  expect(document.activeElement).toBe(input);
  for (const title of ['  ', 'a'.repeat(121)]) {
    fireEvent.change(input, { target: { value: title } });
    fireEvent.submit(screen.getByRole('button', { name: 'Create task' }).closest('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a title between 1 and 120 characters.');
  }
  fireEvent.change(input, { target: { value: '  Prepare invoice  ' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Create task' }).closest('form')!);
  await waitFor(() => expect(created).toBe(104));
  expect(sent).toEqual({ title: 'Prepare invoice' });
  expect(closed).toBe(true);
});

test('request failure retains draft and supports retry', async () => {
  mockFetch(() => { throw new Error('offline'); });
  render(<CreateTaskDialog open onClose={() => {}} onCreated={() => {}} />);
  fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'My draft' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Create task' }).closest('form')!);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not create task.');
  expect(screen.getByLabelText('Task title')).toHaveValue('My draft');
  expect(screen.getByRole('button', { name: 'Create task' })).toBeEnabled();
});
