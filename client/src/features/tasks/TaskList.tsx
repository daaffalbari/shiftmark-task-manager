import type { ApiTask } from '@shiftmark/contracts';
import { ArrowUpRight } from 'lucide-react';
import { StatusChip, formatTimestamp } from './status';
import styles from './tasks.module.css';

export function TaskList({ tasks, onOpenTask }: { tasks: ApiTask[]; onOpenTask: (task: ApiTask) => void }) {
  return <div className={styles.list}>
    <div className={styles.listHeading} aria-hidden="true"><span>Task</span><span>Status</span><span>Updated</span><span>Open</span></div>
    <ul aria-label="Tasks">
      {tasks.map((task) => <li className={styles.row} key={task.id}>
        <div className={styles.taskName}><strong title={task.title}>{task.title}</strong><span className={styles.taskId}>#{task.id}</span></div>
        <div className={styles.rowStatus}><StatusChip status={task.status} /></div>
        <time className={styles.updated} dateTime={task.updatedAt}>{formatTimestamp(task.updatedAt)}</time>
        <button className={styles.detailsButton} aria-label={'View details for ' + task.title} onClick={() => onOpenTask(task)}><span>View details</span><ArrowUpRight aria-hidden="true" /></button>
      </li>)}
    </ul>
  </div>;
}
