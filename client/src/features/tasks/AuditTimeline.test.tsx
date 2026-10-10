import { expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { AuditTimeline } from './AuditTimeline';
import { sampleLog } from '../../../test/fixtures';

test('history retains oldest-first server ordering with actor, statuses and absolute time', () => {
  render(<AuditTimeline logs={[sampleLog, { ...sampleLog, id: 2, fromStatus: 'pending', toStatus: 'in_progress' }]} />);
  const entries = screen.getAllByRole('listitem');
  expect(entries[0]).toHaveTextContent('John Doe moved this task from To do to Pending');
  expect(entries[1]).toHaveTextContent('John Doe moved this task from Pending to In progress');
  expect(entries[0].querySelector('time')?.dateTime).toBe(sampleLog.createdAt);
  expect(entries[0]).toHaveTextContent('10 Oct 2026');
});
test('empty history does not invent a creation event', () => {
  render(<AuditTimeline logs={[]} />);
  expect(screen.getByText('No status changes yet.')).toBeVisible();
  expect(screen.getByText('This task started as To do.')).toBeVisible();
});
