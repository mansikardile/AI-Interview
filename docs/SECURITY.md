# Data handling and public-release checklist

## Current development boundary

This is a local/team prototype. An opaque HttpOnly, SameSite=Lax browser cookie scopes sessions; API responses omit the stored owner hash. JSON mutations reject mismatched Origin headers and unexpected content types. Input schemas bound transcript/event sizes. Model keys are server-only. No raw recording is implemented.

Monitoring records explicit observations such as `page_hidden`, not conclusions such as "candidate cheated". Events are accepted only when monitoring was enabled on the session and only for the consented source. Technical reports are computed from answer feedback alone.

Candidate answers and job descriptions may contain prompt injection. Keep them in a data envelope separate from trusted interviewer instructions. Do not execute generated code or arbitrary tools. Validate model JSON, evidence quotes, field lengths, and allowed values before storing it. Avoid logging candidate content or raw provider bodies.

## Before opening the prototype to the public

- [ ] Add durable authentication, account-level authorization and session revocation.
- [ ] Add rate limiting, spend quotas, request body limits at the proxy, and abuse controls.
- [ ] Verify cookie/CSRF behavior behind the deployed proxy and TLS termination.
- [ ] Add retention, session deletion/export, expiry of anonymous data, backup/access policy, and a visible privacy notice.
- [ ] Audit provider data handling and disclose transcript/image transfer before consent.
- [ ] Add encrypted transport/database access and secrets management; never expose `.env.local`.
- [ ] Test accessibility and accommodations. Permission denial, poor lighting, silence or focus loss must not imply dishonesty.
- [ ] Validate model feedback with a human-reviewed evaluation set. No automated hiring decisions or honesty scores.
- [ ] Add durable jobs/outbox/idempotency for external effects and exercise worker/server crash recovery.
- [ ] Review upstream licenses/attribution before adding Nudgebee code or redistributing model assets.

No desktop lockdown, biometric identity matching, raw recording, or background system inspection is part of the MVP.
