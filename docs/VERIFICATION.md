# Initialization verification

## A/B/C integration (2026-10-25)

- Final `npm run check`: 89 tests across 14 files pass, plus lint and TypeScript. Integration includes all three role tracks, JD/history/results, native speech lifecycle and task-specific Ollama output schemas. Production build passes with existing third-party MediaPipe/ONNX dynamic-import warnings.

- Merged A (`7a92c69`), B (`ecc2e38`) and C (`4a257a0`) with histories retained on `codex/integration-interview-flow`. Flow decisions: `INTEGRATED-FLOW.md` and `specs/005-integration/`.
- Production HTTP integration smoke passes a JD and three question/answer rounds, identical-request retries, premature-report rejection, completed results with original JD/questions and foreign-owner rejection. Existing interview and monitoring HTTP smokes also pass in labeled mock mode.
- Browser skill verifies JD-first setup, explicit consent and required-device lock without physical device access. Completed all three fixture rounds with B's distinct follow-ups and quoted feedback. Physical speech/device acceptance is not implied.
- Actual local `gemma4:e2b-mlx` passes the merged question → assessment/exact quotation/follow-up → monitoring review smoke. Initial B prompt output nested nextQuestion inside feedback and was rejected. Task-specific schema output and explicit top-level instruction resolved that observed case; invalid future output still fails with draft preserved. No model-quality guarantee or hosted Jarvis test is claimed.
- Fixed TTS integration to use `playbackActive` without stopping required streams; browser dictation appends to existing text, requires transcript review before submit and has stale-callback/disposal tests. Web Speech has separate browser-managed capture and vendor disclosure; actual audio remains manual acceptance.

## Team C update (2026-10-25)

Latest permission/Ollama revision:

- `npm run check`: 66 tests, lint and TypeScript pass.
- `npm run test:ollama`: actual installed `gemma4:e2b-mlx` generates a valid question, an assessment with an exact answer quote and a monitoring review with grounded event IDs. Inputs are synthetic. Initial reviews failed validation; a per-request evidence-ID schema and exact-ID template were added. Invalid output still fails rather than being repaired into fabricated evidence. One passing smoke journey does not establish quality/reliability.
- Browser skill: required unchecked consent blocks setup; after consent and actual Gemma session creation, question/answer UI remains locked with devices off. No physical camera/microphone accessed. Screenshot: `docs/screenshots/required-devices.jpg`.
- `.env.local` selects Ollama and stays gitignored. Hosted Jarvis inference remains unverified without credentials. Physical permission acceptance and OS indicator checks remain manual.

- `npm run check`: 53 tests, lint and TypeScript pass, including media lifecycle, consent, delivery retries and Gemma/Jarvis provider contracts.
- Actual local MediaPipe and Silero models ran in the browser against generated visual/silent inputs, including production. No physical camera/microphone access was requested.
- Production HTTP monitoring smoke passed owner isolation, consent changes, idempotent events, revocation and score separation.
- Production build succeeds with upstream MediaPipe/ONNX dynamic-dependency warnings. Positive physical-device scenarios and live Jarvis inference remain unverified; see `TEAM-C-HANDOFF.md` and `GEMMA-JARVIS.md`.

## Original starter verification

Verified locally on 2026-10-25 with Node.js 24.10.0 and npm 11.6.1.

- Clean `npm ci` from the lockfile succeeds; installation audit reported zero vulnerabilities. Lint, tests, formatting and production build also pass after the clean install.

- `npm run check`: lint, route generation, TypeScript and 19 contract/service/provider tests pass.
- `npm run build`: production Webpack/PostCSS build passes, including the setup, fixture, interview, report and API routes.
- `npm run test:smoke` against the running production server: create → owner-scoped retrieval → answer → duplicate retry → report passes; missing-owner and cross-origin requests are rejected.
- Browser skill: completed a two-question backend mock interview through the UI, observed an answer-specific follow-up and exact quotation, and reached the report. No browser warning/error logs were recorded during that journey.
- Report screenshot: `docs/screenshots/report.jpg` (fixture content, no personal candidate data).
- Default flow requires no secrets, Docker or media permission.

The default starter's Turbopack CSS loader required a compiler port unavailable in the local sandbox, including the escalated attempt. The project now explicitly uses supported Webpack scripts and standard Tailwind/PostCSS; that build succeeded. Starting/calling the local server required sandbox escalation, which succeeded.

Not live-verified: JarvisLabs model availability/quality, actual PostgreSQL connection/persistence, Temporal server execution, Nudgebee deployment, camera detection, VAD/transcription or whiteboard inference. Those are explicitly tracked owner tasks. Provider request tests use mocked HTTP responses; the browser report uses labeled mock feedback with placeholder scores.
