# Phase 1 — dashboard/Telegram state convergence recommendation

Do not build this until Phase 0 passes live.

Telegram and the command rail use per-task lifecycle files, while the hosted dashboard reads the revenue document and Supabase mirror. They can diverge indefinitely.

The smallest safe Phase-1 PR is additive and read-only:

1. Add `readExecutionTasks()` using `loadAllTasks()` and `renderStatus()`.
2. Add a server-only read route.
3. Add a dashboard lifecycle panel using the same truth sentences.
4. Optionally mirror a compact task summary into the existing revenue state row for Vercel parity.

No schema migration, no authoritative-state replacement, and no live outreach should be included in that PR.
