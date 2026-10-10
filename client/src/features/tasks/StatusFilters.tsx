import { taskStatuses, type ApiTask, type TaskStatus } from '@shiftmark/contracts';
import { statusLabels } from './status';
import styles from './tasks.module.css';

export function StatusFilters({ tasks, selected, onChange }: { tasks: ApiTask[]; selected: TaskStatus | 'all'; onChange: (status: TaskStatus | 'all') => void }) {
  return <div className={styles.filters} role="group" aria-label="Filter by status">
    {(['all', ...taskStatuses] as const).map((status) => <button key={status} aria-pressed={selected === status} onClick={() => onChange(status)}>
      {status === 'all' ? 'All' : statusLabels[status]} <span>{status === 'all' ? tasks.length : tasks.filter((task) => task.status === status).length}</span>
    </button>)}
  </div>;
}
