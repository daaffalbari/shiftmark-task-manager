import { useEffect, useState } from 'react';
import { ListChecks, Plus, RefreshCw } from 'lucide-react';
import type { ApiTask, TaskStatus, TaskView } from '@shiftmark/contracts';
import { listTasks } from './tasks.api';
import { StatusFilters } from './StatusFilters';
import { TaskList } from './TaskList';
import { TaskFormDialog } from './TaskFormDialog';
import { TaskDetailSheet } from './TaskDetailSheet';
import styles from './tasks.module.css';

export function MyTasksPage({ view = 'active' }: { view?: TaskView }) {
  const deleted = view === 'deleted';
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [creating, setCreating] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [selected, setSelected] = useState<ApiTask | null>(null);
  useEffect(() => {
    const refresh = (event: Event) => { if (event.target === window) setAttempt((value) => value + 1); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(false);
    listTasks(view).then((data) => { if (alive) { setTasks(data); setSelected((current) => current ? data.find((item) => item.id === current.id) ?? current : null); } })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [attempt, view]);
  const shown = tasks.filter((task) => filter === 'all' || task.status === filter);
  return <section className={styles.page}>
    <header className={styles.pageHeader}><div><p className="eyebrow">INTERNAL TEAM</p><h1>{deleted ? 'Deleted tasks' : 'Team tasks'}</h1><p className={styles.subtitle}>{deleted ? 'Shared team history, preserved after deletion.' : 'Shared work. Clear responsibility. Every change recorded.'}</p></div>{!deleted && <button className="primary" onClick={() => setCreating(true)}><Plus aria-hidden="true" />New task</button>}</header>
    <p className={styles.announcement} role="status" aria-live="polite">{announcement}</p>
    <StatusFilters tasks={tasks} selected={filter} onChange={setFilter} />
    <div className={styles.listCaption}><span>{loading ? 'Updating team tasks…' : tasks.length + (tasks.length === 1 ? ' team task' : ' team tasks')}</span><button className={styles.refreshButton} onClick={() => setAttempt((value) => value + 1)} disabled={loading}><RefreshCw aria-hidden="true" />Refresh</button></div>
    {loading && !tasks.length ? <div className={styles.empty} role="status">Loading tasks…</div> : error ? <div className={styles.empty}><p role="alert">Could not load tasks.</p><button onClick={() => setAttempt(attempt + 1)}>Try again</button></div> :
      tasks.length === 0 ? <div className={styles.empty}><ListChecks aria-hidden="true" /><h3>{deleted ? 'No deleted tasks.' : 'No team tasks yet.'}</h3><p>{deleted ? 'Deleted tasks and their history will appear here.' : 'Create a task and assign the next step to a teammate.'}</p>{!deleted && <button onClick={() => setCreating(true)}><Plus aria-hidden="true" />New task</button>}</div> :
      shown.length === 0 ? <div className={styles.empty}><h3>No tasks in this status.</h3><button onClick={() => setFilter('all')}>Clear filter</button></div> :
      <TaskList tasks={shown} onOpenTask={setSelected} />}
    {!deleted && creating && <TaskFormDialog open onClose={() => setCreating(false)} onSaved={() => { setFilter('all'); setAttempt((value) => value + 1); setAnnouncement('Task created for the team.'); }} />}
    {selected && <TaskDetailSheet task={selected} readOnly={deleted} onClose={() => { setSelected(null); setAttempt((value) => value + 1); }} onTaskUpdated={(task) => { setSelected(task); setAttempt((value) => value + 1); }} onDeleted={() => { setSelected(null); setAttempt((value) => value + 1); setAnnouncement('Task deleted. Its history is preserved in Deleted tasks.'); }} />}
  </section>;
}
