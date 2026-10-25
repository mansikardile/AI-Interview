# 004: Session platform, reporting and integrations

Owner D · Contract version 1 · Status: working mock API, optional PostgreSQL adapter and Temporal smoke foundation

## Goal

The other three modules integrate through a predictable, private session API and can independently develop against fixtures.

## Requirements

- PLAT-001: Implement version-1 shared schemas and endpoints in `docs/CONTRACTS.md`; reject invalid data consistently.
- PLAT-002: Scope every session lookup/mutation/report to an opaque anonymous browser owner cookie. Unknown/unowned IDs return 404; do not return stored owner hashes.
- PLAT-003: Support session creation, retrieval, answer submission, monitoring batches and completed-session report retrieval. Bound question count and input sizes.
- PLAT-004: Use stable submission/event IDs and revision/CAS writes. A duplicate answer with the same payload returns its existing state; conflicting reuse/stale questions are rejected.
- PLAT-005: Reports reference answer feedback and separate monitoring counts. Mock feedback is labeled. No score depends on monitoring.
- PLAT-006: Default memory mode requires no services and states its limitations. Optional PostgreSQL storage persists across app restarts behind the same repository contract.
- PLAT-007: Temporal runs separately and must not be imported into client bundles or executed as an HTTP request worker. Its starter smoke workflow is clearly labeled as not yet integrated with session progression.
- PLAT-008: Nudgebee remains optional and server-side. Its initial adapter is a connection/health foundation, not a completed incident-lab integration.
- PLAT-009: Provider errors leave an answer uncommitted and retryable; no response leaks secrets/internal stack traces.
- PLAT-010: Define deletion/retention/auth/rate-limiting and lifecycle-orchestration work before claiming public-production readiness.

## Acceptance

1. Default env completes an interview and report with no keys/services.
2. A different browser cookie cannot retrieve, answer, append observations or read a report for another owner's session.
3. Retried answer/event IDs do not duplicate records; overlapping writes either succeed through a retry or return a clear conflict.
4. Reports before completion return conflict; completed reports quote assessment evidence and separate observations.
5. With PostgreSQL enabled, the same browser's session survives a Next.js restart.
6. With a running Temporal server/worker, `npm run temporal:smoke` completes and is visible in Temporal UI. This does not imply full interview recovery.
7. Provider failure returns a retryable error and leaves state unchanged.

## Verify

Contract/service/provider automated tests, production build and mock HTTP journey. PostgreSQL/Temporal/Nudgebee live checks require those services and must be recorded separately.
