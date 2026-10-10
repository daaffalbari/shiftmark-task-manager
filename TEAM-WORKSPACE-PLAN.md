# Shared internal team workspace

This revision supersedes the personal-task boundary in the original mini-task-manager plan and DESIGN.md. The goal is that John can create a task, Jane can update it, and both can see exactly who changed each field.

## Product decisions

- One internal team: every authenticated user can read and change all tasks. Creator, assignee, and change actor are separate identities. No roles, invitations, or organization model.
- Keep the task list and right-hand details. Rows show assignee and last editor; details show description, creator, assignment, status, and a chronological activity timeline.
- Tasks have a required title, optional description (up to 2,000 characters), and an optional assignee from the authenticated member directory.
- Preserve the sequential status workflow and idempotent status updates.
- Record creation, field edits (before/after), status changes, and soft deletion. Every mutation and its immutable event commit atomically. No-op edits produce no event.
- Reject stale edits with a version check; retain the user's draft and let them explicitly reload the latest task.
- Existing owners become creators. Existing tasks start unassigned with an empty description. Preserve all existing status event IDs, actors, and timestamps; do not invent missing historical creation/edit events.
- Refresh shared data when returning to the window, and provide an explicit Refresh action. No real-time infrastructure.

## Tasks and verification

1. Shared contracts, migration, and API. Test two-account access/assignment, actual session actors, strict input, stale writes, no-ops, atomic rollback for every mutation, forward migration, immutable events, and deleted read-only behavior. Commit the backend task.
2. Team list, create/edit forms, and complete activity timeline. Test identity metadata, before/after rendering, assignment, failed/stale draft retention, refresh, and deleted controls. Commit the UI task.
3. Update design/setup documentation and the real-browser flow. Verify John creates, Jane edits/reassigns/advances/deletes, John sees the same history; verify desktop/mobile dialogs, keyboard behavior, and overflow. Run the complete test suite, typecheck, and build. Commit verification and documentation.

## Verification completed — 11 October 2026

- 56 tests pass; strict typecheck and production build pass.
- Two independent browser sessions verify shared access, assignment, exact field diffs, stale drafts, sequential status changes, deletion with retained history, session expiry, and modal keyboard behavior at 1440px and 390px.
- Visual review covers the team list, task forms, sticky detail header, and full activity timeline. List overflow also checked at 320px, 768px, and 1024px.
- A refresh regression test verifies that a teammate's latest status updates both the detail sheet and the underlying list.
