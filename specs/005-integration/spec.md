# 005: Integrated A/B/C interview journey

Status: integration verification in progress. Authorized scope: merge the pushed A/B/C branches, reconcile shared behavior, verify, then merge/push main.

## Requirements

- INT-001: The saved journey starts with a nonempty job description plus role, level and question count, then explicit camera/audio consent. Generate a session from that unchanged context. Device-free development fixtures remain explicitly separate.
- INT-002: Hide questions and block answer submission until both required devices are ready. Denial/revocation stops capture and preserves the draft; users can always exit.
- INT-003: Optional question playback suppresses VAD analysis only, never stops the required camera/microphone. Optional dictation discloses browser-vendor audio handling, preserves typed text, and stops on submit, playback, revocation or navigation.
- INT-004: Preserve B's rubric, question/answer history, JD data envelope and exact evidence validation alongside C's Ollama/Jarvis selection. Follow-ups change constraints and monitoring never affects technical scores.
- INT-005: Preserve question-scoped drafts across refresh, stable submission IDs across retries, and acknowledge metadata delivery. Final submission stops devices, completes the session and opens results only after server success.
- INT-006: Results include original JD/role/level, question text for each answer, rubric feedback, practice plan and separate optional monitoring review. Completed sessions redirect to results, ownership failures never disclose another browser's data.

## Verification

Run merged tests/lint/typecheck, production build, HTTP multiround journey and synthetic local Gemma smoke. Use browser fixtures for JD flow, draft recovery and multiround interaction without accessing physical devices. Document physical-device/browser speech and hosted Jarvis limitations rather than marking them tested.
