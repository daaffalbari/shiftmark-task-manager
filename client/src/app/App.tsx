import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import type { ApiMember } from '@shiftmark/contracts';
import { AppShell } from '../components/AppShell';
import { MyTasksPage } from '../features/tasks/MyTasksPage';
import { listMembers } from '../features/tasks/tasks.api';

export function App() {
  const [members, setMembers] = useState<ApiMember[]>([]);
  const [actorId, setActorId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(false);
    listMembers().then((data) => { if (alive) { setMembers(data); setActorId(data[0]?.id ?? 0); } })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [attempt]);
  if (loading) return <main className="loading-page" role="status">Opening your workspace…</main>;
  if (error || !members.length) return <main className="loading-page"><p role="alert">{error ? 'Could not load actors.' : 'No predefined actors are available.'}</p><button onClick={() => setAttempt(attempt + 1)}>Try again</button></main>;
  const actor = members.find((member) => member.id === actorId)!;
  return <Routes>
    <Route path="/tasks" element={<AppShell members={members} actor={actor} onActorChange={setActorId}><TasksRoute actor={actor} /></AppShell>} />
    <Route path="*" element={<Navigate to="/tasks" replace />} />
  </Routes>;
}

function TasksRoute({ actor }: { actor: ApiMember }) {
  const [params] = useSearchParams();
  const view = params.get('view') === 'deleted' ? 'deleted' : 'active';
  return <MyTasksPage key={view} view={view} actor={actor} />;
}
