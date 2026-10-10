import { expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { AuditTimeline } from './AuditTimeline';
import { sampleLog } from '../../../test/fixtures';

test('history retains oldest-first server ordering with actor, statuses and absolute time', () => {
  render(<AuditTimeline logs={[sampleLog, { ...sampleLog, id: 2, event: { type: 'status_changed', fromStatus: 'pending', toStatus: 'in_progress' } }]} />);
  const entries = screen.getAllByRole('listitem');
  expect(entries[0]).toHaveTextContent('John Doe moved this task from To do to Pending');
  expect(entries[1]).toHaveTextContent('John Doe moved this task from Pending to In progress');
  expect(entries[0].querySelector('time')?.dateTime).toBe(sampleLog.createdAt);
  expect(entries[0]).toHaveTextContent('10 Oct 2026');
});
test('empty history does not invent a creation event', () => {
  render(<AuditTimeline logs={[]} />);
  expect(screen.getByText('No recorded activity.')).toBeVisible();
  expect(screen.queryByText(/created this task/)).toBeNull();
});

test('activity explains creation, exact field changes, reassignment and deletion with their actors', () => {
  render(<AuditTimeline logs={[
    { ...sampleLog, id: 1, event: { type: 'created', title: 'Invoice', description: 'Draft totals', assignee: null } },
    { ...sampleLog, id: 2, actorId: 2, actorName: 'Jane Doe', event: { type: 'updated', changes: [{ field: 'title', from: 'Invoice', to: 'Final invoice' }, { field: 'description', from: 'Draft totals', to: 'Approved totals' }, { field: 'assignee', from: null, to: { id: 2, name: 'Jane Doe' } }] } },
    { ...sampleLog, id: 3, actorId: 2, actorName: 'Jane Doe', event: { type: 'deleted', title: 'Final invoice' } },
  ]} />);
  const entries = screen.getAllByRole('listitem');
  expect(entries[0]).toHaveTextContent('John Doe created this task.');
  expect(entries[1]).toHaveTextContent('Jane Doe updated this task.');
  expect(entries[1]).toHaveTextContent('BeforeInvoiceAfterFinal invoice');
  expect(entries[1]).toHaveTextContent('BeforeDraft totalsAfterApproved totals');
  expect(entries[1]).toHaveTextContent('BeforeUnassignedAfterJane Doe');
  expect(entries[2]).toHaveTextContent('Jane Doe deleted “Final invoice”. History is preserved.');
});
