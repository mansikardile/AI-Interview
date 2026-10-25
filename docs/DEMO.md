# Demo and verification script

## Mock baseline (no services or keys)

1. `npm ci`, `cp .env.example .env.local`, `npm run dev`.
2. Open `http://localhost:3000`. Confirm the demo/memory indicators.
3. Start a backend interview with monitoring disabled. Submit the three fixture answers or your own text. Confirm feedback and follow-ups, then the completed report.
4. Reload a session in the same browser: it should remain available while that server process remains running. A different browser should not retrieve its private state.
5. Start another session with focus monitoring enabled. Hide the tab, return, and verify a timestamped observation. Its technical feedback must be unchanged.
6. Open `/interview/demo` for independent component development. It is a clearly labeled fixture, not a real saved session.
7. `npm run check` and `npm run build`.

## Owner A acceptance (interview experience)

1. **Draft restore:** Start a session, type a partial answer, refresh. The same question restores that draft. After submit, the next question must not show the previous draft.
2. **Reconnect:** With the server stopped mid-session, the room shows an error/retry. Restart the server and Retry — session reloads; draft remains if the question ID matches.
3. **Permission denial:** Deny microphone (or use a browser without Web Speech). Typed submit still works; voice control shows unavailable.
4. **Double-click submit:** Rapid double submit while pending does not create two answers; retry after failure reuses the same submission UUID until the text changes.
5. **Spoken question:** Play / Pause / Mute the question. While TTS plays, the “App TTS active” badge appears and monitoring panel is inactive so C can ignore app audio.
6. **Narrow screen:** Resize below 760px — columns stack; controls remain usable.
7. **Fixture:** `/interview/demo` exercises voice + TTS without calling the session API.

## Live intelligence

Set `AI_PROVIDER=jarvis`, `JARVISLABS_API_KEY`, and the exact model ID from your account. Restart Next.js. Answer once; verify a schema-validated response and answer-grounded quotation. A provider failure should show a retryable error, not silent mock output. Do not claim successful live verification without actually running it.

## Optional infrastructure

Use `docs/INTEGRATIONS.md` to run PostgreSQL and the Temporal smoke workflow. Restart the application in PostgreSQL mode and verify the session survives. The smoke workflow demonstrates worker connectivity only; it does not prove interview lifecycle recovery.

## Final presentation (once owner tasks are complete)

Create a role-specific interview, give a plausible but incomplete answer, receive a specific changed-constraint follow-up, explain the improved reasoning, and show the quoted feedback. Present monitoring separately as opt-in session observations. Show real results and actual provider/latency; label simulated output visibly.
