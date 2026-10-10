import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import type { ApiUser } from '@shiftmark/contracts';
import { ApiRequestError } from '../api/http';
import { AppShell } from '../components/AppShell';
import { getMe } from '../features/auth/auth.api';
import { LoginPage } from '../features/auth/LoginPage';
import { MyTasksPage } from '../features/tasks/MyTasksPage';

export function App() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const navigate = useNavigate();
  useEffect(() => {
    let alive = true;
    const expired = () => { setUser(null); setMessage('Your session has ended. Please sign in again.'); };
    window.addEventListener('shiftmark:unauthorized', expired);
    const check = async () => {
      try { const current = await getMe(); if (alive) { setUser(current); setError(false); } }
      catch (error) { if (alive) setError(!(error instanceof ApiRequestError && error.status === 401)); }
      finally { if (alive) setChecking(false); }
    };
    void check();
    window.addEventListener('focus', check);
    return () => { alive = false; window.removeEventListener('shiftmark:unauthorized', expired); window.removeEventListener('focus', check); };
  }, [attempt]);
  if (checking) return <main className="loading-page" role="status">Opening your workspace…</main>;
  if (error && !user) return <main className="loading-page"><p role="alert">Could not open your workspace.</p><button onClick={() => { setChecking(true); setAttempt(attempt + 1); }}>Try again</button></main>;
  const signedOut = () => { setUser(null); setMessage(''); navigate('/login', { replace: true }); };
  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/tasks" replace /> : <LoginPage message={message} onSignedIn={(current) => { setUser(current); setMessage(''); navigate('/tasks', { replace: true }); }} />} />
    <Route path="/tasks" element={user ? <AppShell key={user.id} user={user} onSignedOut={signedOut}><MyTasksPage /></AppShell> : <Navigate to="/login" replace />} />
    <Route path="*" element={<Navigate to={user ? '/tasks' : '/login'} replace />} />
  </Routes>;
}
