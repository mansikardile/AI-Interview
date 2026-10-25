# Implementation plan: owner D

Route handlers parse shared Zod inputs and call `SessionService`. A server-only runtime selects memory/PostgreSQL repository and mock/Jarvis intelligence. Owner cookies are random opaque values; only hashes are persisted. Mutation Origin/content-type checks are centralized.

Repository contract: `create`, `getOwned`, `compareAndSwap`. A session aggregate stores config, questions, answers, observations, status and revision; owner metadata remains repository-internal. PostgreSQL uses an indexed owner column and JSONB document, updating with a revision predicate. Use migrations before enabling it. Memory is process-local and only for development.

Validate provider output before CAS. On collision, reload and recognize matching IDs; no silent overwrite. Do not hold a database transaction open during an LLM request. A CAS conflict can require the client to retry; future per-answer jobs/outbox can reduce repeated inference costs.

Reports aggregate bounded answer rubric feedback. Monitoring observations are returned in a distinct section; they never enter score arithmetic.

Temporal foundation: workflow calls a small activity in a separate worker. Next task is session signals/updates plus durable repository effects, explicit retry policy, idempotent answer handling and failure recovery tests. No raw frames/audio in workflow history. Avoid promising a fixed-time interview ends correctly until timeout orchestration is implemented.

Nudgebee foundation: server health client uses explicit base URL; health liveness is not proof of authentication or end-to-end readiness. Before an incident lab, verify actual upstream API/tenant auth and create a narrowly scoped sandbox.
