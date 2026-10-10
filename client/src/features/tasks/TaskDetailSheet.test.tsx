import { afterEach, expect, test } from 'bun:test';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { TaskDetailSheet } from './TaskDetailSheet';
import { mockFetch, sampleTask, sampleLog } from '../../../test/fixtures';
import { MyTasksPage } from './MyTasksPage';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('opens from the list with four stages and only the next valid action', async () => {
  mockFetch((path) => Response.json(path.includes('audit-logs') ? { logs: [] } : { tasks: [sampleTask] }));
  render(<MyTasksPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'View details for Prepare invoice' }));
  const sheet = await screen.findByRole('dialog');
  expect(within(sheet).getByRole('heading', { name: 'Prepare invoice' })).toBeVisible();
  expect(within(sheet).getByText('Step 2 of 4')).toBeVisible();
  expect(within(sheet).getByRole('list', { name: 'Task workflow' }).children).toHaveLength(4);
  expect(within(sheet).getByRole('button', { name: 'Move to In progress' })).toBeVisible();
  expect(await within(sheet).findByText('No status changes yet.')).toBeVisible();
});

test('completed tasks have no next-step action', async () => {
  mockFetch(() => Response.json({ logs: [] }));
  render(<TaskDetailSheet task={{ ...sampleTask, status: 'done' }} readOnly={false} onClose={() => {}} onTaskUpdated={() => {}} />);
  expect(screen.getByText('This task is complete.')).toBeVisible();
  expect(screen.queryByRole('button', { name: /Move to|Mark as/ })).toBeNull();
  await screen.findByText('No status changes yet.');
});

test('status mutation refreshes server task and audit; busy actions cannot submit twice', async () => {
  let patches = 0;
  let reads = 0;
  let finish: () => void = () => {};
  const gate = new Promise<void>((resolve) => { finish = resolve; });
  mockFetch(async (path, init) => {
    if (init?.method === 'PATCH') { patches++; await gate; return Response.json({ task: { ...sampleTask, status: 'in_progress' }, changed: true }); }
    if (path.includes('audit-logs')) { reads++; return Response.json({ logs: patches ? [sampleLog] : [] }); }
    return Response.json({ tasks: [{ ...sampleTask, status: 'in_progress' }] });
  });
  let updated = '';
  render(<TaskDetailSheet task={sampleTask} readOnly={false} onClose={() => {}} onTaskUpdated={(task) => { updated = task.status; }} />);
  const button = screen.getByRole('button', { name: 'Move to In progress' });
  fireEvent.click(button); fireEvent.click(button);
  expect(patches).toBe(1);
  finish();
  await waitFor(() => expect(updated).toBe('in_progress'));
  expect(screen.getByRole('button', { name: 'Mark as Done' })).toBeVisible();
  expect(reads).toBeGreaterThanOrEqual(2);
  expect(await screen.findByText(/John Doe moved/)).toBeVisible();
});

test('409 refreshes server truth with non-destructive feedback', async () => {
  mockFetch((path, init) => {
    if (init?.method === 'PATCH') return Response.json({ error: { code: 'INVALID_TRANSITION', message: 'Stale' } }, { status: 409 });
    return Response.json(path.includes('audit-logs') ? { logs: [sampleLog] } : { tasks: [{ ...sampleTask, status: 'done' }] });
  });
  render(<TaskDetailSheet task={sampleTask} readOnly={false} onClose={() => {}} onTaskUpdated={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Move to In progress' }));
  expect(await screen.findByText('This task is complete.')).toBeVisible();
  expect(screen.getByRole('status')).toHaveTextContent('Status changed elsewhere.');
});

test('delete requires confirmation, cancel retains task, confirm removes the active row', async () => {
  let deleted = false;
  mockFetch((path, init) => {
    if (init?.method === 'DELETE') { deleted = true; return new Response(null, { status: 204 }); }
    return Response.json(path.includes('audit-logs') ? { logs: [sampleLog] } : { tasks: deleted ? [] : [sampleTask] });
  });
  render(<MyTasksPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'View details for Prepare invoice' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete task' }));
  let confirm = screen.getByRole('dialog', { name: 'Delete “Prepare invoice”?' });
  expect(within(confirm).getByText(/status history will be preserved/)).toBeVisible();
  fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
  expect(deleted).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Delete task' }));
  confirm = screen.getByRole('dialog', { name: 'Delete “Prepare invoice”?' });
  fireEvent.click(within(confirm).getByRole('button', { name: 'Delete task' }));
  expect(await screen.findByText('Nothing on your list yet.')).toBeVisible();
  expect(deleted).toBe(true);
  expect(screen.queryByRole('button', { name: 'View details for Prepare invoice' })).toBeNull();
});
