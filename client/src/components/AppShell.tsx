import { useState, type ReactNode } from 'react';
import { ListChecks, PanelLeftClose, PanelLeftOpen, Trash2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ApiMember } from '@shiftmark/contracts';

export function AppShell({ members, actor, onActorChange, children }: { members: ApiMember[]; actor: ApiMember; onActorChange: (id: number) => void; children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [params] = useSearchParams();
  const deleted = params.get('view') === 'deleted';
  return <div className="workspace" data-sidebar-open={sidebarOpen}>
    <button className="sidebar-toggle" type="button" aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'} title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'} aria-expanded={sidebarOpen} aria-controls="workspace-sidebar" onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? <PanelLeftClose aria-hidden="true" /> : <PanelLeftOpen aria-hidden="true" />}</button>
    <aside id="workspace-sidebar" className="sidebar">
      <Link className="brand" to="/tasks" aria-label="shiftmark home"><img src="/logo.svg" alt="shiftmark" width="1140" height="212" /></Link>
      <nav aria-label="Workspace"><Link className={'nav-link' + (!deleted ? ' active' : '')} aria-current={!deleted ? 'page' : undefined} to="/tasks"><ListChecks aria-hidden="true" />Team tasks</Link><Link className={'nav-link' + (deleted ? ' active' : '')} aria-current={deleted ? 'page' : undefined} to="/tasks?view=deleted"><Trash2 aria-hidden="true" />Deleted tasks</Link></nav>
    </aside>
    <main className="main-content"><div className="workspace-toolbar"><label htmlFor="workspace-actor">Acting as<select id="workspace-actor" value={actor.id} onChange={(event) => onActorChange(Number(event.target.value))} aria-describedby="actor-help">{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><p id="actor-help">Used to record who makes each change.</p></div>{children}</main>
  </div>;
}
