import type { ApiAuditLog } from '@shiftmark/contracts';
import { ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { formatTimestamp, statusLabels } from './status';
import styles from './tasks.module.css';

export function AuditTimeline({ logs }: { logs: ApiAuditLog[] }) {
  if (!logs.length) return <div className={styles.noHistory}><p>No recorded activity.</p><p>New changes will appear here.</p></div>;
  return <ol className={styles.timeline} aria-label="Task activity">
    {logs.map((log) => {
      const event = log.event;
      return <li key={log.id}>
        <span className={styles.eventMarker + (event.type === 'deleted' ? ' ' + styles.deletedMarker : '')} aria-hidden="true">{event.type === 'created' ? <Plus /> : event.type === 'updated' ? <Pencil /> : event.type === 'status_changed' ? <ArrowRight /> : <Trash2 />}</span>
        {event.type === 'created' && <><p><strong>{log.actorName}</strong> created this task.</p><div className={styles.creationSnapshot}><p>Title: {event.title}</p>{event.description && <p>Description: {event.description}</p>}<p>Assignee: {event.assignee?.name ?? 'Unassigned'} · Status: To do</p></div></>}
        {event.type === 'status_changed' && <p><strong>{log.actorName}</strong> moved this task from <strong>{statusLabels[event.fromStatus]}</strong> to <strong>{statusLabels[event.toStatus]}</strong>.</p>}
        {event.type === 'updated' && <><p><strong>{log.actorName}</strong> updated this task.</p><div className={styles.fieldChanges}>{event.changes.map((change) => <div key={change.field}>
          <p className={styles.fieldName}>{change.field === 'title' ? 'Title' : change.field === 'description' ? 'Description' : 'Assignee'}</p>
          <p><span className={styles.changeLabel}>Before</span>{change.field === 'assignee' ? change.from?.name ?? 'Unassigned' : change.from || '(empty)'}</p>
          <p><span className={styles.changeLabel}>After</span>{change.field === 'assignee' ? change.to?.name ?? 'Unassigned' : change.to || '(empty)'}</p>
        </div>)}</div></>}
        {event.type === 'deleted' && <p><strong>{log.actorName}</strong> deleted “{event.title}”. History is preserved.</p>}
        <time dateTime={log.createdAt}>{formatTimestamp(log.createdAt)}</time>
      </li>;
    })}
  </ol>;
}
