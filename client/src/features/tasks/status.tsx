import type { TaskStatus } from '@shiftmark/contracts';
import styles from './tasks.module.css';

export const statusLabels: Record<TaskStatus, string> = { to_do: 'To do', pending: 'Pending', in_progress: 'In progress', done: 'Done' };
const timestampFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short',
});
export const formatTimestamp = (value: string) => timestampFormat.format(new Date(value));
export function StatusChip({ status }: { status: TaskStatus }) {
  return <span className={styles.chip + ' ' + styles[status]}><span aria-hidden="true" />{statusLabels[status]}</span>;
}
