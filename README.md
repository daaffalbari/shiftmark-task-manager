# shiftmark

A shared task workspace with clear responsibility and a traceable change history. The implementation focuses on keeping tasks and audit logs consistent, handling concurrent edits, and showing who changed what and when.

Built with **React, TypeScript, Vite, Express, Bun, Drizzle, and SQLite**. Detailed design decisions are documented in [DESIGN.md](DESIGN.md) and [TEAM-WORKSPACE-PLAN.md](TEAM-WORKSPACE-PLAN.md).

## Running the frontend and backend

Requires **Bun 1.3 or newer**; developed with Bun 1.4.3. Run these commands from the repository root:

```sh
bun install
cp .env.example .env # Skip if .env already exists
bun run db:migrate
bun run db:seed
bun run dev
```

Open **http://localhost:5173**. The backend runs at **http://localhost:3000**, and Vite proxies `/api` requests to it.

To run the applications separately, use two terminals from the repository root:

```sh
# Terminal 1: backend
bun --watch server/src/index.ts
```

```sh
# Terminal 2: frontend
bun run --cwd client dev
```

Configuration is shown in [.env.example](.env.example): `DB_FILE_NAME` sets the SQLite file location, `PORT` sets the backend port, and `WEB_PORT` sets the frontend port. `APP_ORIGIN` must exactly match the frontend origin, without a trailing slash. Update these settings when changing ports, and use `localhost` consistently.

The workspace opens without login. Choose **John Doe** or **Jane Doe** through **Acting as** before making changes; the selection persists across navigation within the application. Seeding is idempotent and creates no sample tasks. The backend also applies pending migrations on startup.

## Architecture

| Component | Responsibility |
| --- | --- |
| `client/` | React SPA for task lists, forms, details, and the audit timeline. UI state uses React; styling uses CSS Modules. |
| `server/` | Express REST API running on Bun. Routes validate input, the domain defines status rules, and services coordinate mutations and Drizzle/SQLite transactions. |
| `shared/` | API types and Zod schemas used by both applications through `@shiftmark/contracts`. The backend still validates every request. |
| `server/drizzle/` | Schema migrations, constraints, indexes, and audit protection triggers. |

Request flow: browser → frontend → `/api` → Express route → service → Drizzle → SQLite. Status rules live in [task-status.ts](server/src/domain/task-status.ts), transaction coordination in [task.service.ts](server/src/modules/tasks/task.service.ts), and API contracts in [contracts.ts](shared/src/contracts.ts).

Migrations preserve existing tasks and legacy status event IDs, actors, and timestamps without inventing unrecorded history. Legacy password columns and session tables remain for compatibility but are unused by the application.

## Behavior and assumptions

- **One shared workspace.** All members can read active tasks, deleted tasks, and their history. Organizations, roles, and per-user access restrictions are outside the current scope. Initial deployment assumes one backend instance with a persistent SQLite file.
- **User-selected identity.** Every mutation requires an `actorId` from the member directory. Creator, optional assignee, and last editor are separate identities. Actor selection is not authenticated; mutation requests must also provide the configured `Origin`.
- **Status advances one step at a time.** The sequence is `to_do` → `pending` → `in_progress` → `done`. Repeating the current status changes neither timestamps nor audit history. `done` is the final status; task fields remain editable until deletion.
- **Edits require a version.** A draft with a stale `version` receives `409 TASK_CHANGED` and remains in the UI until the user chooses **Reload latest**. Status changes and deletion also increment the version but do not yet require a version from the caller. Identical field edits preserve metadata and add no audit event.
- **Deletion preserves history.** Soft deletion sets `deletedAt`; the task and its audit remain readable, and further mutations are rejected. Restore and permanent deletion are not available.
- **Data updates through refresh.** The UI reloads data after mutations, when the window regains focus, or through **Refresh**. Real-time synchronization is not implemented.

## Trade-offs

| Choice | Benefit | Consequence |
| --- | --- | --- |
| SQLite with synchronous transactions | Simple local setup and atomic task/audit mutations. | Concurrent writes must queue; database operations can block the event loop. |
| Local React state and explicit refresh | UI behavior is easy to follow without additional global state management. | Other users need a refresh to see changes; task lists and audit history are not paginated. |
| Soft deletion | Tasks remain available as context for their audit history. | Data keeps growing and will need a retention policy as the system expands. |

## API

All timestamps use ISO 8601 UTC. Request schemas are strict: extra fields are rejected, including attempts to supply the creator directly.

| Method | Endpoint | Request / response |
| --- | --- | --- |
| GET | `/api/members` | `{members}` containing member IDs and names |
| GET | `/api/tasks?view=active\|deleted` | `{tasks}`; defaults to `active` |
| GET | `/api/tasks/:id` | `{task}`, including deleted tasks |
| POST | `/api/tasks` | `{title, description?, assigneeId?, actorId}` → 201 `{task}` |
| PATCH | `/api/tasks/:id` | `{title, description, assigneeId, version, actorId}` → `{task, changed}` |
| PATCH | `/api/tasks/:id/status` | `{status, actorId}` → `{task, changed}` |
| GET | `/api/tasks/:id/audit-logs` | `{logs}` containing creation, edit, status, and deletion events |
| DELETE | `/api/tasks/:id` | `{actorId}` → 204; soft deletion |

Errors use `{error: {code, message}}`: 400 for invalid input/actors, 403 for origin violations, 404 for missing tasks or mutations on deleted tasks, 409 for invalid transitions or stale versions, and 500 for internal failures.

## Verification

Verification results from **11 October 2026**:

| Command | Result |
| --- | --- |
| `bun test` | **57 passed, 0 failed** |
| `bun run typecheck` | Passed for the frontend, backend, shared contracts, and scripts |
| `bun run build` | Successfully generated `server/dist` and `client/dist` |

Tests cover every status pair, input/actor validation, actor switching, assignment, exact before/after values, version conflicts, no-op requests, rollback for every mutation type, legacy migrations, audit protection, timestamp ties, soft deletion, empty/error states, and React dialogs.

Previously recorded browser verification passed at desktop **1440px** and mobile **390px** using headless Brave. The flow covers John creating a task, Jane editing/changing status/deleting it, and John inspecting the same history. Keyboard/touch actor selection, draft conflicts, dialog focus, navigation, and overflow were also checked. Browser verification was not rerun for this documentation change.

To repeat the browser checks:

```sh
bun x playwright install chromium
bun run test:browser
```

Alternatively, use an installed Chromium-based browser:

```sh
bun run test:browser "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
```

The script uses a temporary database and frontend/backend ports **15173/13000**, then removes the database when finished. Screenshots are saved in the Git-ignored `.browser-checks/` directory.

To run the compiled backend, use `bun server/dist/index.js` from the repository root. Serve `client/dist` with an `index.html` fallback for SPA routing and proxy `/api` to the backend on the same origin; set `APP_ORIGIN` accordingly. Hosting configuration is not included.

## Assessment answers

### How do you ensure audit logs cannot be modified?

Protection is applied at two layers:

- **Application:** the audit API only exposes reads. Every creation, edit, status change, and soft deletion writes an audit event in the same SQLite `IMMEDIATE` transaction as the task mutation. If the audit insert fails, the entire mutation rolls back. Events record the actor, timestamp, and change details; history is ordered by timestamp and then ID.
- **Database:** `audit_logs_no_update` and `audit_logs_no_delete` triggers reject `UPDATE`/`DELETE` with `RAISE(ABORT, ...)`. `PRAGMA recursive_triggers = ON` also protects against row replacement through `INSERT OR REPLACE`. Audit foreign keys use `ON DELETE RESTRICT`, and migrations recreate the triggers after changing the audit table.

[Database tests](server/src/db/db.test.ts) attempt updates, deletes, and replacements directly. Integration tests force audit inserts to fail to verify rollback for every mutation type.

This guarantee depends on control over the database file and schema: someone who can replace the SQLite file or remove triggers can still manipulate history. Stronger integrity requirements call for restricted access and a separate audit archive with immutable retention; hash or signature verification can help detect changes. These additional mechanisms are not implemented.

### Which part of the solution poses the greatest risk with many users?

**Identity and access control** are the main risks for real-world use. Callers can select another member's `actorId`, while validation only confirms that the ID exists. Audit attribution does not prove who actually performed an action, and data is not isolated between teams.

For capacity, the main risk is **synchronous SQLite access**. WAL helps reads continue during writes, but there is still only one writer at a time. Concurrent mutations can increase queues, latency, and database-busy failures. Task and audit queries also fetch all matching rows, so response sizes and memory use grow with the data. Capacity limits have not been measured through load testing.

### If this became a large system, what would you refactor first and why?

First, **identity and authorization at the API boundary**. Actors should come from verified sessions, with team access checks on both reads and mutations. This provides the foundation for trustworthy audit attribution and data isolation between teams.

Next, **database access and transaction boundaries in the task service**. As capacity requirements grow, move storage to PostgreSQL with asynchronous access, pagination, and appropriate concurrency control. Version checks must remain atomic, for example through conditional updates using `WHERE id = ... AND version = ...`, and task/audit writes must remain in one transaction. If audit events are sent to a separate service, a transactional outbox can prevent event loss when delivery fails. Service boundaries should follow measured operational needs.

## Improvements with more time

Beyond the refactoring priorities above, I would:

1. Add server-side pagination and filtering, then run load tests to measure throughput and latency.
2. Extend `version` checks to status changes and deletion if all actions must reject stale views.
3. Add CI for tests, typechecking, and builds, along with observability and tested backup/recovery procedures.
4. Strengthen audit storage and add real-time updates according to collaboration needs.

## AI assistance and validation

I designed the architecture and database myself. AI assisted with implementation based on those designs, particularly the frontend, which is outside my primary area of focus.

The implementation was validated through tests for status rules, input and actor validation, version conflicts, transaction rollback, and audit protection. TypeScript checks and builds verified type consistency and compilation; documentation was checked against configuration, routes, services, schemas, and migrations. Results and commands are listed under [Verification](#verification).
