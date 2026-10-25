# Implementation plan: owner A

Use client components under `src/modules/interview/components`. Routes only compose the public module component. Use `src/lib/api-client.ts` for JSON requests and shared Zod inferred types. No database/provider imports in client code.

Server creates the session and initial question. On answer submission, maintain `{submissionId, questionId, text}` until success; a changed text gets a new ID. Render returned state rather than locally inventing authoritative progress. Keep transcript draft independent of the camera lifecycle. Show explicit errors; no auto-advance on failed assessment.

Integrate `MonitoringPanel` from the monitoring public entrypoint, sending observations to the monitoring endpoint. Failed telemetry should be visible and must not block submitting an answer. Coordinate media capture ownership with C to avoid opening multiple microphone streams.

Future speech interface: C owns device stream acquisition/cleanup, A owns text editing/submission and playback controls. B receives text, never a browser `MediaStream`. Agree on a transcription provider and data disclosure before sending audio off-device.

Verification: integrated mock journey, permission/error manual scenarios, and interaction tests once voice states are added. Avoid cosmetic tests that simply mirror JSX.
