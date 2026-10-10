import { expect, test } from 'bun:test';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { sampleMembers } from '../../test/fixtures';
import { ActorPicker } from './ActorPicker';

function openPicker() {
  const changes: number[] = [];
  function Workspace() {
    const [actor, setActor] = useState(sampleMembers[0]!);
    return <><ActorPicker members={sampleMembers} actor={actor} onChange={(id) => { changes.push(id); setActor(sampleMembers.find((member) => member.id === id)!); }} /><button>Next control</button></>;
  }
  render(<Workspace />);
  const picker = screen.getByRole('combobox', { name: 'Acting as' });
  picker.focus();
  return { picker, changes };
}

test('actor menu marks the current member, selects by click and returns focus', () => {
  const { picker, changes } = openPicker();
  expect(picker).toHaveTextContent('Jane Doe');
  expect(picker).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(picker);
  expect(screen.getByRole('option', { name: 'Jane Doe' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.click(screen.getByRole('option', { name: 'John Doe' }));
  expect(picker).toHaveTextContent('John Doe');
  expect(changes).toEqual([1]);
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(picker).toHaveFocus();
  fireEvent.click(picker);
  fireEvent.click(screen.getByRole('option', { name: 'John Doe' }));
  expect(changes).toEqual([1]);
});

test('keyboard browsing retains the actor until confirmed and Escape cancels', () => {
  const { picker, changes } = openPicker();
  fireEvent.keyDown(picker, { key: 'ArrowDown' });
  fireEvent.keyDown(picker, { key: 'End' });
  expect(picker).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'John Doe' }).id);
  expect(picker).toHaveTextContent('Jane Doe');
  expect(changes).toEqual([]);
  fireEvent.keyDown(picker, { key: 'Escape' });
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(picker).toHaveFocus();
  expect(changes).toEqual([]);
  fireEvent.keyDown(picker, { key: ' ' });
  fireEvent.keyDown(picker, { key: 'ArrowDown' });
  fireEvent.keyDown(picker, { key: 'Enter' });
  expect(picker).toHaveTextContent('John Doe');
  expect(changes).toEqual([1]);
  fireEvent.keyDown(picker, { key: 'Home' });
  fireEvent.keyDown(picker, { key: 'Tab' });
  expect(changes).toEqual([1, 2]);
  expect(screen.queryByRole('listbox')).toBeNull();
});

test('typing names and repeated initials finds the right actor', () => {
  const { picker } = openPicker();
  fireEvent.keyDown(picker, { key: 'j' });
  fireEvent.keyDown(picker, { key: 'o' });
  expect(picker).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'John Doe' }).id);
  fireEvent.keyDown(picker, { key: 'Escape' });
  fireEvent.keyDown(picker, { key: 'j' });
  expect(picker).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Jane Doe' }).id);
  fireEvent.keyDown(picker, { key: 'j' });
  expect(picker).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'John Doe' }).id);
  fireEvent.keyDown(picker, { key: ' ' });
  expect(picker).toHaveTextContent('John Doe');
});

test('clicking away and losing focus dismiss the menu without changing actor', () => {
  const { picker, changes } = openPicker();
  fireEvent.click(picker);
  fireEvent.keyDown(picker, { key: 'End' });
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(changes).toEqual([]);
  fireEvent.click(picker);
  fireEvent.blur(picker);
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(changes).toEqual([]);
});
