# InterviewIQ constitution

Version: 1.0.0 · Adopted: 2026-10-25

1. **Practice and learning first.** InterviewIQ is a candidate-controlled mock-interview coach. It does not make hiring decisions or infer honesty, emotion, identity, or personality from video/audio.
2. **Specifications are maintained.** Every module has `spec.md` (observable behavior), `plan.md` (implementation), and `tasks.md` (delivery). Requirements have stable IDs and acceptance scenarios. Change the spec and shared contract before changing cross-module behavior.
3. **Independent modules, explicit contracts.** Import another module through its public `index.ts` only. `src/contracts` owns shared wire schemas; infer TypeScript types from Zod. Owner D coordinates contract revisions with affected owners.
4. **External services are replaceable.** Default startup uses explicitly labeled mock intelligence and memory storage. Real integrations fail explicitly if misconfigured; never silently claim mock output came from a model. Each module must be developable without another teammate's unfinished code.
5. **Evidence before evaluation.** Feedback must reference the candidate's answer. Model output is untrusted and schema-validated. Monitoring observations never change technical feedback scores or become a cheating probability.
6. **Consent and minimization.** Camera/microphone access is opt-in. No recording or raw webcam upload by default. Monitoring requires session consent, supports a disabled state, and releases device resources on exit. Uploaded diagrams and audio require separate disclosed handling before shipping those features.
7. **Server-only credentials.** Model, database, Temporal, and Nudgebee secrets stay on the server. Anonymous sessions are scoped to an opaque HttpOnly browser cookie. This scaffold is for local/team development; a public release needs the hardening checklist in `docs/SECURITY.md`.
8. **Reliability is observable.** Session transitions and answer IDs are explicit. Retried submissions must not duplicate answers. Durable execution claims require a real Temporal server plus durable application storage, not the memory adapter.
9. **Proportional verification.** Shared contracts, transitions, ownership boundaries, provider validation, and retry behavior need meaningful automated tests. Each feature's acceptance criteria must be checked before its tasks are marked complete.
10. **Honest delivery status.** Document what is implemented, mocked, scaffolded, or deferred. Existing packages and adapter files do not count as a complete integration.

Amendments: update this version, explain the change in the PR, and update affected specs/contracts/tests. The human user's instructions take precedence over repository guidance.
