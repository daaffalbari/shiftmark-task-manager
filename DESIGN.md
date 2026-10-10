# shiftmark — Mini Task Manager
## Product & UI Design Specification

**Status:** Design direction for implementation  
**Date:** 2026-10-10  
**Audience:** Full-stack engineer / code-generation agent  
**Companion plan:** `docs/superpowers/plans/2026-10-10-mini-task-manager.md`

> **One-line brief:** An internal, task-first workspace where the *current status* is immediately understandable and its *history* is unmistakably shiftmarkable.

## 1. Product boundary

shiftmark is a deliberately small authenticated task manager. Users sign in to a private workspace, create tasks, move them through a strict workflow, inspect each task's immutable status-change history, and soft-delete tasks without losing their history.

**In scope:** seeded users and real session login; logout; personal active/deleted task lists; task creation; strictly sequential status updates; chronological per-task audit logs; responsive desktop/mobile UI; empty/loading/error states.

**Out of scope:** sign-up, role management, public user profiles, task assignments or collaboration, due dates, priorities, comments, attachments, notifications, charts, kanban drag-and-drop, global activity feed, dark mode, animation-heavy landing page.

**Non-negotiable product rules:**
- `to_do → pending → in_progress → done`, exactly one step at a time; `done` is terminal.
- Updating to the same status succeeds *without* a status change or new audit log.
- Any real status change commits the task update and its audit-log insert together.
- Audit records cannot be updated/deleted; soft-deleting a task never deletes its history.
- Authenticated users may view/change only their own tasks. The backend obtains the actor from the session, not the browser request body.
- The history displays **oldest → newest**; equal timestamps are ordered by audit-log ID.

## 2. Reference research — what to learn, not copy

Research reviewed on **2026-10-10**. References are inspiration, not reusable licensed assets. We will implement original layouts/components, not reproduce another designer's screens.

| Source | What is relevant | What shiftmark adopts | What shiftmark explicitly avoids |
|---|---|---|---|
| [Behance — Task Management App Dashboard, Jahangir Hussain (2025)](https://www.behance.net/gallery/237809781/Task-Management-App-Dashboard-UI-UX) | Readable task hierarchy, list/table modes, clear filters | Task-first list, strong task-title hierarchy, concise filtering | Five view modes, project/team controls, extra metadata |
| [Behance — Task Management System Dashboard, Abdullah Walid (2024)](https://www.behance.net/gallery/209914309/Task-Management-System-Dashboard-Web-App) | Minimal work-management UI and scannable status cues | Clear status labels and action placement | Multi-user assignment, priority fields, deadlines, kanban |
| [Figma Community — Task Tracker Dashboard by Noda](https://www.figma.com/community/file/1522627150217529073/dashboard) ([creator's public preview](https://dribbble.com/shots/26424127-Task-Tracker-Dashboard)) | A practical dashboard kit described with task lists and an activity feed; graphite/gray foundations | Quiet neutral surfaces, restrained information density, first-class audit activity | Copying its visual identity or introducing generic KPI cards |
| [Figma Community — Berry Free Dashboard UI Kit](https://www.figma.com/community/file/1468460364009262125/berry-free-dashboard-ui-kit) ([publicly shared reference](https://www.reddit.com/r/FigmaCommunity/comments/1tdsie0/useful_free_figma_dashboard_ui_kit_for_saasadmin/)) | General-purpose reusable dashboard components | Component discipline and consistent spacing, *not* a template | Copy/pasting all dashboard navigation or analytics features |
| [Linear — Issues documentation](https://linear.app/docs/creating-issues) | Issue title/status as core information; fast issue creation; status changes represented as activity | Minimal creation flow and history adjacent to the task | Team/project complexity and command menus in v1 |

**Research limitation:** Direct automated previews of Figma Community file canvases were restricted. The Noda file URL was verified from the creator's linked public Dribbble preview; Berry was identified from a public post pointing to the Community file. Descriptions of those files are grounded in those public previews/posts, **not** a claim to have inspected every screen inside Figma. Behance observations are grounded in published project pages and accessible image/search previews.

**Color/accessibility grounding:** [Radix Colors: understanding scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) informed the separation of surfaces, borders, interactive and text tones. [WCAG 2.2 SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) provides the 4.5:1 normal-text and 3:1 large-text contrast targets.

## 3. Visual concept — “Quiet Workspace”

**Design character:** precise, calm, editorial, slightly warm, trustworthy. Think a well-maintained internal tool, *not* a marketing SaaS landing page.

**Visual principles:**
1. **Work before decoration.** The task list appears immediately; no hero illustration, welcome banner, fake KPIs, donut charts, or 3D mascots.
2. **One signature color.** Evergreen marks primary actions and active navigation; status colors are functional and limited to chips and small indicators.
3. **Typography does the hierarchy.** The title, section labels and restrained metadata do the work instead of elevated cards or bright backgrounds.
4. **Density with breathing room.** Readable rows and clear alignment; avoid giant empty padded cards and microscopic enterprise tables.
5. **shiftmarkability is visual, not hidden.** The detail panel includes the current state, the next valid action, and a chronological activity timeline.
6. **No fake UI.** Every visible navigation item, count, button and timestamp must be functional and driven by real API data.

**App name:** `shiftmark` (working product name; replaceable without changing the layout). Wordmark is text plus a very small line/check icon, not an elaborate logo.

**Copy language:** English throughout the interface; short, explicit, unambiguous. E.g. `My tasks`, `New task`, `View history`, `Move to In progress`, `Deleted tasks`.

## 4. Color system (light theme, v1)

Palette: **warm neutral + evergreen ink**. These are *custom design choices* checked against WCAG contrast formulas, not palette values claimed to come from Behance/Figma.

### Foundation tokens

| CSS token | Hex | Application |
|---|---|---|
| `--color-canvas` | `#F7F8F5` | Application background |
| `--color-sidebar` | `#F5F7F4` | Left navigation surface |
| `--color-surface` | `#FFFFFF` | Task list, dialogs, details |
| `--color-surface-muted` | `#F0F3EF` | Subtle hover, small sections |
| `--color-border` | `#DDE5DE` | Dividers and quiet outlines |
| `--color-text` | `#182520` | Main text, titles |
| `--color-text-muted` | `#52635C` | Secondary text, timestamps |
| `--color-primary` | `#1F5B4A` | Primary buttons, active navigation |
| `--color-primary-hover` | `#174637` | Primary-button hover |
| `--color-primary-soft` | `#E8F1EC` | Subtle selected backgrounds |
| `--color-danger` | `#9E293B` | Destructive text / action |
| `--color-danger-soft` | `#FEF1F1` | Destructive feedback |
| `--color-focus` | `#1F5B4A` | Visible 2px keyboard focus ring |

### Status semantics

| Machine status | UI label | Background | Foreground | Meaning |
|---|---|---|---|---|
| `to_do` | `To do` | `#EEF2F0` | `#485A55` | Not started; neutral |
| `pending` | `Pending` | `#FFF1D7` | `#81570E` | Waiting; warm amber |
| `in_progress` | `In progress` | `#E9F0FF` | `#2454A2` | Active work; blue |
| `done` | `Done` | `#E2F2E8` | `#1F6A49` | Completed; green |

**Checked contrast ratios** (normal-size text on stated backgrounds): main text/white **15.86:1**; muted text/white **6.37:1**; white/primary button **7.91:1**; `to_do` **6.48:1**; `pending` **5.70:1**; `in_progress` **6.41:1**; `done` **5.63:1**; danger/danger-soft **6.73:1**. Recheck any changed tokens before release.

Do not communicate status by color alone: display the written status label on every chip, and a textual transition in every audit entry.

### Recommended CSS custom properties

```css
:root {
  color-scheme: light;
  --color-canvas: #f7f8f5;
  --color-sidebar: #f5f7f4;
  --color-surface: #ffffff;
  --color-surface-muted: #f0f3ef;
  --color-border: #dde5de;
  --color-text: #182520;
  --color-text-muted: #52635c;
  --color-primary: #1f5b4a;
  --color-primary-hover: #174637;
  --color-primary-soft: #e8f1ec;
  --color-danger: #9e293b;
  --color-danger-soft: #fef1f1;
  --color-focus: #1f5b4a;
  --status-todo-bg: #eef2f0;
  --status-todo-text: #485a55;
  --status-pending-bg: #fff1d7;
  --status-pending-text: #81570e;
  --status-progress-bg: #e9f0ff;
  --status-progress-text: #2454a2;
  --status-done-bg: #e2f2e8;
  --status-done-text: #1f6a49;
}
```

## 5. Typography, shape, spacing

- **Primary type:** `IBM Plex Sans`, with `system-ui, sans-serif` fallback. Functional, readable, not oversized. Do not load many font weights: 400, 500, 600.
- **Data/metadata:** `IBM Plex Mono`, with `ui-monospace, monospace` fallback, sparingly for `#task-id` and exact timestamps. Avoid monospace for paragraphs.
- **Scale:** page heading `28px/36px, 600`; detail title `22px/30px, 600`; section heading `16px/24px, 600`; body `14px/22px`; secondary/meta `12px/18px`; small button `13px/20px, 600`.
- **Spacing:** 4px base; page padding 36–40px desktop, 20px tablet, 16px mobile. Section gaps 24–32px; rows 64–72px.
- **Shape:** border radius `10px` controls/cards, `14px` dialogs/sheets, full pill for status chips. Avoid round-24 floating containers everywhere.
- **Borders:** 1px neutral dividers. A single subtle shadow on floating dialogs only. No glassmorphism, blurred glowing edges, gratuitous gradients, or large colored shadows.
- **Icons:** optional `lucide-react`, 16–18px, consistent 1.75–2px stroke. Text labels remain visible; do not make icon-only navigation.
- **Motion:** 120–180ms opacity/transform transitions for sheets and micro-interactions; disable on `prefers-reduced-motion: reduce`. No spring/bounce effect.

## 6. Information architecture

Only two substantive application destinations:

1. **My tasks** (`/tasks`): active tasks, filters and create action.
2. **Deleted tasks** (`/tasks?view=deleted`): read-only soft-deleted tasks with accessible history.

Plus **Sign in** (`/login`) and the bottom-of-sidebar **account/logout** control. The signed-in identity is visible as name + email (not an editable profile page).

No `Dashboard`, `Analytics`, `Team`, `Calendar`, `Settings`, or disabled placeholder links.

## 7. Screens and layout

### 7.1 Desktop workspace (≥ 1024px)

- Fixed **208px sidebar** with `shiftmark` wordmark (top), `My tasks` and `Deleted tasks` nav entries, account/logout (bottom).
- Main background `--color-canvas`; max content width **1100px**, content padding 40px.
- Header: small eyebrow `WORKSPACE` optional; prominent `My tasks`; one-line supporting count; single primary `+ New task` button right aligned.
- Status filter strip: `All`, `To do`, `Pending`, `In progress`, `Done`, each with a real count. Counts are derived from active owned tasks, not mock metrics.
- List in **one white surface** with quiet 1px outer border; table-like rows with `Task / Status / Updated / Open` headings; do not create a card for each task.
- Row: task name (single line with ellipsis), subtle `#ID`, status chip, absolute last-updated timestamp, accessible `View details` button. Hover changes background subtly; focus is clearly outlined.
- Task detail opens in a **420–440px right modal sheet**, visually anchored to the right and slightly shadowed. The background list remains visible but inert while the native modal `<dialog>` is open.

```text
┌──────────────┬─────────────────────────────────────────────────────────────────────┐
│ shiftmark        │ WORKSPACE                                      [ + New task ]       │
│              │ My tasks                                                            │
│ ● My tasks   │ Your work, with every status change accounted for.                 │
│   Deleted    │                                                                     │
│   tasks      │ [ All 12 ] [ To do 4 ] [ Pending 3 ] [ In progress 3 ] [ Done 2 ]  │
│              │ ┌─────────────────────────────────────────────────────────────────┐ │
│              │ │ TASK                            STATUS         UPDATED          │ │
│              │ │ Prepare invoice   #104          Pending        10 Oct, 14:30    │ │
│              │ │ Review API rules  #103          In progress    10 Oct, 12:10    │ │
│              │ │ Write release note #102         To do          09 Oct, 17:02   │ │
│              │ └─────────────────────────────────────────────────────────────────┘ │
│              │                                                                     │
│ John Doe     │                                                                     │
│ Sign out     │                                                                     │
└──────────────┴─────────────────────────────────────────────────────────────────────┘
```

These wireframes show **layout**, not implementation or additional product features.

### 7.2 Detail sheet: the signature interaction

Order of information must be consistent:

1. Task title and small `#ID`; close control.
2. `Current status` with explicit chip and progress text `Step 2 of 4` (not an invented percentage).
3. Simple ordered four-stage track: To do → Pending → In progress → Done. Completed stages get a quiet check; current stage is emphasized.
4. One contextual action: `Move to Pending`, `Move to In progress`, or `Mark as Done`. When status is `done`, show `This task is complete.` and **no** next-step action.
5. Divider and `Status history` with chronological timeline; each entry names actor, old status, new status and full absolute timestamp. Example: `John Doe moved this task from To do to Pending · 10 Oct 2026, 14:30 GMT+7`.
6. Quiet danger-zone footer: `Delete task` (only for active tasks). Deleted tasks show `Deleted on ...` instead and history remains readable.

**Audit empty state:** `No status changes yet. This task started as To do.` Never create a fake “task created” status log.

**Audit timeline:** oldest first, newest last, with a vertical hairline and solid-dot markers; 1px dividers, no chat bubbles or activity charts. Display actual timestamps; do not rely solely on relative `2 hours ago`. Use `Intl.DateTimeFormat('en-GB', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZoneName:'short'})` in the browser's local time zone; preserve machine ISO timestamps in the API.

### 7.3 Login (`/login`)

Centered max-width **400px** form on off-white canvas. Small brand at top; heading `Sign in to shiftmark`; `Email`, `Password`, password reveal affordance, one full-width `Sign in` button. No social login, signup, illustration or promotional second column. Generic error message `Invalid email or password.` with no disclosure of which field failed. Use proper autocomplete hints, keyboard submission and visible loading state.

### 7.4 Create task

A small native modal `<dialog>` (max-width **420px**) with title `New task`, one required `Task title` field (trimmed, 1–120 chars), `Cancel` and `Create task`. New tasks start at `To do`, shown as help text, not an editable status dropdown. On success, close dialog, reload active list, show the new row, and announce `Task created` via accessible live region. Errors remain inline and retain the user's draft.

### 7.5 Delete confirmation

A separate confirmation dialog: `Delete “Prepare invoice”?` and text `The task will leave My tasks. Its status history will be preserved in Deleted tasks.` Buttons `Cancel` and destructive `Delete task`. No irreversible-data-loss warning implying the audit is deleted. After success, close sheet and refresh the active list; the task appears in Deleted tasks.

### 7.6 Mobile (< 768px), tablet (768–1023px)

- On mobile, replace sidebar with simple top brand + account menu and two visible navigation tabs `My tasks` / `Deleted tasks`. Keep `New task` visible near page heading.
- Filters scroll horizontally in one row and retain readable labels. No hidden filter-only icon.
- Task rows become stacked two-line items: task title; under it status chip + updated timestamp; row contains a clearly labeled details control.
- Detail sheet becomes a **full-height modal** with its own scrollable content and sticky action area; can be dismissed by visible close button and `Esc`.
- At tablet width, keep the desktop page but drop the fixed sidebar if needed; never allow a horizontal overflow to access actions.
- Minimum tappable target **44×44px** for primary interactions; readable form fields and no hover-only functionality.

## 8. Interaction and feedback contract

| Event/state | User-visible behavior |
|---|---|
| Initial auth check | Small loading state. Never show another user's cached tasks while checking `/api/auth/me`. |
| Signed-out or expired session | Clear private task state; redirect to `/login`; say `Your session has ended. Please sign in again.` |
| Login rejected | Generic field-area error; password remains masked. |
| Tasks loading | A brief `Loading tasks…` state or 3 quiet placeholder rows; no random skeleton grid. |
| No tasks at all | `Nothing on your list yet.` / `Create your first task to get started.` with a real `New task` action. |
| Filter with zero matches | `No tasks in this status.` with `Clear filter`; never reuse the all-empty state. |
| Valid status change | Disable action while pending; after success refresh both current task and audit log from server. No speculative or optimistic audit entry. |
| Same-status request | Backend returns success with `changed: false`, no new log; UI may say `Status is already up to date.` |
| Invalid/stale status change (`409`) | Show `Status changed elsewhere. Refreshing task…`, re-fetch task and logs, then render the server truth. |
| Task delete | Confirmation first, then leave active list; historical detail available in Deleted tasks. |
| Network failure | Inline explanation and `Try again` action. Do not silently lose an unsaved task title. |
| No audit events | Explicitly show `No status changes yet.` |

**Accessibility:** Use semantic `<form>`, `<button>`, headings, navigation links, table/list semantics, and `<time dateTime>`. Use native `<dialog>.showModal()` for create/detail/delete so the browser manages modal top-layer behavior and focus containment; provide initial focus, explicit close controls and focus restoration to the opener. Render status and errors in text, use `aria-live="polite"` for success messages, and retain visible focus rings. [MDN dialog guidance](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog).

## 9. Backend-facing UI contract

All JSON timestamps are **ISO 8601 UTC strings**, converted to local display time only in the browser. API base path `/api`, proxied by Vite during development. Browser sends an HttpOnly session cookie automatically; no session token in `localStorage`.

| Method | Path | Response / note |
|---|---|---|
| `POST` | `/api/auth/login` | Body `{ email, password }`; `200 { user }`; sets cookie |
| `GET` | `/api/auth/me` | `200 { user }`; `401` if signed out |
| `POST` | `/api/auth/logout` | `204`; clears session/cookie |
| `GET` | `/api/tasks?view=active` | `200 { tasks: ApiTask[] }`; owned, not deleted; most recently updated first |
| `GET` | `/api/tasks?view=deleted` | `200 { tasks: ApiTask[] }`; owned, deleted; most recently deleted first |
| `POST` | `/api/tasks` | Body `{ title }`; `201 { task }`; backend sets owner and initial status |
| `PATCH` | `/api/tasks/:id/status` | Body `{ status }`; `200 { task, changed: boolean }`; `409` invalid transition |
| `GET` | `/api/tasks/:id/audit-logs` | `200 { logs: ApiAuditLog[] }`; chronological ASC by time, ID |
| `DELETE` | `/api/tasks/:id` | `204`; soft delete; historical log persists |

All task-specific endpoints return `404` for nonexistent or other users' tasks. Mutations may return `400` for invalid input, `401` for missing login, and `403` for invalid request origin (CSRF protection). Error envelope: `{ "error": { "code": "INVALID_TRANSITION", "message": "..." } }`. No frontend-submitted `actorId` or `ownerId`.

**Types used by the UI** (implemented once in `shared/src/contracts.ts`):

```ts
type TaskStatus = 'to_do' | 'pending' | 'in_progress' | 'done';
interface ApiUser { id: number; name: string; email: string }
interface ApiTask {
  id: number; title: string; status: TaskStatus;
  createdAt: string; updatedAt: string; deletedAt: string | null;
}
interface ApiAuditLog {
  id: number; taskId: number; actorId: number; actorName: string;
  fromStatus: TaskStatus; toStatus: TaskStatus; createdAt: string;
}
```

## 10. Design acceptance checklist

- [ ] Desktop at **1440px** clearly shows task list before any chart/illustration; sidebar is 208px and sheet is 420–440px.
- [ ] Mobile at **390px** has no horizontal page overflow; filters can scroll, task actions remain accessible.
- [ ] All four statuses have **both a readable label and their prescribed colors**.
- [ ] A task detail shows real current status, permitted next action and **chronological** status history without navigation to another page.
- [ ] Completed and deleted tasks never show invalid status actions.
- [ ] Empty, error, saving and session-expired states are understandable without developer tools.
- [ ] Keyboard navigation, visible focus, dialog close/focus return, text contrast and reduced-motion preference are checked.
- [ ] No false data, nonfunctional sidebar links, vanity KPI widgets or decorative dashboard filler.
- [ ] Screens only expose features backed by the documented API; actor is the signed-in user.

## 11. Implementation aesthetic guardrails

- Start from the token table and wireframes; **do not pick a generic Tailwind dashboard template** and repaint it.
- Build the **list row** and **audit timeline** first. These two components carry the product's character.
- Avoid a left navigation of 8–12 fake destinations, glass effects, purple gradients, giant rounded charts, gradient buttons, stock avatars, AI sparkle icons, rotating motivational copy, and unnecessary dark-mode switches.
- Use natural example task titles only in tests/docs; production UI uses data returned by the backend.
- Deliberately ship fewer components at higher quality. Prioritize state clarity, truthful timestamps, and sensible whitespace.

---

## Research/reference links

- Behance / Jahangir Hussain: https://www.behance.net/gallery/237809781/Task-Management-App-Dashboard-UI-UX
- Behance / Abdullah Walid: https://www.behance.net/gallery/209914309/Task-Management-System-Dashboard-Web-App
- Figma Community / Noda: https://www.figma.com/community/file/1522627150217529073/dashboard
- Noda creator preview: https://dribbble.com/shots/26424127-Task-Tracker-Dashboard
- Figma Community / Berry: https://www.figma.com/community/file/1468460364009262125/berry-free-dashboard-ui-kit
- Linear issue interaction documentation: https://linear.app/docs/creating-issues
- Radix Colors semantic scale: https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale
- W3C WCAG contrast guidance: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- MDN HTML dialogs: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
