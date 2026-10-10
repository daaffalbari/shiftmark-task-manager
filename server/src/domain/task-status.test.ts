import { expect, test } from 'bun:test';
import { evaluateTransition, getNextStatus } from './task-status';
import { taskStatuses } from '@shiftmark/contracts';

test('only adjacent forward transitions are allowed; same status is a no-op', () => {
  for (const [i, current] of taskStatuses.entries()) {
    for (const [j, requested] of taskStatuses.entries()) {
      expect(evaluateTransition(current, requested)).toBe(i === j ? 'no_change' : j === i + 1 ? 'advance' : 'invalid');
    }
    expect(getNextStatus(current)).toBe(taskStatuses[i + 1] ?? null);
  }
});
