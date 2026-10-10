import { afterEach, expect, test } from 'bun:test';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { TaskList } from './TaskList';
import { MyTasksPage } from './MyTasksPage';
import { sampleTask, mockFetch } from '../../../test/fixtures';
import { formatTimestamp } from './status';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('task row exposes title, ID, labeled status, timestamp and working details', () => {
  let selected = 0;
  render(<TaskList tasks={[sampleTask]} onOpenTask={(task) => { selected = task.id; }} />);
  expect(screen.getByText('Prepare invoice')).toBeVisible();
  expect(screen.getByText('#104')).toBeVisible();
  expect(screen.getByText('Pending')).toBeVisible();
  expect(screen.getByText(formatTimestamp(sampleTask.updatedAt))).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'View details for Prepare invoice' }));
  expect(selected).toBe(104);
});

test('filters derive counts from data and distinguish filtered-empty from all-empty', async () => {
  mockFetch(() => Response.json({ tasks: [sampleTask, { ...sampleTask, id: 105, title: 'Review rules', status: 'to_do' }] }));
  render(<MyTasksPage />);
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
  render(<MyTasksPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load tasks.');
  mockFetch(() => Response.json({ tasks: [] }));
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Nothing on your list yet.')).toBeVisible();
});
