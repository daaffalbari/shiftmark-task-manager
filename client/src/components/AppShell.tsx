import { useState, type ReactNode } from 'react';
import { ListChecks, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ApiUser } from '@shiftmark/contracts';
import { signOut } from '../features/auth/auth.api';

export function AppShell({ user, onSignedOut, children }: { user: ApiUser; onSignedOut: () => void; children: ReactNode }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    if (busy) return;
    setBusy(true); setError('');
    try { await signOut(); onSignedOut(); }
    catch { setError('Could not sign out. Try again.'); }
    finally { setBusy(false); }
  }
  return <div className="workspace">
    <aside className="sidebar">
      <Link className="brand" to="/tasks" aria-label="shiftmark home"><ListChecks aria-hidden="true" />shiftmark<span className="brand-dot">.</span></Link>
      <nav aria-label="Workspace"><Link className="nav-link active" to="/tasks"><ListChecks aria-hidden="true" />My tasks</Link></nav>
      <div className="account">
        <div className="account-identity"><span className="avatar" aria-hidden="true">{user.name.split(' ').map((part) => part[0]).join('')}</span><div><strong>{user.name}</strong><span>{user.email}</span></div></div>
        <button className="signout" onClick={logout} disabled={busy}><LogOut aria-hidden="true" />{busy ? 'Signing out…' : 'Sign out'}</button>
        {error && <p role="alert" className="error">{error}</p>}
      </div>
    </aside>
    <main className="main-content">{children}</main>
  </div>;
}
