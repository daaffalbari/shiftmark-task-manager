import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createTaskSchema, type ApiMember, type ApiTask } from '@shiftmark/contracts';
import { ApiRequestError } from '../../api/http';
import { useDialog } from '../../components/useDialog';
import { createTask, editTask, getTask, listMembers } from './tasks.api';
import styles from './tasks.module.css';

export function TaskFormDialog({ open, task, actor, onClose, onSaved }: { open: boolean; task?: ApiTask; actor: ApiMember; onClose: () => void; onSaved: (task: ApiTask, changed: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const dialog = useDialog(open, input);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState<number | null>(null);
  const [version, setVersion] = useState(1);
  const [members, setMembers] = useState<ApiMember[] | null>(null);
  const [membersError, setMembersError] = useState(false);
  const [membersRetry, setMembersRetry] = useState(0);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const prefix = task ? 'edit' : 'create';
  function fill(current?: ApiTask) {
    setTitle(current?.title ?? ''); setDescription(current?.description ?? '');
    setAssigneeId(current?.assignee?.id ?? null); setVersion(current?.version ?? 1);
  }
  useEffect(() => { if (open) { fill(task); setError(''); setStale(false); } }, [open, task?.id]);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setMembers(null); setMembersError(false);
    listMembers().then((data) => { if (alive) setMembers(data); }).catch(() => { if (alive) setMembersError(true); });
    return () => { alive = false; };
  }, [open, membersRetry]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || stale || !members) return;
    const parsed = createTaskSchema.safeParse({ title, description, assigneeId, actorId: actor.id });
    if (!parsed.success) { setError(parsed.error.issues[0]?.path[0] === 'description' ? 'Keep the description within 2,000 characters.' : 'Enter a title between 1 and 120 characters.'); return; }
    setBusy(true); setError('');
    try {
      const result = task ? await editTask(task.id, { ...parsed.data, version }) : { task: await createTask(parsed.data), changed: true };
      onSaved(result.task, result.changed); onClose();
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'TASK_CHANGED') {
        setStale(true); setError('A teammate changed this task. Your draft has been kept. Reload latest to replace your draft with the current task.');
      } else if (error instanceof ApiRequestError && error.status === 404) {
        setStale(true); setError('This task is no longer editable. Your draft has been kept. Close and refresh the task.');
      } else setError(task ? 'Could not save changes. Please try again.' : 'Could not create task. Please try again.');
    } finally { setBusy(false); }
  }
  async function reload() {
    if (!task || busy) return;
    setBusy(true);
    try {
      const latest = await getTask(task.id);
      if (latest.deletedAt) { setError('This task has been deleted. Your draft has been kept.'); return; }
      fill(latest); setStale(false); setError('');
    } catch { setError('Could not reload task. Your draft has been kept. Try again.'); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className={styles.createDialog} aria-labelledby={prefix + '-title'} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <h2 id={prefix + '-title'}>{task ? 'Edit task' : 'New task'}</h2>
    <p className={styles.dialogIntro}>This {task ? 'edit' : 'task creation'} will be recorded as {actor.name}.</p>
    <form onSubmit={submit} noValidate>
      <label htmlFor={prefix + '-task-title'}>Task title</label>
      <input ref={input} id={prefix + '-task-title'} required maxLength={120} disabled={busy} value={title} onChange={(event) => setTitle(event.target.value)} />
      <label htmlFor={prefix + '-description'}>Description</label>
      <textarea id={prefix + '-description'} rows={3} maxLength={2000} disabled={busy} value={description} onChange={(event) => setDescription(event.target.value)} aria-describedby={prefix + '-description-help'} />
      <p id={prefix + '-description-help'} className={styles.help}>Optional. Maximum 2,000 characters.</p>
      <label htmlFor={prefix + '-assignee'}>Assignee</label>
      <select id={prefix + '-assignee'} value={assigneeId ?? ''} disabled={busy || !members} onChange={(event) => setAssigneeId(event.target.value ? Number(event.target.value) : null)}>
        <option value="">Unassigned</option>{members?.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
      </select>
      {!members && !membersError && <p role="status" className={styles.help}>Loading team members…</p>}
      {membersError && <div><p role="alert" className="error">Could not load team members.</p><button type="button" onClick={() => setMembersRetry(membersRetry + 1)}>Retry members</button></div>}
      {!task && <p className={styles.help}>New tasks start as To do.</p>}
      {error && <p role="alert" className="error">{error}</p>}
      {stale && <button type="button" onClick={reload} disabled={busy}>Reload latest</button>}
      <div className={styles.dialogActions}><button type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="primary" disabled={busy || stale || !members}>{busy ? 'Saving…' : task ? 'Save changes' : 'Create task'}</button></div>
    </form>
  </dialog>;
}
