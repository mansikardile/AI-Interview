# 003: Media and optional session monitoring

Owner C · Contract version 1 · Status: visibility observer and media placeholder

## Goal

A candidate can optionally observe practice conditions while retaining control of their devices and data.

## Requirements

- MON-001: Capture only consented sources: focus, camera, audio. Default all off. Monitoring disabled means no device access and no telemetry.
- MON-002: Focus monitoring emits timestamped `page_hidden` and `page_visible` observations; hidden duration uses elapsed time and a unique event ID. A future window-blur event must remain distinguishable from visibility.
- MON-003: Camera detection reports sustained no-face or multiple-face observations with configurable grace periods. Detection failures/permission denial have their own status and are not reported as absence.
- MON-004: Audio VAD reports speech/silence activity without identifying a speaker or inferring outside help. Distinguish device disconnection from silence; exclude question TTS playback.
- MON-005: Provide explicit enable/disable controls, stop streams and observers on exit, and send metadata only. No raw recording/upload by default.
- MON-006: Batch bounded events with stable IDs; retries cannot duplicate timeline entries. Failed telemetry never blocks interview answers.
- MON-007: Display observations separately from technical feedback. No honesty, emotion, gaze, identity, or cheating scores.
- MON-008: A later consent-changing control must update server consent before sending newly enabled-source events. The starter fixes consent at session creation.

## Acceptance

1. Given consent off, opening the room triggers no media permission prompt or event POST.
2. Given focus consent on, hiding and returning to the tab creates one matching interval with a nonnegative duration.
3. Given camera permission denied or a dark frame, show an unavailable/detection-quality status; do not assert cheating.
4. Given room exit, camera/microphone tracks stop and listeners/workers are removed.
5. Given one batch retried twice, each event ID appears once. A source without consent is rejected.
6. Given a silence event, interview feedback remains determined only by the answer.

## Non-goals

Desktop lockdown, detecting another device, proving assistance, face recognition, gaze/emotion classification, and voice identity matching. Diarization is stretch and cannot establish outside assistance.

## Verify

`tests/session-service.test.ts` covers consent and deduplication. Owner C adds browser/manual permission, visibility, quality, grace-period and cleanup checks on actual devices.
