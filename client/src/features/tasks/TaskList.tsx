import type { ApiTask } from '@shiftmark/contracts';
import { ArrowUpRight } from 'lucide-react';
import { StatusChip, formatTimestamp } from './status';
import styles from './tasks.module.css';

export function TaskList({ tasks, onOpenTask }: { tasks: ApiTask[]; onOpenTask: (task: ApiTask) => void }) {
  return <div className={styles.list}>
    <div className={styles.listHeading} aria-hidden="true"><span>Task</span><span>Assignee</span><span>Status</span><span>Last updated by</span><span>Open</span></div>
    <ul aria-label="Tasks">
      {tasks.map((task) => <li className={styles.row} key={task.id}>
        <div className={styles.taskName}><strong title={task.title}>{task.title}</strong><span className={styles.taskMeta}><span className={styles.taskId}>#{task.id}</span> · Created by {task.createdBy.name}</span></div>
        <div className={styles.assignee}><span className={styles.memberInitials} aria-hidden="true">{task.assignee ? task.assignee.name.split(' ').map((part) => part[0]).join('') : '—'}</span><span>{task.assignee?.name ?? 'Unassigned'}</span></div>
        <div className={styles.rowStatus}><StatusChip status={task.status} /></div>
        <div className={styles.updated}><span>{task.updatedBy.name}</span><time dateTime={task.updatedAt}>{formatTimestamp(task.updatedAt)}</time></div>
        <button className={styles.detailsButton} aria-label={'View details for ' + task.title} onClick={() => onOpenTask(task)}><span>View details</span><ArrowUpRight aria-hidden="true" /></button>
      </li>)}
    </ul>
  </div>;
}
