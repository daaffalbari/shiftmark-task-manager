# shiftmark

A shared internal team workspace with clear responsibility and a complete recorded change history. Built from [DESIGN.md](DESIGN.md) and [TEAM-WORKSPACE-PLAN.md](TEAM-WORKSPACE-PLAN.md) with React, TypeScript, Vite, Express, Bun, Drizzle and SQLite.

## Run locally

Requires **Bun 1.3 or newer** (developed with 1.4.3).

1. Run `bun install`.
2. Copy `.env.example` to `.env`.
3. Run `bun run db:migrate`, then `bun run db:seed`.
4. Run `bun run dev` and open **http://localhost:5173**.

The workspace opens directly. Use **Acting as** to choose **John Doe** or **Jane Doe** before making changes. The selected actor is shown in create/edit/delete dialogs and beside status actions; assignee is a separate choice. The first actor in the directory is selected initially, and the choice survives navigation within the workspace. No login or password is required. Seeding is idempotent and the initial workspace is empty.

The API runs on port 3000. Vite proxies `/api` to it, keeping requests same-origin. `APP_ORIGIN` must exactly match the URL used in the browser, without a trailing slash. If a port is occupied, set `WEB_PORT`, `PORT` and the matching `APP_ORIGIN` in `.env`. Use `localhost` consistently rather than switching between it and `127.0.0.1`.

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start Vite and the API together |
| `bun run db:migrate` | Apply committed SQLite migrations |
| `bun run db:seed` | Create the two predefined actors |
| `bun test` | Run contracts, domain, SQLite, API and React tests |
| `bun run typecheck` | Check all three strict TypeScript packages |
| `bun run build` | Emit API modules to `server/dist` and the UI to `client/dist` |
| `bun run test:browser` | Run the real-browser desktop/mobile flow |

The API also applies pending migrations on startup. To run the compiled API, use `bun server/dist/index.js` from the repository root. Serve `client/dist` with SPA fallback and proxy `/api` to the API from the same origin. Set `APP_ORIGIN` to that origin. Hosting is not configured by this project.

## Behavior and data guarantees

- Tasks move **To do → Pending → In progress → Done**, one step at a time. Done is terminal. Repeating the current status succeeds without changing the timestamp or adding history.
- Creation, title/description/assignment edits, status updates, and deletion each commit together with an audit event in a SQLite **IMMEDIATE** transaction. Failed audit writes roll back the entire mutation.
- Creator, optional assignee, and last editor are separate identities. The timeline records the selected actor, exact before/after field values, and absolute timestamps. Identical edits add no event and preserve task metadata.
- Edits require the version originally opened. A stale version returns `409 TASK_CHANGED`, preserving the draft in the UI until explicit Reload latest. Status updates and deletion also increment the version.
- Audit rows are protected against updates and deletes by committed SQLite triggers. History is ordered by timestamp, then ID, oldest first.
- Delete sets `deletedAt`. Deleted tasks remain inspectable with their original history and cannot be changed or deleted again.
- Task and member reads require no login. Every mutation requires an `actorId` from the predefined member directory, validated on the server before changes are made. The selected actor becomes the creator on creation and the last editor on later mutations. Strict Zod schemas reject supplied creator/owner fields; assignees are validated separately.
- The migration preserves existing tasks and status event IDs, actors, and timestamps. Former owners become creators; tasks start unassigned with an empty description. Unrecorded historical creation/edit/deletion events are not invented. The last known status actor is used as the legacy last editor, falling back to the creator.
- Unsafe requests require the configured Origin. Actor selection follows the assessment’s declared-identity model: it records the selected name without authenticating that person. Existing password columns and session tables remain in historical migrations for database compatibility; the application no longer uses authentication.
- The list shows assignee and last editor; details show creator, description, assignment, status, and the full recorded activity. Shared data refreshes on window focus or explicit Refresh. Native dialogs, sticky close controls, keyboard focus handling, reduced-motion support, responsive navigation, and locally bundled fonts are retained.

## API

All timestamps are ISO 8601 UTC strings. Types and request schemas live in `shared/src/contracts.ts`; both applications import `@shiftmark/contracts`.

| Method | Endpoint | Request / response |
| --- | --- | --- |
| GET | `/api/members` | `{members}`, member IDs and names |
| GET | `/api/tasks?view=active\|deleted` | `{tasks}`, defaults to active |
| GET | `/api/tasks/:id` | `{task}`, including deleted tasks |
| POST | `/api/tasks` | `{title,description?,assigneeId?,actorId}` → 201 `{task}` |
| PATCH | `/api/tasks/:id` | `{title,description,assigneeId,version,actorId}` → `{task,changed}` |
| PATCH | `/api/tasks/:id/status` | `{status,actorId}` → `{task,changed}` |
| GET | `/api/tasks/:id/audit-logs` | `{logs}`, creation/edit/status/deletion events, including deleted tasks |
| DELETE | `/api/tasks/:id` | `{actorId}` → 204, soft delete |

Errors use `{error:{code,message}}`: 400 validation/unknown actor, 403 origin, 404 missing/deleted task, 409 invalid transition or stale edit, or 500 internal failure.

## Verification

Verified on 11 October 2026: **57 tests passed**, strict typecheck and production build passed, and the complete actor-picker browser check passed at **1440px and 390px** in headless Brave. The styled picker was checked for keyboard selection, typing names, Escape, outside dismissal, mobile touch, and actor attribution. Desktop/mobile screenshots were visually reviewed; list overflow was also checked at 320/768/1024px.

Tests cover every status pair, strict inputs, missing/unknown actors, actor switching, shared access, assignment, exact field diffs, stale edits, no-op/duplicate requests, rollback for every mutation, legacy migration, immutable history, timestamp ties, soft deletion, empty/error states, and React dialog flows.

The browser check starts `bun run dev` with a temporary database, predefined actors and isolated ports **15173/13000**. At **1440px and 390px**, John creates a task, Jane edits/reassigns/advances/deletes it, and John verifies the same recorded history. It checks actor switching without changing existing history, selection across navigation, sidebar closing/reopening, a real stale-draft conflict, modal focus, and horizontal overflow (also at 320/768/1024px). Screenshots stay in ignored `.browser-checks/`; the temporary database is removed.

Install a Playwright Chromium browser with `bun x playwright install chromium`, then run `bun run test:browser`. Alternatively pass the path to an installed Chromium-based browser:

```sh
bun run test:browser "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
```

## Scope and trade-offs

- **Runtime deviation:** the assessment calls for Node.js + Express. This implementation uses **Bun instead of Node.js**, as specified in the supplied plan; it retains Express and TypeScript. `bun:sqlite` makes the backend Bun-specific.
- **Actor input follows the assessment:** two seeded users populate an “Acting as” dropdown. Login, registration, password reset, roles, and authentication providers are outside this version.
- SQLite keeps setup small and transactions synchronous. This is one shared internal team with no organizations/roles, pagination, restore flow, or rate limiting. Updates refresh on focus or request rather than through real-time subscriptions.
- The UI uses plain CSS Modules and React state. No dashboard template, global state library, fake counts or optimistic audit events.
