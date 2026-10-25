# Team C: implementation and integration handoff

Gemma 4/JarvisLabs integration and private environment setup: [GEMMA-JARVIS.md](GEMMA-JARVIS.md). The report's opt-in live review interprets saved observations; real-time media stays local. No live provider key was available for verification.

Local Ollama is implemented and live-tested with installed `gemma4:e2b-mlx`: `npm run test:ollama` passes using synthetic data. No Jarvis key is required locally. See the setup guide for loopback-only configuration and provider labeling.

## Run it

```bash
npm ci
npm run dev
```

Open `/monitoring` for an independent local test room, or start an interview at `/`. All sources default off. Consent is separate from device start: enabling a checkbox does not request a camera or microphone. Click **Start camera** / **Start microphone** to request access. Use localhost/HTTPS.

Saved interviews now require camera/audio consent in setup and both working devices in the room before questions/answers unlock. Stopping, denying or revoking either device blocks progression and preserves drafts. Focus remains optional. Users can always exit; fixture/lab routes remain device-optional. Client readiness is not a tamper-proof server attestation.

The test room's **Verify local models without devices** button runs actual MediaPipe and Silero inference on generated checkerboard/silent inputs without physical device access. It does not test real-world face or speech accuracy. The test room's timeline is local only; actual interview sessions send metadata to the owned API.

## Implemented behavior

- Face detection at four frames/second, with one event per sustained episode: no face after 3 seconds and multiple faces after 2 seconds. Detection recovery resets the grace period. Dim, overexposed or low-variation images show a quality warning and do not produce a no-face event.
- Browser-local Silero v5 speech activity: a 300ms speech interval or 10-second silence interval produces a neutral observation. Hysteresis uses 0.7/0.35 thresholds. There is no transcription, speaker matching, diarization or assistance inference.
- Hidden tabs and question playback reset/pause inference timers. Stalled frames, interrupted signals, permission denial and disconnected devices have their own unavailable/paused states.
- Devices, timers, listeners, audio contexts and models are released on stop, revocation, completion, pagehide and unmount. Late permission/model results are released instead of reactivating capture.
- Consent can change during an active session using the owner-scoped PATCH endpoint. Revocation stops capture immediately; newly enabled sources wait for server acknowledgement and an explicit start action.
- Delivery batches at 50, retries preserve original IDs, backoff is bounded, network calls have 6-second deadlines, and the local queue caps at 250 (1000 unique events per mounted session). Permanent errors pause delivery; a retry button and JSON export remain available.
- Only validated event metadata can be retained in sessionStorage under a session-specific key. Navigation/reload can restore pending observations; unconsented restored sources are dropped. At completion, unsaved records are exportable from the report and explicitly excluded from its saved observation count.

The final answer performs a best-effort bounded flush before completion. If saving telemetry fails, the interview still completes. Unsaved observations are not silently presented as server-persisted.

## Public integration points

Import through `@/modules/monitoring`.

```tsx
const monitoring = useRef<MonitoringHandle>(null);

<MonitoringPanel
  ref={monitoring}
  sessionId={session.id}
  consent={session.config.monitoring}
  events={session.events}
  active={session.status === "in_progress"}
  playbackActive={questionAudioIsPlaying}
  onConsentChange={saveConsentToServer}
  onEvents={saveEventsToServer}
/>;
```

`onEvents(batch, signal)` MUST return a promise that rejects on failure. Do not swallow network errors: the queue needs the acknowledgement before removing events. The API client now accepts an optional AbortSignal. Parent state merges accepted events by ID.

`MonitoringHandle.finish()` stops capture and attempts delivery before the final answer; `.resume()` re-enables consented observations if answer submission fails, without automatically reacquiring devices. `.setPlaybackActive(true/false)` suppresses VAD during question audio; browser speechSynthesis playback is also detected. `.getMicrophoneStream()` returns the live stream for Team A to connect a transcription consumer; it returns null when stopped. A must not stop the borrowed original tracks. If A clones tracks, A must stop its clones on pause, revocation and exit.

`MonitoringConsentFields` is the setup form's reusable consent component. `PendingObservations` renders the report's unsaved-local-metadata notice. `MonitoringController` accepts injectable device/model/time dependencies for tests.

## Shared changes for A and D

- Setup imports consent fields; the room acknowledges delivery, exposes the controller ref, flushes before completion and restores monitoring after failed final-answer submission.
- `PATCH /api/sessions/:id/monitoring` accepts `{monitoring:{focus,camera,audio}}`, returns the session, checks the existing owner cookie and rejects completed sessions. Existing event schemas/types are unchanged.
- Reports add an unsaved-local-observations notice. Technical feedback calculations and AI prompts are unchanged.
- Runtime reuses repositories but recreates service instances so Next.js route bundles/HMR do not retain incompatible error constructor identities. This was needed to return expected consent errors consistently.

## Verification and hardware matrix

Automated: `npm run test:monitoring` covers grace periods, poor frames, playback suppression, devices resolving after cancellation, permission denial, disconnect/stall states, stream/model cleanup, bounded retry queues, replay IDs, revocation and owner isolation. `npm run test:monitoring:smoke` tests the real HTTP API with explicitly synthetic metadata; run it with the app already started. Existing interview smoke/tests remain intact.

Browser diagnostics successfully ran both actual models on generated inputs, including repeated load/cleanup. Browser UI consent enables start buttons without opening devices. Physical webcam/microphone checks remain manual; no access to the user's devices was requested during implementation.

| Manual scenario                  | Expected result                                                                 | Status                                                           |
| -------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| All consent off                  | No permission prompts, capture or telemetry                                     | Browser checked                                                  |
| Allow permission, one face       | Preview + running face count                                                    | Requires physical device check                                   |
| Leave usable camera frame for 3s | One `no_face` observation per episode                                           | State machine tested; hardware check pending                     |
| Two people for 2s                | One `multiple_faces` observation per episode                                    | State machine tested; hardware check pending                     |
| Dark/covered camera              | Quality warning, no face-absence observation                                    | Quality/state tests pass; hardware check pending                 |
| Deny/disconnect a device         | Neutral unavailable state; saved interview progression blocked, draft preserved | Injected-device tests pass; physical-device check pending        |
| Speak / pause 10s                | Speech/silence observation, no recording                                        | Real silent inference and state tests pass; speech check pending |
| App question playback            | No speech/silence observations during playback                                  | State tests pass; physical echo check pending                    |
| Stop, revoke, end, navigate      | Camera light/mic access ends, models close                                      | Lifecycle tests pass; OS indicator check pending                 |
| Network failure and retry        | Pending metadata retained; same IDs retried                                     | Queue + API tests pass                                           |

Detection is fallible and these are practice observations, not proof of dishonesty. This module adds no gaze, emotion, identity or hiring evaluation.
