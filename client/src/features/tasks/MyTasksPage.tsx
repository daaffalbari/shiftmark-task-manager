import { useEffect, useState } from 'react';
import { ListChecks, Plus } from 'lucide-react';
import type { ApiTask, TaskStatus, TaskView } from '@shiftmark/contracts';
import { listTasks } from './tasks.api';
import { StatusFilters } from './StatusFilters';
import { TaskList } from './TaskList';
import { CreateTaskDialog } from './CreateTaskDialog';
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
    let alive = true;
    setLoading(true); setError(false);
    listTasks(view).then((data) => { if (alive) setTasks(data); })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [attempt, view]);
  const shown = tasks.filter((task) => filter === 'all' || task.status === filter);
  return <section className={styles.page}>
    <header className={styles.pageHeader}><div><p className="eyebrow">WORKSPACE</p><h1>{deleted ? 'Deleted tasks' : 'My tasks'}</h1><p className={styles.subtitle}>{deleted ? 'Off your list. Still part of the record.' : 'Your work, with every status change accounted for.'}</p></div>{!deleted && <button className="primary" onClick={() => setCreating(true)}><Plus aria-hidden="true" />New task</button>}</header>
    <p className={styles.announcement} role="status" aria-live="polite">{announcement}</p>
    <StatusFilters tasks={tasks} selected={filter} onChange={setFilter} />
    <div className={styles.listCaption}><span>{loading ? 'Your tasks' : tasks.length + (tasks.length === 1 ? ' task' : ' tasks')}</span><span>{deleted ? 'Most recently deleted first' : 'Most recently updated first'}</span></div>
    {loading && !tasks.length ? <div className={styles.empty} role="status">Loading tasks…</div> : error ? <div className={styles.empty}><p role="alert">Could not load tasks.</p><button onClick={() => setAttempt(attempt + 1)}>Try again</button></div> :
      tasks.length === 0 ? <div className={styles.empty}><ListChecks aria-hidden="true" /><h3>{deleted ? 'No deleted tasks.' : 'Nothing on your list yet.'}</h3><p>{deleted ? 'Deleted tasks and their history will appear here.' : 'Create your first task to get started.'}</p>{!deleted && <button onClick={() => setCreating(true)}><Plus aria-hidden="true" />New task</button>}</div> :
      shown.length === 0 ? <div className={styles.empty}><h3>No tasks in this status.</h3><button onClick={() => setFilter('all')}>Clear filter</button></div> :
      <TaskList tasks={shown} onOpenTask={setSelected} />}
    {!deleted && <CreateTaskDialog open={creating} onClose={() => setCreating(false)} onCreated={() => { setFilter('all'); setAttempt(attempt + 1); setAnnouncement('Task created'); }} />}
    {selected && <TaskDetailSheet task={selected} readOnly={deleted} onClose={() => setSelected(null)} onTaskUpdated={(task) => { setSelected(task); setAttempt(attempt + 1); }} onDeleted={() => { setSelected(null); setAttempt(attempt + 1); setAnnouncement('Task deleted. Its history is preserved in Deleted tasks.'); }} />}
  </section>;
}
