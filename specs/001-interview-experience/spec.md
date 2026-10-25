# 001: Interview experience

Owner A · Contract version 1 · Status: scaffold with a working typed-answer demo

## Goal

A candidate can configure a mock interview, answer questions, receive adaptive follow-ups, and open a useful completion report.

## Requirements

- UX-009: Saved interview UI requires explicit camera/audio consent and working camera/microphone before revealing questions or accepting answers. Browser denial, revocation, stop or disconnection blocks progression while preserving drafts. Users may exit or retry; no permission bypass. Fixture and diagnostic routes remain device-optional for independent development. The server cannot attest hardware permission from client consent flags.

- UX-001: Configure role (backend/frontend/SRE), difficulty, job description, question count (1–5), required camera/audio consent for saved interviews, and optional focus consent. Résumé upload is deferred; do not imply it is available.
- UX-002: Show the current question and a text answer field. Disable duplicate button presses while pending; keep a stable submission ID across retries.
- UX-003: Display provider/storage mode, progress, errors, and answer-grounded feedback. Preserve the drafted answer when a request fails.
- UX-004: Submit the current question ID and answer UUID through the shared API. Navigate to the report only after completion.
- UX-005: Recover the session by URL in the same browser while its configured repository retains data. Never promise memory mode survives restarts.
- UX-006: A future voice mode must allow editing a transcript before submission and always retain text fallback. Explicitly disclose any off-device transcription.
- UX-007: Mount C's monitoring component with consent and an event callback. Display technical feedback separately from observations.
- UX-008: Fixture route `/interview/demo` supports independent UI/media work without backend calls and is labeled fixture-only.

## Acceptance

1. Given default env, when a candidate starts and answers the configured number of questions, then a report opens without external credentials.
2. Given a failed submission, when the candidate retries unchanged input, then the same answer UUID is reused and at most one answer is recorded.
3. Given camera/audio permission denial in a saved interview, progression is blocked with retry/exit guidance and the answer draft is preserved. Device-free fixture interviewing remains available and explicitly labeled.
4. Given an unknown or unowned session URL, then show a useful not-found/error state without another browser's data.
5. Given monitoring disabled, then the interview requests no camera/microphone and emits no monitoring telemetry.

## Non-goals

Avatar generation, desktop lockdown, résumé file parsing, arbitrary coding execution, and hiring decisions.

## Verify

`tests/session-service.test.ts`, integrated mock journey, retry/error manual checks in `docs/DEMO.md`. Voice and media acceptance remain unchecked until their assigned implementation lands.
