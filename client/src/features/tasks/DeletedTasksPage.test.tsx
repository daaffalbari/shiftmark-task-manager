import { afterEach, expect, test } from 'bun:test';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MyTasksPage } from './MyTasksPage';
import { App } from '../../app/App';
import { mockFetch, sampleTask, sampleLog, sampleMembers } from '../../../test/fixtures';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('deleted view is read-only and preserves original history and deletion time', async () => {
  mockFetch((path) => Response.json(path.includes('audit-logs') ? { logs: [sampleLog] } : path === '/api/tasks/104' ? { task: { ...sampleTask, deletedAt: sampleTask.updatedAt } } : { tasks: [{ ...sampleTask, deletedAt: sampleTask.updatedAt }] }));
  render(<MyTasksPage actor={sampleMembers[0]!} view="deleted" />);
  expect(screen.getByRole('heading', { name: 'Deleted tasks' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'New task' })).toBeNull();
  fireEvent.click(await screen.findByRole('button', { name: 'View details for Prepare invoice' }));
  const sheet = screen.getByRole('dialog');
  expect(await within(sheet).findByRole('list', { name: 'Task activity' })).toHaveTextContent('John Doe moved this task');
  expect(within(sheet).getByText(/Deleted on/)).toBeVisible();
  expect(within(sheet).queryByRole('button', { name: /Move to|Mark as|Delete task|Edit details/ })).toBeNull();
});

test('workspace has functional active/deleted navigation and an actor dropdown', async () => {
  mockFetch((path) => Response.json(path === '/api/members' ? { members: sampleMembers } : { tasks: [] }));
  render(<MemoryRouter initialEntries={['/tasks']}><App /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('link', { name: 'Deleted tasks' }));
  expect(await screen.findByRole('heading', { name: 'Deleted tasks' })).toBeVisible();
  fireEvent.click(screen.getByRole('link', { name: 'Team tasks' }));
  expect(await screen.findByRole('heading', { name: 'Team tasks' })).toBeVisible();
  expect(screen.getByRole('combobox', { name: 'Acting as' })).toBeVisible();
});
