import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { ApiMember } from '@shiftmark/contracts';

export function ActorPicker({ members, actor, onChange }: { members: ApiMember[]; actor: ApiMember; onChange: (id: number) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef({ text: '', time: 0 });
  const selected = members.findIndex((member) => member.id === actor.id);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(selected);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  useEffect(() => {
    if (open) document.getElementById('actor-option-' + members[active]!.id)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  function close() { setOpen(false); search.current.text = ''; }
  function choose(index: number) {
    if (members[index]!.id !== actor.id) onChange(members[index]!.id);
    close();
  }
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const key = event.key;
    if (key === 'Tab') { if (open) choose(active); return; }
    if (key === 'Escape') { if (open) { event.preventDefault(); close(); } return; }
    if (event.ctrlKey || event.metaKey) return;
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(key)) {
      event.preventDefault();
      search.current.text = '';
      if (open && (key === 'Enter' || key === ' ' || (key === 'ArrowUp' && event.altKey))) { choose(active); return; }
      if (key === 'ArrowDown' && event.altKey) { if (!open) setActive(selected); setOpen(true); return; }
      setOpen(true);
      if (key === 'Home') setActive(0);
      else if (key === 'End') setActive(members.length - 1);
      else if (key === 'ArrowDown') setActive(open ? Math.min(active + 1, members.length - 1) : selected);
      else if (key === 'ArrowUp') setActive(open ? Math.max(active - 1, 0) : 0);
      else setActive(selected);
    } else if (key.length === 1 && !event.altKey) {
      event.preventDefault();
      const text = (Date.now() - search.current.time < 500 ? search.current.text : '') + key.toLowerCase();
      search.current = { text, time: Date.now() };
      const repeated = [...text].every((letter) => letter === text[0]);
      const prefix = repeated ? key.toLowerCase() : text;
      const start = open && repeated ? active + 1 : 0;
      const match = members.map((_, index) => (index + start) % members.length).find((index) => members[index]!.name.toLowerCase().startsWith(prefix));
      setOpen(true);
      setActive(match ?? (open ? active : selected));
    }
  }

  return <div className="actor-picker" ref={root}>
    <label id="actor-label" htmlFor="workspace-actor">Acting as</label>
    <div className="actor-field">
      <button ref={trigger} id="workspace-actor" type="button" className="actor-trigger" role="combobox" aria-labelledby="actor-label" aria-describedby="actor-help" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? 'actor-options' : undefined} aria-activedescendant={open ? 'actor-option-' + members[active]!.id : undefined} onKeyDown={onKeyDown} onBlur={close} onClick={() => { setActive(selected); search.current.text = ''; setOpen(!open); }}>
        <span className="actor-avatar" aria-hidden="true">{actor.name.split(' ').map((part) => part[0]).join('')}</span><span className="actor-name">{actor.name}</span><ChevronDown aria-hidden="true" />
      </button>
      {open && <div className="actor-menu"><p className="actor-menu-heading">Choose actor</p><ul id="actor-options" role="listbox" aria-labelledby="actor-label">
        {members.map((member, index) => <li key={member.id} id={'actor-option-' + member.id} role="option" aria-selected={member.id === actor.id} data-active={index === active} onMouseMove={() => setActive(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => { choose(index); trigger.current?.focus(); }}>
          <span className="actor-avatar" aria-hidden="true">{member.name.split(' ').map((part) => part[0]).join('')}</span><span className="actor-name">{member.name}</span>{member.id === actor.id && <Check aria-hidden="true" />}
        </li>)}
      </ul></div>}
    </div>
    <p id="actor-help">Used to record who makes each change.</p>
  </div>;
}
