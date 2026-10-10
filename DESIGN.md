# shiftmark — Internal Team Task Manager
## Product & UI Design Specification

**Status:** Implemented shared-team revision with predefined actors and workspace UI polish
**Date:** 2026-10-11
**Audience:** Full-stack engineer / code-generation agent  
**Companion plan:** [TEAM-WORKSPACE-PLAN.md](TEAM-WORKSPACE-PLAN.md). This revision supersedes the personal ownership and session-actor assumptions in the original mini-task-manager plan.

> **One-line brief:** A shared internal team workspace that clearly shows responsibility, current status, and who changed what, when.

## 1. Product boundary

shiftmark is a small shared workspace for one internal team. It opens without login and uses a predefined-user dropdown to identify who is making changes. Creator, assignee, and change actor are distinct identities. John can create a task, Jane can update it, and both can understand the complete recorded history.

**In scope:** predefined actor selection; shared active/deleted task lists; task creation; title/description/assignee editing; sequential status updates; immutable creation/edit/status/deletion events; responsive UI and clear request states.

**Out of scope:** login, sign-up, roles, invitations, multiple organizations, due dates, priorities, comments, attachments, notifications, charts, kanban drag-and-drop, global activity feed, dark mode.

**Non-negotiable product rules:**
- Task and member reads require no login. Every mutation requires a selected actor from the predefined member directory; the server rejects missing, malformed, or unknown actor IDs.
- Creator is the selected actor at creation; subsequent changes record the actor selected for that request. Assignee is optional and validated separately. Switching actor alone never changes existing tasks or history.
- Titles are trimmed and 1–120 characters; descriptions are trimmed and at most 2,000 characters.
- `to_do → pending → in_progress → done`, one step at a time. Done is terminal for status changes.
- Repeating the current status or saving identical fields changes neither task metadata nor history.
- Creation, field edits, status changes, and soft deletion commit together with their audit event in an IMMEDIATE transaction. Failed event writes roll back the mutation.
- Audit records cannot be updated/deleted, including by SQLite REPLACE. Deleted tasks and their activity remain readable and cannot be edited again.
- Field edits include a task version. A stale version returns `409 TASK_CHANGED`; the UI retains the draft until the user explicitly reloads.
- History is oldest first; equal timestamps are ordered by event ID. Field changes show exact before/after values.
- Existing task owners become creators. Existing tasks start unassigned with an empty description. Preserve historical status IDs, actors, and timestamps without inventing missing creation/edit/deletion events.
- Shared data refreshes on return to the window and through explicit Refresh actions.

**View choice:** retain the list for scanning responsibility, status, and last editor. The detail timeline is the primary place to inspect changes; kanban is outside this revision.

## 2. Reference research — what to learn, not copy

Research reviewed on **2026-10-10**. References are inspiration, not reusable licensed assets. We will implement original layouts/components, not reproduce another designer's screens.

| Source | What is relevant | What shiftmark adopts | What shiftmark explicitly avoids |
|---|---|---|---|
| [Behance — Task Management App Dashboard, Jahangir Hussain (2025)](https://www.behance.net/gallery/237809781/Task-Management-App-Dashboard-UI-UX) | Readable task hierarchy, list/table modes, clear filters | Task-first list, strong task-title hierarchy, concise filtering | Five view modes, project/team controls, extra metadata |
| [Behance — Task Management System Dashboard, Abdullah Walid (2024)](https://www.behance.net/gallery/209914309/Task-Management-System-Dashboard-Web-App) | Minimal work-management UI and scannable status cues | Clear status labels and action placement | Priority fields, deadlines, kanban |
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

**App name:** `shiftmark`. Use the supplied `assets/logo.svg` in the workspace header, and `assets/logo-icon.svg` as the favicon. Preserve the artwork and its colors.

**Copy language:** English throughout the interface; short, explicit, unambiguous. E.g. `Team tasks`, `New task`, `View history`, `Move to In progress`, `Deleted tasks`.

## 4. Color system (light theme, v1)

Palette: **warm neutral + evergreen ink**. These are *custom design choices* checked against WCAG contrast formulas, not palette values claimed to come from Behance/Figma.

### Foundation tokens

| CSS token | Hex | Application |
|---|---|---|
| `--color-canvas` | `#F7F8F5` | Application background |
| `--color-sidebar` | `#F5F7F4` | Team workspace identity surface |
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
- **Scale:** page heading `34px/42px, 600` desktop and `28px/36px` mobile; detail title `22px/30px, 600`; section heading `16px/24px, 600`; body `14px/22px`; secondary/meta `12px/18px`; status filter counts `24px/28px, 600`.
- **Spacing:** 4px base; page horizontal padding 40px desktop, 20px tablet, 16px mobile. Section gaps 24–32px; desktop task rows 88px.
- **Shape:** border radius `10px` controls, `12px` task/filter surfaces, `14px` dialogs, full pill for status chips. Avoid round-24 floating containers everywhere.
- **Borders:** 1px neutral dividers. Subtle depth on floating dialogs and primary buttons. No glassmorphism, blurred glowing edges, gratuitous gradients, or large colored shadows.
- **Icons:** optional `lucide-react`, 16–18px, consistent 1.75–2px stroke. Text labels remain visible; do not make icon-only navigation.
- **Motion:** 120–180ms opacity/transform transitions for sheets and micro-interactions; disable on `prefers-reduced-motion: reduce`. No spring/bounce effect.

## 6. Information architecture

Only two substantive application destinations:

1. **Team tasks** (`/tasks`): shared active tasks, status filters, Refresh, and create action.
2. **Deleted tasks** (`/tasks?view=deleted`): read-only soft-deleted tasks with accessible history.

An **Acting as** dropdown above the task page contains the predefined members John Doe and Jane Doe. The current selection remains visible when the sidebar is closed and survives navigation between active and deleted tasks. It records declared identity rather than authenticating the person.

No `Dashboard`, `Analytics`, `Team`, `Calendar`, `Settings`, or disabled placeholder links.

## 7. Screens and layout

### 7.1 Desktop workspace (≥ 1024px)

- Fixed **208px white sidebar** with `shiftmark` wordmark, an Internal team identity block, and `Team tasks` / `Deleted tasks` navigation. The footer shows initials and a member count from the real directory. A keyboard-accessible button hides it and a top-left button reopens it.
- A breadcrumb and distinct **Acting as** control sit above the main content. The dropdown includes the selected actor's initials and helper text explaining change attribution, and remains available in both sidebar states.
- Main background `--color-canvas`; max content width **1100px**, content padding 40px.
- Header: small eyebrow `INTERNAL TEAM`; prominent `Team tasks`; one-line supporting count; single primary `+ New task` button right aligned.
- Status filter strip: `All`, `To do`, `Pending`, `In progress`, `Done` in a single white surface, with larger real counts, semantic dots, and an evergreen selected state. Each segment filters the list; counts are derived from the current task view.
- A Task overview heading (Preserved tasks in the deleted view), real task count, and Refresh control introduce the table. A short history hint below the table explains the details action.
- List in **one white surface** with quiet 1px outer border; table-like rows with `Task / Assignee / Status / Last updated by / Open` headings; do not create a card for each task.
- Row: document marker, task name (single line with ellipsis), subtle `#ID` and creator, assignee initials/name, status chip, last editor and absolute timestamp, accessible `View details` button. Hover and keyboard focus subtly highlight the row; focus is clearly outlined.
- Task detail opens in a **420–440px right modal sheet**, visually anchored to the right and slightly shadowed. The background list remains visible but inert while the native modal `<dialog>` is open.

The list keeps task, responsibility, current status, and last editor aligned in one surface. On mobile the same data stacks within each row.

### 7.2 Detail sheet: the signature interaction

1. Task title, `#ID`, and close control in a sticky header.
2. Task information: description, assignee, creator and creation time, last editor and update time. Active tasks offer `Edit details`.
3. Current status with a written chip, `Step N of 4`, and a four-stage track.
4. The next valid status action. Done displays `This task is complete.` without a next-step action.
5. `Activity history` with a Refresh task action and chronological entries. Each names the actual actor and absolute timestamp. Creation shows the initial fields; edits show labeled Before/After values for title, description, and assignee; status entries show the transition; deletion names the actor and retained task title.
6. Delete action for active tasks. Deleted tasks show their deletion timestamp and preserve the full recorded history.

**Audit empty state:** `No recorded activity. New changes will appear here.` Do not synthesize missing historical events.

**Audit timeline:** vertical hairline with distinct creation, edit, status, and deletion icon markers, oldest first. Initial fields and exact Before/After values sit in bordered blocks. Preserve multiline field values and wrap long content. Use local absolute times with `Intl.DateTimeFormat`; preserve ISO UTC timestamps in the API. Task metadata has a quiet inset surface, and the current-status section uses the warm canvas background and a clearly marked workflow step.

### 7.3 Actor selection

Open the task workspace directly. A styled **Acting as** picker uses the two predefined members returned by `/api/members`; initially select the first member in the directory. Its anchored listbox shows member initials and a checkmark for the selected actor. Arrow keys, Home/End, and typing names browse options; Enter/Space confirm; Tab confirms and moves focus; Escape or clicking outside dismisses without changing the actor. DOM focus stays on the trigger while browsing, using `aria-activedescendant` as described in the [WAI select-only combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/).

Display the selected name in create/edit/delete dialogs and beside status actions. Changing the actor affects subsequent mutation requests and never rewrites history. Loading failures offer Retry before allowing changes. There is no login form, password, or account/logout menu.

### 7.4 Create and edit task

Use a native modal `<dialog>` (max-width **420px**) with required Task title, optional Description, and an Assignee selector populated from the member API. Include Unassigned. New tasks start at To do; status is changed through the dedicated sequential action.

Every mutation sends the selected actor ID. Create uses Cancel / Create task. Edit uses Cancel / Save changes. Focus title on opening and restore focus on close. Failed requests retain every draft field. Member loading has a retry action and prevents saving until the directory is available.

On `409 TASK_CHANGED`, explain that a teammate changed the task and that the draft is retained. Disable saving and offer Reload latest, explicitly explaining that it replaces the draft. Reload adopts the current version. A deleted task cannot be saved. On success, refresh task, list, and activity from the server.

### 7.5 Delete confirmation

A separate confirmation dialog: `Delete “Prepare invoice”?` and text `The task will leave Team tasks for everyone. Its full activity history will be preserved in Deleted tasks.` Buttons `Cancel` and destructive `Delete task`. No irreversible-data-loss warning implying the audit is deleted. After success, close sheet and refresh the active list; the task appears in Deleted tasks.

### 7.6 Mobile (< 768px), tablet (768–1023px)

- On mobile, replace sidebar with simple top brand and two visible navigation tabs `Team tasks` / `Deleted tasks`. Keep `New task` visible near page heading.
- Filters scroll horizontally in one row and retain readable labels. No hidden filter-only icon.
- Task rows stack title/creator, assignee/status, and last editor/timestamp, with a clearly labeled details control.
- Detail sheet becomes a **full-height modal** with its own scrollable content and sticky title/close header; can be dismissed by visible close button and `Esc`.
- At tablet width, keep the desktop page but drop the fixed sidebar if needed; never allow a horizontal overflow to access actions.
- Minimum tappable target **44×44px** for primary interactions; readable form fields and no hover-only functionality.

## 8. Interaction and feedback contract

| Event/state | User-visible behavior |
|---|---|
| Initial actor loading | Show a small loading state while fetching `/api/members`. |
| Actor loading failed or empty directory | Explain the problem and offer Retry before allowing changes. |
| Tasks loading | A brief `Loading tasks…` state or 3 quiet placeholder rows; no random skeleton grid. |
| No tasks at all | `No team tasks yet.` / `Create a task and assign the next step to a teammate.` with a real `New task` action. |
| Filter with zero matches | `No tasks in this status.` with `Clear filter`; never reuse the all-empty state. |
| Valid status change | Disable action while pending; after success refresh both current task and audit log from server. No speculative or optimistic audit entry. |
| Same-status request | Backend returns success with `changed: false`, no new log; UI may say `Status is already up to date.` |
| Invalid/stale status change (`409`) | Show `Status changed elsewhere. Refreshing task…`, re-fetch task and logs, then render the server truth. |
| Stale field edit (`409 TASK_CHANGED`) | Keep draft, explain conflict, and offer explicit Reload latest. |
| Return to window / Refresh | Refresh shared tasks; refreshed details also update their list row. |
| Task delete | Confirmation first, then leave active list; historical detail available in Deleted tasks. |
| Network failure | Inline explanation and `Try again` action. Retain title, description, and assignee drafts. |
| No audit events | Explicitly show `No recorded activity.` |

**Accessibility:** Use semantic `<form>`, `<button>`, headings, navigation links, table/list semantics, and `<time dateTime>`. Use native `<dialog>.showModal()` for create/edit/detail/delete so the browser manages modal top-layer behavior and focus containment; provide initial focus, explicit close controls and focus restoration to the opener. Render status and errors in text, use `aria-live="polite"` for success messages, and retain visible focus rings. [MDN dialog guidance](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog).

## 9. Backend-facing UI contract

JSON timestamps are ISO 8601 UTC strings; the browser displays local absolute times. API base path `/api`, proxied by Vite during development. Every mutation includes the selected `actorId`; the server validates it against the predefined member directory.

| Method | Path | Response / note |
|---|---|---|
| GET | `/api/members` | `{members: ApiMember[]}`, IDs and names for assignment |
| GET | `/api/tasks?view=active` | Shared active tasks, latest updated first |
| GET | `/api/tasks?view=deleted` | Shared deleted tasks, latest deleted first |
| GET | `/api/tasks/:id` | `{task}`, including a deleted task |
| POST | `/api/tasks` | `{title,description?,assigneeId?,actorId}` → 201 `{task}` |
| PATCH | `/api/tasks/:id` | `{title,description,assigneeId,version,actorId}` → `{task,changed}` |
| PATCH | `/api/tasks/:id/status` | `{status,actorId}` → `{task,changed}` |
| GET | `/api/tasks/:id/audit-logs` | `{logs}`, chronological by timestamp then ID |
| DELETE | `/api/tasks/:id` | `{actorId}` → 204, soft delete and append deletion event |

Task-specific endpoints return 404 for a missing task; mutations also return 404 for a deleted task. Validation and unknown actors return 400, invalid origin 403, invalid transition or stale edit 409. Error envelope: `{error:{code,message}}`. Strict payloads require an actor ID and reject supplied creator/owner fields.

Canonical DTOs and schemas live in [shared/src/contracts.ts](shared/src/contracts.ts). `ApiTask` includes description, version, createdBy, assignee, updatedBy, status, and timestamps. `ApiAuditLog.event` is a discriminated creation/field-edit/status-change/deletion event. Assignment changes retain member IDs and names in before/after snapshots.

## 10. Design acceptance checklist

- [ ] Desktop at **1440px** clearly shows task list before any chart/illustration; sidebar is 208px and sheet is 420–440px.
- [ ] Mobile at **390px** has no horizontal page overflow; filters can scroll, task actions remain accessible.
- [ ] All four statuses have **both a readable label and their prescribed colors**.
- [ ] A task detail shows real current status, permitted next action and **chronological** activity history without navigation to another page.
- [ ] Completed and deleted tasks never show invalid status actions.
- [ ] Empty, error, saving and actor-loading states are understandable without developer tools.
- [ ] Keyboard navigation, visible focus, dialog close/focus return, text contrast and reduced-motion preference are checked.
- [ ] No false data, nonfunctional sidebar links, vanity KPI widgets or decorative dashboard filler.
- [ ] John creates a task, Jane edits/reassigns/advances/deletes it, and John sees the same task and exact recorded changes.
- [ ] A stale edit preserves its draft and cannot overwrite a teammate.
- [ ] Screens only expose features backed by the documented API; actor is the selected predefined user and is separate from the assignee.

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
