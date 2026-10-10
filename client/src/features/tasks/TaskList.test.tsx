import { afterEach, expect, test } from 'bun:test';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { TaskList } from './TaskList';
import { MyTasksPage } from './MyTasksPage';
import { sampleTask, sampleMembers, mockFetch } from '../../../test/fixtures';
import { formatTimestamp } from './status';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('task row exposes title, ID, labeled status, timestamp and working details', () => {
  let selected = 0;
  render(<TaskList tasks={[sampleTask]} onOpenTask={(task) => { selected = task.id; }} />);
  expect(screen.getByText('Prepare invoice')).toBeVisible();
  expect(screen.getByText('#104')).toBeVisible();
  expect(screen.getByText('Jane Doe')).toBeVisible();
  expect(screen.getByText(/Created by John Doe/)).toBeVisible();
  expect(screen.getByText('John Doe')).toBeVisible();
  expect(screen.getByText('Pending')).toBeVisible();
  expect(screen.getByText(formatTimestamp(sampleTask.updatedAt))).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'View details for Prepare invoice' }));
  expect(selected).toBe(104);
});

test('filters derive counts from data and distinguish filtered-empty from all-empty', async () => {
  mockFetch(() => Response.json({ tasks: [sampleTask, { ...sampleTask, id: 105, title: 'Review rules', status: 'to_do' }] }));
  render(<MyTasksPage actor={sampleMembers[0]!} />);
  expect(await screen.findByText('Prepare invoice')).toBeVisible();
  const filters = screen.getByRole('group', { name: 'Filter by status' });
  expect(within(filters).getByRole('button', { name: 'All 2' })).toBeVisible();
  fireEvent.click(within(filters).getByRole('button', { name: 'To do 1' }));
  expect(screen.queryByText('Prepare invoice')).toBeNull();
  expect(screen.getByText('Review rules')).toBeVisible();
  fireEvent.click(within(filters).getByRole('button', { name: 'Done 0' }));
  expect(screen.getByText('No tasks in this status.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
  expect(screen.getByText('Prepare invoice')).toBeVisible();
});

test('empty list and failed request provide useful next actions', async () => {
  mockFetch(() => Response.json({ error: { code: 'ERROR', message: 'Unavailable' } }, { status: 500 }));
  render(<MyTasksPage actor={sampleMembers[0]!} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load tasks.');
  mockFetch(() => Response.json({ tasks: [] }));
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('No team tasks yet.')).toBeVisible();
});

test('refresh and returning to the window load a teammate’s latest changes', async () => {
  let title = 'Original task';
  mockFetch(() => Response.json({ tasks: [{ ...sampleTask, title }] }));
  render(<MyTasksPage actor={sampleMembers[0]!} />);
  await screen.findByText('Original task');
  title = 'Updated by Jane';
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  await screen.findByText('Updated by Jane');
  title = 'Updated again';
  const focus = new Event('focus');
  // Bun's Event does not populate target when dispatched through happy-dom.
  Object.defineProperty(focus, 'target', { value: window });
  await act(async () => { window.dispatchEvent(focus); });
  expect(await screen.findByText('Updated again')).toBeVisible();
});
