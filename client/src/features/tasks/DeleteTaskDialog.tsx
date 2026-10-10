import { useRef, useState } from 'react';
import type { ApiTask } from '@shiftmark/contracts';
import { useDialog } from '../../components/useDialog';
import styles from './tasks.module.css';

export function DeleteTaskDialog({ task, onCancel, onConfirm }: { task: ApiTask | null; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const cancel = useRef<HTMLButtonElement>(null);
  const dialog = useDialog(!!task, cancel);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function confirm() {
    if (busy) return;
    setBusy(true); setError('');
    try { await onConfirm(); }
    catch { setError('Could not delete task. Please try again.'); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className={styles.createDialog} aria-labelledby="delete-title" aria-describedby="delete-description" onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id="delete-title" className={styles.deleteTitle}>Delete “{task?.title}”?</h2>
    <p id="delete-description" className={styles.dialogIntro}>The task will leave Team tasks for everyone. Its full activity history will be preserved in Deleted tasks.</p>
    {error && <p role="alert" className="error">{error}</p>}
    <div className={styles.dialogActions}><button ref={cancel} onClick={onCancel} disabled={busy}>Cancel</button><button className="danger" disabled={busy} onClick={confirm}>{busy ? 'Deleting…' : 'Delete task'}</button></div>
  </dialog>;
}
