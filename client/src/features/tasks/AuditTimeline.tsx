import type { ApiAuditLog } from '@shiftmark/contracts';
import { formatTimestamp, statusLabels } from './status';
import styles from './tasks.module.css';

export function AuditTimeline({ logs }: { logs: ApiAuditLog[] }) {
  if (!logs.length) return <div className={styles.noHistory}><p>No status changes yet.</p><p>This task started as To do.</p></div>;
  return <ol className={styles.timeline} aria-label="Status changes">
    {logs.map((log) => <li key={log.id}>
      <p>{log.actorName} moved this task from <strong>{statusLabels[log.fromStatus]}</strong> to <strong>{statusLabels[log.toStatus]}</strong>.</p>
      <time dateTime={log.createdAt}>{formatTimestamp(log.createdAt)}</time>
    </li>)}
  </ol>;
}
