# shiftmark

A private task workspace with a strict workflow and lasting status history. Built from [DESIGN.md](DESIGN.md) with React, TypeScript, Vite, Express, Bun, Drizzle and SQLite.

## Run locally

Requires **Bun 1.3 or newer** (developed with 1.4.3).

1. Run `bun install`.
2. Copy `.env.example` to `.env`.
3. Set `DEMO_PASSWORD` in `.env` to a password of your choice, at least 12 characters long. No password is supplied or committed.
4. Run `bun run db:migrate`, then `bun run db:seed`.
5. Run `bun run dev` and open **http://localhost:5173**.

Sign in as **john@example.com** or **jane@example.com**, using the password you set. Each account has its own tasks. Seeding is idempotent: it creates missing accounts without changing existing passwords. The initial workspace is empty.

The API runs on port 3000. Vite proxies `/api` to it, keeping cookies same-origin. `APP_ORIGIN` must exactly match the URL used in the browser, without a trailing slash. If a port is occupied, set `WEB_PORT`, `PORT` and the matching `APP_ORIGIN` in `.env`. Use `localhost` consistently rather than switching between it and `127.0.0.1`.

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start Vite and the API together |
| `bun run db:migrate` | Apply committed SQLite migrations |
| `bun run db:seed` | Create the two demo users using `DEMO_PASSWORD` |
| `bun test` | Run contracts, domain, SQLite, API and React tests |
| `bun run typecheck` | Check all three strict TypeScript packages |
| `bun run build` | Emit API modules to `server/dist` and the UI to `client/dist` |
| `bun run test:browser` | Run the real-browser desktop/mobile flow |

The API also applies pending migrations on startup. To run the compiled API, use `bun server/dist/index.js` from the repository root. Serve `client/dist` with SPA fallback and proxy `/api` to the API from the same origin. Set `APP_ORIGIN` to that origin and `NODE_ENV=production` for Secure cookies over HTTPS. Hosting is not configured by this project.

## Behavior and data guarantees

- Tasks move **To do → Pending → In progress → Done**, one step at a time. Done is terminal. Repeating the current status succeeds without changing the timestamp or adding history.
- A status update and its audit record commit in the same SQLite **IMMEDIATE** transaction. Failed audit writes roll back the update.
- Audit rows are protected against updates and deletes by committed SQLite triggers. History is ordered by timestamp, then ID, oldest first.
- Delete sets `deletedAt`. Deleted tasks remain inspectable with their original history and cannot be changed or deleted again.
- All task operations use the session's owner ID. Foreign and missing IDs both return 404. Request payloads are strict Zod schemas and reject supplied owner/actor IDs.
- Argon2id password hashes and SHA-256 session-token digests are stored in SQLite. Random session tokens travel only in HttpOnly, SameSite=Lax cookies with a seven-day lifetime. Unsafe requests require the configured Origin. The UI clears private content on 401 and rechecks the session when the window gains focus.
- The UI has labeled status chips, local absolute timestamps, native modal dialogs, keyboard focus handling, reduced-motion support and responsive navigation. Fonts are bundled locally.

## API

All timestamps are ISO 8601 UTC strings. Types and request schemas live in `shared/src/contracts.ts`; both applications import `@shiftmark/contracts`.

| Method | Endpoint | Request / response |
| --- | --- | --- |
| POST | `/api/auth/login` | `{email,password}` → `{user}`, sets cookie |
| GET | `/api/auth/me` | `{user}` |
| POST | `/api/auth/logout` | 204, invalidates session and clears cookie |
| GET | `/api/tasks?view=active\|deleted` | `{tasks}`, defaults to active |
| POST | `/api/tasks` | `{title}` → 201 `{task}` |
| PATCH | `/api/tasks/:id/status` | `{status}` → `{task,changed}` |
| GET | `/api/tasks/:id/audit-logs` | `{logs}`, including owned deleted tasks |
| DELETE | `/api/tasks/:id` | 204, soft delete |

Errors use `{error:{code,message}}`: 400 validation, 401 authentication, 403 origin, 404 hidden/missing task, 409 invalid transition, or 500 internal failure.

## Verification

Verified on 10 October 2026: **38 tests passed**, strict typecheck passed, production build passed, and the complete browser check passed at **1440px and 390px** in headless Brave. Desktop and mobile screenshots were also visually reviewed.

Tests cover every status pair, strict inputs, session expiry/logout, two-account isolation, duplicate PATCH requests, transaction rollback, immutable history, timestamp ties, soft deletion, empty/error states and React dialog flows.

The browser check starts `bun run dev` with a temporary database, random test credentials and isolated ports **15173/13000**. It exercises the full login → create → three transitions → history → delete → deleted-history flow at **1440px and 390px**, including failed login, account isolation, real session expiry, modal focus containment/restoration and horizontal overflow. It leaves screenshots in ignored `.browser-checks/` and removes its temporary database.

Install a Playwright Chromium browser with `bun x playwright install chromium`, then run `bun run test:browser`. Alternatively pass the path to an installed Chromium-based browser:

```sh
bun run test:browser "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
```

## Scope and trade-offs

- **Runtime deviation:** the assessment calls for Node.js + Express. This implementation uses **Bun instead of Node.js**, as specified in the supplied plan; it retains Express and TypeScript. `bun:sqlite` and `Bun.password` make the backend Bun-specific.
- **Optional authentication scope included:** real login/logout and two seeded accounts are implemented. Registration, password reset, roles and external authentication providers are outside this project.
- SQLite keeps setup small and transactions synchronous. This is a single-process internal tool with no pagination, collaboration, restore flow, rate limiting or session-maintenance job.
- The UI uses plain CSS Modules and React state. No dashboard template, global state library, fake counts or optimistic audit events.
