# Four-person ownership and first assignments

Names can replace A–D without changing the boundaries. Each person works in their own checkout/branch; commit the common scaffold once before branching. Do not run four branches against one physical checkout.

| Owner | Module / branch                                     | Owns                                                                                                                                    | Public integration point                                             |
| ----- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| A     | Interview experience · `codex/interview-experience` | `src/modules/interview/**`, `src/app/page.tsx`, `src/app/interview/**`                                                                  | `InterviewExperience` and the HTTP client in `src/lib/api-client.ts` |
| B     | AI interviewer · `codex/intelligence`               | `src/modules/intelligence/**`, `specs/002-intelligence/**`                                                                              | `InterviewIntelligence`, `getIntelligence()`                         |
| C     | Monitoring and media · `codex/monitoring`           | `src/modules/monitoring/**`, `specs/003-monitoring/**`                                                                                  | `MonitoringPanel`, event callback matching `MonitoringEvent`         |
| D     | Platform and reports · `codex/platform`             | `src/modules/platform/**`, `src/modules/reports/**`, `src/app/api/**`, `src/app/reports/**`, `src/workers/**`, `scripts/**`, `infra/**` | API routes, repository, reports, optional integration adapters       |

A also owns `specs/001-interview-experience/**`. D owns `specs/004-platform/**`.

## Shared files: coordinate changes

Owner D is the integration steward for `src/contracts/**`, fixtures, environment/configuration, dependencies/lockfile, CI, and shared docs. A coordinates global CSS/layout changes. Request review from affected owners before merging shared changes. This is a review convention, not a permission barrier to the human user.

Do not let each person install different libraries and independently modify the lockfile. Batch dependency requests early. Import module internals only from within that module; cross-module callers use `index.ts`.

## Start independently

### A: interview experience

Read `specs/001-interview-experience/`. Run `npm run dev` with defaults. Complete a typed-answer interview before adding voice UI. Use the API wrapper; do not call the model or database from React. First task: preflight device checks and polished loading/error/reconnect states. Next: microphone capture/transcript editing with C's media interface.

### B: intelligence

Read `specs/002-intelligence/`. Work against fixture sessions and mock questions; no server or camera required. Run `npm run test:ai`. First task: strengthen the answer-specific follow-up prompt and evaluate it on the fixture answers. Real JarvisLabs calls are opt-in via `.env.local`; invalid output must fail explicitly. Do not put personal data in prompt logs.

### C: monitoring

Read `specs/003-monitoring/`. Open `/interview/demo` to work with the fixture session. Camera and microphone need localhost or HTTPS and explicit permission. First task: MediaPipe face detection with grace periods and cleanup. Next: audio VAD, distinguishing silence from microphone failure. Focus visibility observation is provided as the initial example. Send timestamped observations, never scores.

### D: platform and reporting

Read `specs/004-platform/`. Use the memory adapter to work immediately. First task: run the PostgreSQL migration and verify persistence; then integrate the separately runnable Temporal example with session lifecycle. Finish report UX, retry/failure handling, deployment hardening, and optional Nudgebee adapter. No other owner needs PostgreSQL/Temporal for local mock development.

## Integration checkpoints (suggested 24–36 hour event)

| Time        | Joint result                                                         | Gate                           |
| ----------- | -------------------------------------------------------------------- | ------------------------------ |
| First hour  | Scaffold cloned, everyone completes mock interview                   | Same lockfile and contracts    |
| Hours 1–6   | A typed loop, B follow-ups, C camera prototype, D persistence        | Independent module checks pass |
| Hours 6–12  | Voice/transcript, validated real model, monitoring, persisted report | One end-to-end interview       |
| Hours 12–20 | Resume behavior and diagrams or one incident lab                     | Core demo remains working      |
| Final hours | Rehearsal, clean setup, attribution and known limitations            | `docs/DEMO.md` checked         |

Scope fallback: keep text answers and deterministic mock mode available if audio/provider connectivity fails. Clearly label mock output. Whiteboard, desktop lockdown, diarization, and Nudgebee incident labs are stretch features.

## PR handoff

Include requirement IDs, what changed, verification, screenshots when helpful, environment changes, and remaining tasks. Rebase/merge shared-contract changes before integration. One owner edits the root interview page composition at a time; B/C/D expose components/services instead of competing to rewrite it.
