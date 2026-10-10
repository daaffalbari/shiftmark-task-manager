import { afterEach, expect, test } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { mockFetch, sampleMembers, sampleTask } from '../../test/fixtures';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function openWorkspace() {
  return render(<MemoryRouter initialEntries={['/tasks']}><App /></MemoryRouter>);
}

test('opens the shared workspace without login and shows the predefined actor', async () => {
  const paths: string[] = [];
  mockFetch((path) => { paths.push(path); return Response.json(path === '/api/members' ? { members: sampleMembers } : { tasks: [sampleTask] }); });
  openWorkspace();
  expect(await screen.findByRole('heading', { name: 'Team tasks' })).toBeVisible();
  expect(screen.getByRole('combobox', { name: 'Acting as' })).toHaveTextContent('Jane Doe');
  expect(paths.some((path) => path.includes('/auth/'))).toBe(false);
});

test('switching actor sends the selected identity independently of the assignee', async () => {
  let sent: Record<string, unknown> | undefined;
  mockFetch((path, init) => {
    if (path === '/api/members') return Response.json({ members: sampleMembers });
    if (init?.method === 'POST') { sent = JSON.parse(init.body as string); return Response.json({ task: sampleTask }, { status: 201 }); }
    return Response.json({ tasks: [sampleTask] });
  });
  openWorkspace();
  await screen.findByText('Prepare invoice');
  fireEvent.click(screen.getByRole('combobox', { name: 'Acting as' }));
  fireEvent.click(screen.getByRole('option', { name: 'John Doe' }));
  fireEvent.click(screen.getByRole('button', { name: 'New task' }));
  expect(screen.getByText('This task creation will be recorded as John Doe.')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Team invoice' } });
  await screen.findByRole('option', { name: 'Unassigned' });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create task' })).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Assignee'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create task' }));
  await waitFor(() => expect(sent).toMatchObject({ title: 'Team invoice', actorId: 1, assigneeId: 2 }));
});

test('actor selection survives navigation and remains available with the sidebar closed', async () => {
  mockFetch((path) => Response.json(path === '/api/members' ? { members: sampleMembers } : { tasks: [] }));
  openWorkspace();
  fireEvent.click(await screen.findByRole('combobox', { name: 'Acting as' }));
  fireEvent.click(screen.getByRole('option', { name: 'John Doe' }));
  fireEvent.click(screen.getByRole('link', { name: 'Deleted tasks' }));
  await screen.findByRole('heading', { name: 'Deleted tasks' });
  fireEvent.click(screen.getByRole('button', { name: 'Hide sidebar' }));
  expect(screen.getByRole('combobox', { name: 'Acting as' })).toHaveTextContent('John Doe');
});

test('actor loading can be retried before allowing changes', async () => {
  let failed = true;
  mockFetch((path) => failed ? new Response(null, { status: 500 }) : Response.json(path === '/api/members' ? { members: sampleMembers } : { tasks: [] }));
  openWorkspace();
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load actors.');
  expect(screen.queryByRole('button', { name: 'New task' })).toBeNull();
  failed = false;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('combobox', { name: 'Acting as' })).toBeVisible();
});
