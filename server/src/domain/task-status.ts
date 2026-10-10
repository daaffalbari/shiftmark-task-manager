import { taskStatuses, type TaskStatus } from '@shiftmark/contracts';

export function getNextStatus(current: TaskStatus): TaskStatus | null {
  return taskStatuses[taskStatuses.indexOf(current) + 1] ?? null;
}

export function evaluateTransition(current: TaskStatus, requested: TaskStatus): 'advance' | 'no_change' | 'invalid' {
  if (current === requested) return 'no_change';
  return getNextStatus(current) === requested ? 'advance' : 'invalid';
}
