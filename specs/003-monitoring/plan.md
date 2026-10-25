# Implementation plan: owner C

Own `src/modules/monitoring`, exporting `MonitoringPanel` and its typed props. Accept consent plus an event callback; never import repository or AI services. A owns room composition and receives observations through `onEvents(events)`.

The initial hook listens to `visibilitychange`. Add camera capture via `getUserMedia` and face detection through `@mediapipe/tasks-vision`; use a worker/throttled frames to avoid blocking the interview UI. Download/pin an official compatible model asset and record its source/license; no model weights are bundled initially.

Keep inference browser-local. Store detection counters and grace-period state locally; emit only bounded events with IDs, source, type, ISO timestamp, optional duration and neutral detail. Distinguish unavailable sensor state from actual detections. Reset timers after pause, device failure, and tab suspension to avoid false duration claims.

For audio, coordinate one device stream with A's transcription controls. A VAD library/model is not installed until selected and reviewed. Do not add diarization as if VAD already distinguishes speakers. Separate browser-local analysis from any disclosed off-device transcription provider.

Cleanup uses effect teardown/AbortController/track.stop(). Maintain a bounded retry queue and preserve original IDs. Add explicit status UI for declined consent, unavailable browser APIs, denied permission and model loading errors.
