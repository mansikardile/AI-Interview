# Demo and verification script

## Mock baseline (no services or keys)

1. `npm ci`, `cp .env.example .env.local`, `npm run dev`.
2. Open `http://localhost:3000`. Confirm the demo/memory indicators.
3. Start a backend interview with monitoring disabled. Submit the three fixture answers or your own text. Confirm feedback and follow-ups, then the completed report.
4. Reload a session in the same browser: it should remain available while that server process remains running. A different browser should not retrieve its private state.
5. Start another session with focus monitoring enabled. Hide the tab, return, and verify a timestamped observation. Its technical feedback must be unchanged.
6. Open `/interview/demo` for independent component development. It is a clearly labeled fixture, not a real saved session.
7. `npm run check` and `npm run build`.

## Live intelligence

Set `AI_PROVIDER=jarvis`, `JARVISLABS_API_KEY`, and the exact model ID from your account. Restart Next.js. Answer once; verify a schema-validated response and answer-grounded quotation. A provider failure should show a retryable error, not silent mock output. Do not claim successful live verification without actually running it.

## Optional infrastructure

Use `docs/INTEGRATIONS.md` to run PostgreSQL and the Temporal smoke workflow. Restart the application in PostgreSQL mode and verify the session survives. The smoke workflow demonstrates worker connectivity only; it does not prove interview lifecycle recovery.

## Final presentation (once owner tasks are complete)

Create a role-specific interview, give a plausible but incomplete answer, receive a specific changed-constraint follow-up, explain the improved reasoning, and show the quoted feedback. Present monitoring separately as opt-in session observations. Show real results and actual provider/latency; label simulated output visibly.
