import { afterEach, expect, test } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TaskFormDialog } from './TaskFormDialog';
import { mockFetch, sampleMembers, sampleTask } from '../../../test/fixtures';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('invalid titles and oversized descriptions cannot be submitted', async () => {
  let submitted = false;
  mockFetch(() => Response.json({ members: sampleMembers }));
  render(<TaskFormDialog open onClose={() => {}} onSaved={() => { submitted = true; }} />);
  await screen.findByRole('option', { name: 'Jane Doe' });
  const input = screen.getByLabelText('Task title');
  for (const title of ['  ', 'x'.repeat(121)]) {
    fireEvent.change(input, { target: { value: title } });
    fireEvent.submit(screen.getByRole('button', { name: 'Create task' }).closest('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a title between 1 and 120 characters.');
  }
  fireEvent.change(input, { target: { value: 'Task' } });
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'x'.repeat(2001) } });
  fireEvent.submit(screen.getByRole('button', { name: 'Create task' }).closest('form')!);
  expect(screen.getByRole('alert')).toHaveTextContent('Keep the description within 2,000 characters.');
  expect(submitted).toBe(false);
});

test('failed member loading is retryable and retains the draft', async () => {
  let failed = true;
  mockFetch(() => failed ? Response.json({ error: { code: 'ERROR', message: 'Unavailable' } }, { status: 500 }) : Response.json({ members: sampleMembers }));
  render(<TaskFormDialog open onClose={() => {}} onSaved={() => {}} />);
  fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'My draft' } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load team members.');
  expect(screen.getByRole('button', { name: 'Create task' })).toBeDisabled();
  failed = false;
  fireEvent.click(screen.getByRole('button', { name: 'Retry members' }));
  await screen.findByRole('option', { name: 'Jane Doe' });
  expect(screen.getByLabelText('Task title')).toHaveValue('My draft');
  expect(screen.getByRole('button', { name: 'Create task' })).toBeEnabled();
});

test('creates a trimmed task with description and a real team assignee', async () => {
  let sent: unknown;
  let saved = false;
  mockFetch((path, init) => {
    if (path === '/api/members') return Response.json({ members: sampleMembers });
    sent = JSON.parse(init!.body as string);
    return Response.json({ task: sampleTask }, { status: 201 });
  });
  render(<TaskFormDialog open onClose={() => {}} onSaved={() => { saved = true; }} />);
  expect(document.activeElement).toBe(screen.getByLabelText('Task title'));
  fireEvent.change(screen.getByLabelText('Task title'), { target: { value: '  Prepare invoice  ' } });
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: '  Check totals  ' } });
  await screen.findByRole('option', { name: 'Jane Doe' });
  fireEvent.change(screen.getByLabelText('Assignee'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create task' }));
  await waitFor(() => expect(saved).toBe(true));
  expect(sent).toEqual({ title: 'Prepare invoice', description: 'Check totals', assigneeId: 2 });
});

test('failed edits retain all draft fields and the original task version', async () => {
  let sent: unknown;
  mockFetch((path, init) => {
    if (path === '/api/members') return Response.json({ members: sampleMembers });
    sent = JSON.parse(init!.body as string);
    return Response.json({ error: { code: 'ERROR', message: 'Unavailable' } }, { status: 500 });
  });
  render(<TaskFormDialog open task={sampleTask} onClose={() => {}} onSaved={() => {}} />);
  await screen.findByRole('option', { name: 'Jane Doe' });
  fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Revised draft' } });
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'New details' } });
  fireEvent.change(screen.getByLabelText('Assignee'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save changes.');
  expect(screen.getByLabelText('Task title')).toHaveValue('Revised draft');
  expect(screen.getByLabelText('Description')).toHaveValue('New details');
  expect(screen.getByLabelText('Assignee')).toHaveValue('');
  expect(sent).toEqual({ title: 'Revised draft', description: 'New details', assigneeId: null, version: sampleTask.version });
});

test('stale edits keep the draft until the user explicitly reloads the latest task', async () => {
  const latest = { ...sampleTask, title: 'Jane updated this', version: 3 };
  mockFetch((path, init) => {
    if (path === '/api/members') return Response.json({ members: sampleMembers });
    if (init?.method === 'PATCH') return Response.json({ error: { code: 'TASK_CHANGED', message: 'Stale' } }, { status: 409 });
    return Response.json({ task: latest });
  });
  render(<TaskFormDialog open task={sampleTask} onClose={() => {}} onSaved={() => {}} />);
  await screen.findByRole('option', { name: 'Jane Doe' });
  fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'My unsaved draft' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Your draft has been kept.');
  expect(screen.getByLabelText('Task title')).toHaveValue('My unsaved draft');
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Reload latest' }));
  await waitFor(() => expect(screen.getByLabelText('Task title')).toHaveValue('Jane updated this'));
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
});
