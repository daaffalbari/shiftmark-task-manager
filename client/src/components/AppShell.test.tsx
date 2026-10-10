import { expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from './AppShell';

test('sidebar toggle announces its state and can reopen while preserving the task view', () => {
  render(<MemoryRouter><AppShell user={{ id: 1, name: 'John Doe', email: 'john@example.com' }} onSignedOut={() => {}}><h1>Team tasks</h1></AppShell></MemoryRouter>);
  const toggle = screen.getByRole('button', { name: 'Hide sidebar' });
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toHaveClass('sidebar');

  fireEvent.click(toggle);
  expect(screen.getByRole('button', { name: 'Show sidebar' })).toBe(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByRole('heading', { name: 'Team tasks' })).toBeVisible();

  fireEvent.click(toggle);
  expect(screen.getByRole('button', { name: 'Hide sidebar' })).toBe(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('link', { name: 'Deleted tasks' })).toBeVisible();
});
