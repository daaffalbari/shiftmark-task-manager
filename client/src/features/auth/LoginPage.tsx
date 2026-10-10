import { useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { ApiUser } from '@shiftmark/contracts';
import { ApiRequestError } from '../../api/http';
import { signIn } from './auth.api';

export function LoginPage({ onSignedIn, message }: { onSignedIn: (user: ApiUser) => void; message?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try { onSignedIn(await signIn(email, password)); }
    catch (error) {
      setError(error instanceof ApiRequestError && error.status === 401 ? 'Invalid email or password.' : 'Could not sign in. Please try again.');
      setRevealed(false);
    } finally { setBusy(false); }
  }
  return <main className="login-page">
    <div className="login-content">
      <div className="brand"><img src="/logo.svg" alt="shiftmark" width="1140" height="212" /></div>
      <div className="login-heading"><p className="eyebrow">YOUR PRIVATE WORKSPACE</p><h1>Sign in to shiftmark</h1><p>Pick up where you left off.</p></div>
      {message && <p role="status" className="notice">{message}</p>}
      <form onSubmit={submit}>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="password">Password</label>
        <div className="password-field">
          <input id="password" type={revealed ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          <button type="button" className="icon-button" aria-label={revealed ? 'Hide password' : 'Show password'} onClick={() => setRevealed(!revealed)}>{revealed ? <EyeOff /> : <Eye />}</button>
        </div>
        {error && <p role="alert" className="error">{error}</p>}
        <button className="primary login-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="login-footer">Your work. A clear path. Every change accounted for.</p>
    </div>
  </main>;
}
