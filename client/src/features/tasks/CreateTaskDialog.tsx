import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createTaskSchema, type ApiTask } from '@shiftmark/contracts';
import { useDialog } from '../../components/useDialog';
import { createTask } from './tasks.api';
import styles from './tasks.module.css';

export function CreateTaskDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (task: ApiTask) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const dialog = useDialog(open, input);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setTitle(''); setError(''); } }, [open]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const parsed = createTaskSchema.safeParse({ title });
    if (!parsed.success) { setError('Enter a title between 1 and 120 characters.'); return; }
    setBusy(true); setError('');
    try { onCreated(await createTask(parsed.data.title)); onClose(); }
    catch { setError('Could not create task. Please try again.'); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className={styles.createDialog} aria-labelledby="create-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <h2 id="create-title">New task</h2>
    <p className={styles.dialogIntro}>A small next step starts here.</p>
    <form onSubmit={submit} noValidate>
      <label htmlFor="task-title">Task title</label>
      <input ref={input} id="task-title" required aria-describedby={error ? 'create-error task-help' : 'task-help'} aria-invalid={!!error} value={title} onChange={(event) => setTitle(event.target.value)} />
      <p id="task-help" className={styles.help}>New tasks start as To do. Maximum 120 characters.</p>
      {error && <p id="create-error" role="alert" className="error">{error}</p>}
      <div className={styles.dialogActions}><button type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="primary" disabled={busy}>{busy ? 'Creating…' : 'Create task'}</button></div>
    </form>
  </dialog>;
}
