# Implementation plan: owner C

Own `src/modules/monitoring`, exporting `MonitoringPanel` and its typed props. Browser components accept consent plus an event callback and never import repositories or credentials. A owns room composition and receives observations through `onEvents(events)`. A separate server-only entry generates opt-in Gemma 4 reviews through JarvisLabs; an owner-scoped route retrieves persisted metadata and validates evidence IDs. Reviews remain separate from scores; no media or free-text details reach the model. See `docs/GEMMA-JARVIS.md`.

The controller listens to `visibilitychange` and throttles camera inference to four frames/second. `getUserMedia` is called only by explicit start controls after consent acknowledgement. MediaPipe 1.1.1 loads a pinned local BlazeFace model; poor frame quality resets grace periods. See `ASSETS.md` for reproducible model/runtime preparation and notices.

Keep inference browser-local. Store detection counters and grace-period state locally; emit only bounded events with IDs, source, type, ISO timestamp, optional duration and neutral detail. Distinguish unavailable sensor state from actual detections. Reset timers after pause, device failure, and tab suspension to avoid false duration claims.

Audio uses pinned `@ricky0123/vad-web`/Silero v5 and ONNX Runtime Web, with locally served model/WASM/worklet assets. A controller-owned stream/context is released on stop, failure and cancellation; A can borrow the live stream through the public handle. VAD probability hysteresis/grace tracking emits activity metadata only. Application playback pauses observations. Transcription remains a separate A integration.

Cleanup uses effect teardown, generation guards, AbortController and track.stop(). The queue batches at 50, preserves IDs, bounds pending metadata at 250, persists validated pending records in sessionStorage, and exposes retry/export status. Consent changes use the new owner-scoped PATCH endpoint; revocation immediately stops devices. See `docs/TEAM-C-HANDOFF.md` for integration semantics, actual verification and the remaining physical-device checklist.
