import { useState, type ReactNode } from 'react';
import { ListChecks, LogOut, Trash2, UserRound } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ApiUser } from '@shiftmark/contracts';
import { signOut } from '../features/auth/auth.api';

export function AppShell({ user, onSignedOut, children }: { user: ApiUser; onSignedOut: () => void; children: ReactNode }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [params] = useSearchParams();
  const deleted = params.get('view') === 'deleted';
  async function logout() {
    if (busy) return;
    setBusy(true); setError('');
    try { await signOut(); onSignedOut(); }
    catch { setError('Could not sign out. Try again.'); }
    finally { setBusy(false); }
  }
  return <div className="workspace">
    <aside className="sidebar">
      <Link className="brand" to="/tasks" aria-label="shiftmark home"><img src="/logo.svg" alt="shiftmark" width="1140" height="212" /></Link>
      <nav aria-label="Workspace"><Link className={'nav-link' + (!deleted ? ' active' : '')} aria-current={!deleted ? 'page' : undefined} to="/tasks"><ListChecks aria-hidden="true" />My tasks</Link><Link className={'nav-link' + (deleted ? ' active' : '')} aria-current={deleted ? 'page' : undefined} to="/tasks?view=deleted"><Trash2 aria-hidden="true" />Deleted tasks</Link></nav>
      <div className="account" data-expanded={accountOpen}>
        <button className="account-toggle icon-button" aria-label="Account" aria-expanded={accountOpen} aria-controls="account-identity" onClick={() => setAccountOpen(!accountOpen)}><UserRound aria-hidden="true" /></button>
        <div id="account-identity" className="account-identity"><span className="avatar" aria-hidden="true">{user.name.split(' ').map((part) => part[0]).join('')}</span><div><strong>{user.name}</strong><span>{user.email}</span></div></div>
        <button className="signout" onClick={logout} disabled={busy}><LogOut aria-hidden="true" />{busy ? 'Signing out…' : 'Sign out'}</button>
        {error && <p role="alert" className="error">{error}</p>}
      </div>
    </aside>
    <main className="main-content">{children}</main>
  </div>;
}
