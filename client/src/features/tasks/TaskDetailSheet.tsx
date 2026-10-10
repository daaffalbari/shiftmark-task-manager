import { useEffect, useRef, useState } from 'react';
import { Check, ArrowRight, Pencil, RefreshCw, Trash2, X } from 'lucide-react';
import { taskStatuses, type ApiTask, type ApiAuditLog } from '@shiftmark/contracts';
import { ApiRequestError } from '../../api/http';
import { useDialog } from '../../components/useDialog';
import { changeStatus, deleteTask, getAuditLogs, getTask } from './tasks.api';
import { StatusChip, statusLabels, formatTimestamp } from './status';
import { AuditTimeline } from './AuditTimeline';
import { DeleteTaskDialog } from './DeleteTaskDialog';
import { TaskFormDialog } from './TaskFormDialog';
import styles from './tasks.module.css';

export function TaskDetailSheet({ task, onClose, onTaskUpdated, readOnly, onDeleted }: {
  task: ApiTask | null; onClose: () => void; onTaskUpdated: (task: ApiTask) => void; readOnly: boolean; onDeleted?: () => void;
}) {
  const close = useRef<HTMLButtonElement>(null);
  const dialog = useDialog(!!task, close);
  const [current, setCurrent] = useState(task);
  const [logs, setLogs] = useState<ApiAuditLog[] | null>(null);
  const [auditError, setAuditError] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  useEffect(() => { setCurrent(task); }, [task]);
  useEffect(() => {
    const refresh = (event: Event) => { if (event.target === window) setRetry((value) => value + 1); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  useEffect(() => {
    if (!task) return;
    let alive = true;
    setLogs(null); setAuditError(false);
    Promise.all([getTask(task.id), getAuditLogs(task.id)]).then(([latest, history]) => {
      if (alive) { setCurrent(latest); setLogs(history); if (latest.version !== task.version) onTaskUpdated(latest); }
    })
      .catch(() => { if (alive) setAuditError(true); });
    return () => { alive = false; };
  }, [task?.id, task?.version, retry]);

  async function refresh() {
    const [found, history] = await Promise.all([getTask(current!.id), getAuditLogs(current!.id)]);
    setCurrent(found); setLogs(history); setAuditError(false); onTaskUpdated(found);
  }
  const index = current ? taskStatuses.indexOf(current.status) : 0;
  const next = taskStatuses[index + 1];
  const locked = readOnly || !!current?.deletedAt;
  async function advance() {
    if (busy || !current || !next || locked) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await changeStatus(current.id, next);
      await refresh();
      setNotice(result.changed ? 'Status updated.' : 'Status is already up to date.');
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 409) {
        setNotice('Status changed elsewhere. Refreshing task…');
        try { await refresh(); } catch { setError('Could not refresh task. Please try again.'); }
      } else { setError('Could not update task. Please try again.'); }
    } finally { setBusy(false); }
  }
  return <><dialog ref={dialog} className={styles.sheet} aria-labelledby="detail-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    {current && <>
      <div className={styles.sheetHeader}><div><p className="eyebrow">TASK DETAILS <span className={styles.taskId}>#{current.id}</span></p><h2 id="detail-title">{current.title}</h2></div><button ref={close} className="icon-button" aria-label="Close task details" onClick={onClose} disabled={busy}><X /></button></div>
      <section className={styles.taskInfo} aria-label="Task information">
        <div className={styles.sectionHeading}><h3>Task information</h3>{!locked && <button onClick={() => setEditing(true)} disabled={busy}><Pencil aria-hidden="true" />Edit details</button>}</div>
        <p className={styles.description}>{current.description || 'No description yet.'}</p>
        <dl className={styles.metadata}>
          <div><dt>Assignee</dt><dd>{current.assignee?.name ?? 'Unassigned'}</dd></div>
          <div><dt>Created by</dt><dd>{current.createdBy.name}<time dateTime={current.createdAt}>{formatTimestamp(current.createdAt)}</time></dd></div>
          <div><dt>Last updated by</dt><dd>{current.updatedBy.name}<time dateTime={current.updatedAt}>{formatTimestamp(current.updatedAt)}</time></dd></div>
        </dl>
      </section>
      <section className={styles.statusSection} aria-label="Current status">
        <div className={styles.sectionHeading}><h3>Current status</h3><span>Step {index + 1} of 4</span></div>
        <StatusChip status={current.status} />
        <ol className={styles.workflow} aria-label="Task workflow">{taskStatuses.map((status, i) => <li key={status} aria-current={i === index ? 'step' : undefined} className={i <= index ? styles.reached : ''}><span>{i < index ? <Check aria-hidden="true" /> : i + 1}</span><p>{statusLabels[status]}</p></li>)}</ol>
        {!locked && next ? <button className={'primary ' + styles.transitionButton} disabled={busy} onClick={advance}>{busy ? 'Updating…' : next === 'done' ? 'Mark as Done' : 'Move to ' + statusLabels[next]}<ArrowRight aria-hidden="true" /></button> : !locked && <p className={styles.complete}><Check aria-hidden="true" />This task is complete.</p>}
        {notice && <p role="status" className={styles.feedback}>{notice}</p>}
        {error && <p role="alert" className="error">{error}</p>}
      </section>
      <section className={styles.history}><div className={styles.sectionHeading}><h3>Activity history</h3><button className={styles.refreshButton} disabled={busy} onClick={() => setRetry((value) => value + 1)}><RefreshCw aria-hidden="true" />Refresh task</button></div><p className={styles.historyIntro}>Who changed what, and when. Oldest first.</p>
        {auditError ? <div><p role="alert" className="error">Could not load history.</p><button onClick={() => setRetry(retry + 1)}>Try again</button></div> : logs === null ? <p role="status">Loading history…</p> : <AuditTimeline logs={logs} />}
      </section>
      <footer className={styles.sheetFooter}>{current.deletedAt ? <p>Deleted on <time dateTime={current.deletedAt}>{formatTimestamp(current.deletedAt)}</time>. Full activity history is preserved.</p> : !locked && <button className="danger-text" disabled={busy} onClick={() => setDeleting(true)}><Trash2 aria-hidden="true" />Delete task</button>}</footer>
    </>}
  </dialog>{editing && current && <TaskFormDialog open task={current} onClose={() => { setEditing(false); setRetry((value) => value + 1); }} onSaved={(updated, changed) => { setCurrent(updated); onTaskUpdated(updated); setNotice(changed ? 'Task details updated.' : 'No changes to save.'); }} />}{deleting && <DeleteTaskDialog task={current} onCancel={() => setDeleting(false)} onConfirm={async () => { await deleteTask(current!.id); onDeleted ? onDeleted() : onClose(); }} />}</>;
}
