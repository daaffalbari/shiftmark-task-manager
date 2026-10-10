import { expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { sampleMembers } from '../../test/fixtures';

test('sidebar toggle announces its state and can reopen while preserving the task view', () => {
  render(<MemoryRouter><AppShell members={sampleMembers} actor={sampleMembers[0]!} onActorChange={() => {}}><h1>Team tasks</h1></AppShell></MemoryRouter>);
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
