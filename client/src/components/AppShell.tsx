import { useState, type ReactNode } from 'react';
import { ChevronRight, ListChecks, PanelLeftClose, PanelLeftOpen, Trash2, UsersRound } from 'lucide-react';
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
      <div className="workspace-identity"><span className="workspace-icon"><UsersRound aria-hidden="true" /></span><div><strong>Internal team</strong><span>Shared workspace</span></div></div>
      <nav aria-label="Workspace"><p className="nav-heading">WORKSPACE</p><Link className={'nav-link' + (!deleted ? ' active' : '')} aria-current={!deleted ? 'page' : undefined} to="/tasks"><ListChecks aria-hidden="true" />Team tasks</Link><Link className={'nav-link' + (deleted ? ' active' : '')} aria-current={deleted ? 'page' : undefined} to="/tasks?view=deleted"><Trash2 aria-hidden="true" />Deleted tasks</Link></nav>
      <div className="sidebar-team"><div className="team-avatars" aria-hidden="true">{members.map((member) => <span key={member.id} title={member.name}>{member.name.split(' ').map((part) => part[0]).join('')}</span>)}</div><strong>{members.length} team {members.length === 1 ? 'member' : 'members'}</strong><p>One shared view of the work.</p></div>
    </aside>
    <main className="main-content"><div className="workspace-toolbar"><p className="workspace-path">Workspace<ChevronRight aria-hidden="true" /><span>{deleted ? 'Deleted tasks' : 'Team tasks'}</span></p><div className="actor-control"><span className="actor-avatar" aria-hidden="true">{actor.name.split(' ').map((part) => part[0]).join('')}</span><div><label htmlFor="workspace-actor">Acting as</label><select id="workspace-actor" value={actor.id} onChange={(event) => onActorChange(Number(event.target.value))} aria-describedby="actor-help">{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><p id="actor-help">Used to record who makes each change.</p></div></div></div>{children}</main>
  </div>;
}
