# Owner C tasks

- [x] C01 / MON-001,002: Consent-gated visibility observer and neutral timeline panel.
- [x] C02 / MON-006: Typed event contract and backend deduplication/consent checks.
- [x] C03 / MON-003: Explicit camera start, pinned MediaPipe assets and sustained no-face/multiple-face state tracking.
- [x] C04 / MON-003,005: Low-quality frame guards, permission/device errors, throttling, cancellation and stream/model cleanup tests.
- [x] C05 / MON-004,009: Local Silero VAD, silence/disconnect/TTS separation and microphone sharing handle for A.
- [x] C06 / MON-005,006,010: Bounded persistent retry queue, status feedback and JSON metadata export.
- [x] C07 / MON-001–010: Automated permission/lifecycle/disabled-source checks, real-model browser diagnostic and documented device acceptance matrix.
- [x] C08 / MON-008: Owner-scoped consent endpoint, revocation and server-acknowledged source enabling.
- [ ] C09 manual acceptance: Exercise actual webcam/microphone, OS permission indicators, multiple people, lighting and acoustic conditions using `docs/TEAM-C-HANDOFF.md`. Implementation tests use generated inputs and injected devices; no physical device access was requested.
- [x] C10 / MON-011: Server-only Jarvis/Gemma 4 adapter, structured review/evidence validation, owner-scoped consented endpoint, report UI and provider contract tests.
- [ ] C11: Verify live Jarvis credentials, exact model ID and inference quality using `docs/GEMMA-JARVIS.md`.
- [x] C12 / MON-012: Mandatory camera/audio readiness, revocable consent, blocked progression and track guard; fixtures remain optional. Browser lock-state and controller tests pass.
- [x] C13: Real local Ollama Gemma 4 review with constrained evidence IDs and provider labeling; synthetic smoke passes.
