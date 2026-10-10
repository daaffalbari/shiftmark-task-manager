import { afterEach, expect, test } from 'bun:test';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { TaskDetailSheet } from './TaskDetailSheet';
import { mockFetch, sampleMembers, sampleTask, sampleLog } from '../../../test/fixtures';
import { MyTasksPage } from './MyTasksPage';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('opens from the list with four stages and only the next valid action', async () => {
  mockFetch((path) => Response.json(path.includes('audit-logs') ? { logs: [] } : path === '/api/tasks/104' ? { task: sampleTask } : { tasks: [sampleTask] }));
  render(<MyTasksPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'View details for Prepare invoice' }));
  const sheet = await screen.findByRole('dialog');
  expect(within(sheet).getByRole('heading', { name: 'Prepare invoice' })).toBeVisible();
  expect(within(sheet).getByText('Step 2 of 4')).toBeVisible();
  expect(within(sheet).getByRole('list', { name: 'Task workflow' }).children).toHaveLength(4);
  expect(within(sheet).getByRole('button', { name: 'Move to In progress' })).toBeVisible();
  expect(await within(sheet).findByText('No recorded activity.')).toBeVisible();
  expect(within(sheet).getByText('Check invoice totals.')).toBeVisible();
  expect(within(sheet).getByText('Jane Doe')).toBeVisible();
  expect(within(sheet).getByRole('button', { name: 'Edit details' })).toBeVisible();
});

test('editing from details refreshes the shared row and the before/after activity', async () => {
  let current = sampleTask;
  let edited = false;
  mockFetch((path, init) => {
    if (path === '/api/members') return Response.json({ members: sampleMembers });
    if (init?.method === 'PATCH') {
      edited = true;
      current = { ...sampleTask, title: 'Approved invoice', updatedBy: { id: 2, name: 'Jane Doe' }, version: 3 };
      return Response.json({ task: current, changed: true });
    }
    if (path.includes('audit-logs')) return Response.json({ logs: edited ? [{ ...sampleLog, actorId: 2, actorName: 'Jane Doe', event: { type: 'updated', changes: [{ field: 'title', from: sampleTask.title, to: current.title }] } }] : [] });
    return Response.json(path === '/api/tasks/104' ? { task: current } : { tasks: [current] });
  });
  render(<MyTasksPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'View details for Prepare invoice' }));
  await screen.findByText('No recorded activity.');
  fireEvent.click(screen.getByRole('button', { name: 'Edit details' }));
  await screen.findByRole('option', { name: 'Jane Doe' });
  fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Approved invoice' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('heading', { name: 'Approved invoice' })).toBeVisible();
  expect(await screen.findByRole('list', { name: 'Task activity' })).toHaveTextContent('Jane Doe updated this task.');
  expect(screen.getByRole('list', { name: 'Task activity' })).toHaveTextContent('BeforePrepare invoiceAfterApproved invoice');
  fireEvent.click(screen.getByRole('button', { name: 'Close task details' }));
  expect(await screen.findByRole('button', { name: 'View details for Approved invoice' })).toBeVisible();
});

test('completed tasks have no next-step action', async () => {
  mockFetch((path) => Response.json(path.includes('audit-logs') ? { logs: [] } : { task: { ...sampleTask, status: 'done' } }));
  render(<TaskDetailSheet task={{ ...sampleTask, status: 'done' }} readOnly={false} onClose={() => {}} onTaskUpdated={() => {}} />);
  expect(screen.getByText('This task is complete.')).toBeVisible();
  expect(screen.queryByRole('button', { name: /Move to|Mark as/ })).toBeNull();
  await screen.findByText('No recorded activity.');
});

test('refreshing a teammate’s changes also updates the list behind the sheet', async () => {
  let latest = sampleTask;
  mockFetch((path) => Response.json(path.includes('audit-logs') ? { logs: [] } : path === '/api/tasks/104' ? { task: latest } : { tasks: [latest] }));
  render(<MyTasksPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'View details for Prepare invoice' }));
  await screen.findByText('No recorded activity.');
  latest = { ...sampleTask, status: 'done', version: 3, updatedBy: { id: 2, name: 'Jane Doe' } };
  fireEvent.click(screen.getByRole('button', { name: 'Refresh task' }));
  await screen.findByText('This task is complete.');
  const rows = screen.getByRole('list', { name: 'Tasks' });
  await waitFor(() => expect(within(rows).getByText('Done')).toBeVisible());
  expect(within(rows).queryByText('Pending')).toBeNull();
});

test('status mutation refreshes server task and audit; busy actions cannot submit twice', async () => {
  let patches = 0;
  let reads = 0;
  let finish: () => void = () => {};
  const gate = new Promise<void>((resolve) => { finish = resolve; });
  mockFetch(async (path, init) => {
    if (init?.method === 'PATCH') { patches++; await gate; return Response.json({ task: { ...sampleTask, status: 'in_progress' }, changed: true }); }
    if (path.includes('audit-logs')) { reads++; return Response.json({ logs: patches ? [sampleLog] : [] }); }
    return Response.json({ task: { ...sampleTask, status: patches ? 'in_progress' : 'pending' } });
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
  expect(await screen.findByRole('list', { name: 'Task activity' })).toHaveTextContent('John Doe moved this task');
});

test('409 refreshes server truth with non-destructive feedback', async () => {
  mockFetch((path, init) => {
    if (init?.method === 'PATCH') return Response.json({ error: { code: 'INVALID_TRANSITION', message: 'Stale' } }, { status: 409 });
    return Response.json(path.includes('audit-logs') ? { logs: [sampleLog] } : { task: { ...sampleTask, status: 'done' } });
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
    return Response.json(path.includes('audit-logs') ? { logs: [sampleLog] } : path === '/api/tasks/104' ? { task: sampleTask } : { tasks: deleted ? [] : [sampleTask] });
  });
  render(<MyTasksPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'View details for Prepare invoice' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete task' }));
  let confirm = screen.getByRole('dialog', { name: 'Delete “Prepare invoice”?' });
  expect(within(confirm).getByText(/full activity history will be preserved/)).toBeVisible();
  fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
  expect(deleted).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Delete task' }));
  confirm = screen.getByRole('dialog', { name: 'Delete “Prepare invoice”?' });
  fireEvent.click(within(confirm).getByRole('button', { name: 'Delete task' }));
  expect(await screen.findByText('No team tasks yet.')).toBeVisible();
  expect(deleted).toBe(true);
  expect(screen.queryByRole('button', { name: 'View details for Prepare invoice' })).toBeNull();
});
