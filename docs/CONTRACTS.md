# Shared contracts: version 1

Executable source of truth: `src/contracts/index.ts`. Owner D coordinates changes; affected owners review them. No module should invent its own incompatible session, answer, question or monitoring shape.

## HTTP rules

Permission policy update: saved interview UI requires camera/audio consent and live device readiness; fixtures/lab are device-optional. The API retains consent defaults for development clients and cannot prove physical permission from client flags. `MonitoringPanel` adds `required?`, `onReadinessChange?`; the handle adds synchronous `isReady()` for submission guards. Monitoring review `provider` is now `jarvislabs | ollama`; local mode uses `AI_PROVIDER=ollama` and loopback-only transport. See `GEMMA-JARVIS.md`.

Team C adds `POST /api/sessions/:id/monitoring/review` with strict `{ "allowMetadataTransfer": true }`. Requires the owner cookie, reads persisted events, and returns `src/contracts/monitoring-review.ts`. Uses live Jarvis/Gemma independently of mock interview mode; sends metadata only and neither persists reviews nor changes scores. Missing configuration returns 503; provider/output failures return 502. See `GEMMA-JARVIS.md`.

Base path: `/api`. Success: `{ "data": ... }`. Failure: `{ "error": { "code": "...", "message": "...", "retryable": false } }`.

Send JSON mutations with `Content-Type: application/json` and same-origin browser credentials. Server creates an opaque `iq_owner` HttpOnly cookie at session creation. Every session operation checks its stored owner hash; hashes are never returned. Other browsers receive 404. This is anonymous prototype isolation, not full authentication. Do not log cookies.

Dates are UTC ISO strings, IDs are UUIDs, `durationMs` is a nonnegative integer, and rubric scores range from 0 to 5. Error messages do not contain submitted candidate content or credentials. JSON bodies are bounded to 100,000 characters after reading; add upstream byte/stream limits before public deployment.

| Method | Path                       | Input                                 | Success data                                   | Owner                    |
| ------ | -------------------------- | ------------------------------------- | ---------------------------------------------- | ------------------------ |
| GET    | `/health`                  | none                                  | selected modes and scaffold integration status | D                        |
| POST   | `/sessions`                | `InterviewConfig` (defaults accepted) | `InterviewSession`, HTTP 201                   | D, consumed by A         |
| GET    | `/sessions/:id`            | owner cookie                          | `InterviewSession`                             | D/A                      |
| DELETE | `/sessions/:id`            | owner cookie                          | `{ deleted: true }`                            | D                        |
| POST   | `/sessions/:id/retry`      | owner cookie, completed session       | targeted retry `InterviewSession`, HTTP 201    | D                        |
| POST   | `/sessions/:id/answers`    | `SubmitAnswerInput`                   | updated `InterviewSession`                     | D, invokes B             |
| POST   | `/sessions/:id/events`     | `{ events: MonitoringEvent[] }`       | `{ accepted: true, revision }`                 | D, consumed by A/C       |
| PATCH  | `/sessions/:id/monitoring` | `{ monitoring: MonitoringConsent }`   | updated `InterviewSession`                     | C integration into D API |
| GET    | `/sessions/:id/report`     | owner cookie, completed session       | `InterviewReport`                              | D                        |

## Create a session

```json
{
  "role": "backend",
  "difficulty": "mid",
  "jobDescription": "Build reliable APIs",
  "questionCount": 3,
  "monitoring": { "focus": true, "camera": false, "audio": false }
}
```

Roles: `backend | frontend | sre`. Difficulty: `junior | mid | senior`. Question count: 1–5 including follow-ups; this is not a timed session. Job description: up to 8000 characters. All monitoring defaults off. Setup supports all three sources; camera/audio additionally require explicit start controls and browser permission.

Optional `practiceFocus` is bounded to 2000 characters and sent as untrusted model context. Targeted retry rounds preserve the original JD/role/level, add focus derived from prior practice suggestions, cap questions at 3 and reset all consent to false. They are separate sessions; deleting one does not delete the other. Repeating a retry-creation POST creates another round; creation is not an idempotent job.

Returned session includes: `contractVersion`, `id`, `createdAt`, `completedAt`, `revision`, `status`, `mode`, `storage`, `config`, `questions`, `activeQuestionId`, `answers`, `events`. Status is `in_progress | completed`; `mode` is `mock | live`; storage is `memory | postgres`.

## Answer submission

```json
{
  "submissionId": "30000000-0000-4000-8000-000000000001",
  "questionId": "20000000-0000-4000-8000-000000000001",
  "text": "Use an idempotency key and persist the result atomically."
}
```

Client generates `submissionId` once per unchanged submission and keeps it on network/provider retries. Text is trimmed, 1–12000 characters. Identical IDs/payloads return current state without another stored answer. Different content under a used ID returns 409. Wrong/inactive question returns 409. A successful final answer completes the interview; otherwise the next question is appended.

`Feedback` contains `scores: {correctness, reasoning, clarity}`, `evidenceQuote`, `strengths`, `gaps`, and `nextPractice`. The quote must appear verbatim in the answer. Mock feedback is marked through the answer/session `mode` and uses fixed placeholders.

## Monitoring observations

```json
{
  "events": [
    {
      "id": "40000000-0000-4000-8000-000000000001",
      "source": "focus",
      "type": "page_visible",
      "occurredAt": "2026-10-25T09:30:00.000Z",
      "durationMs": 12000
    }
  ]
}
```

| Source | Allowed types                                          |
| ------ | ------------------------------------------------------ |
| focus  | `page_hidden`, `page_visible`                          |
| camera | `no_face`, `multiple_faces`, `camera_unavailable`      |
| audio  | `speech_activity`, `silence`, `microphone_unavailable` |

Batch size: 1–50, session cap: 1000. Optional neutral `detail` is at most 300 characters; no raw audio/image fields are permitted. Source/type must match and its source consent must be true. Duplicate event IDs are ignored. New events after completion are rejected. The additive consent PATCH endpoint accepts the same source booleans, checks the owner cookie, and rejects completed sessions. Capture stops immediately on local revocation, and newly enabled sources wait for the server acknowledgement.

Events are client-reported observations and are not trusted proof of behavior. Do not turn them into a cheating probability or use them to change technical feedback.

## Reports

Integrated reports add optional `config: InterviewConfig` and `questions: Question[]`, populated by the current server. Older payloads remain accepted. Results show original JD/level and map each answer's `questionId` back to question text. Browser dictation may use vendor-managed capture, with explicit disclosure; TTS uses C's `playbackActive` rather than disabling required monitoring.

Available after completion only (409 otherwise). Contains role, mode, completion time, average rubric scores, individual answers/feedback, deduplicated practice suggestions, and a distinct `observations` section. Monitoring is absent from the score calculation and from B's model prompt. Mock reports label scores as placeholders.

## Module interfaces

The A/C speech port is typed in `src/contracts/media.ts`: `SpeechCaptureController` exposes `start`, `stop`, and `dispose`; callbacks receive state, transcript updates and errors. C owns stream acquisition; A owns transcript editing, submission, and question TTS. Owner A ships a default browser Web Speech adapter (`createWebSpeechCapture`) behind that interface, with on-device/vendor disclosure in the UI. `InterviewExperience` accepts an optional `createSpeechCapture` factory so C can replace acquisition without rewriting the room. Text fallback remains mandatory.

- **A** exports `InterviewSetup` and `InterviewExperience({sessionId, fixture?})`. The browser calls `api` from `src/lib/api-client.ts`.
- **B** exports `InterviewIntelligence` with `mode`, `initialQuestion(config)`, and `assessAnswer(context, answer)`. Context contains config, questions and previous answers only. `MockIntelligence`, `JarvisIntelligence`, and `validateAssessment` are public. Platform runtime selects the provider with `getIntelligence()`.
- **C** exports `MonitoringPanel({sessionId, consent, events, onEvents, onConsentChange, active, playbackActive?, ref?})`. `onEvents(batch, signal)` must resolve only after saving and reject on failure, allowing the bounded queue to retry with stable IDs. The handle exposes `finish`, `resume`, `getMicrophoneStream` and `setPlaybackActive`. A owns HTTP session progression; C supplies consent fields, local detectors, lifecycle, metadata delivery and pending-export components. Details: `docs/TEAM-C-HANDOFF.md`.
- **D** exposes server API/runtime/repository services through platform `index.ts` and `InterviewReport` through reports `index.ts`. Browser components never import platform.

## Important errors

| Code                                                                       | HTTP | Action                                                         |
| -------------------------------------------------------------------------- | ---- | -------------------------------------------------------------- |
| `VALIDATION_ERROR`, `INVALID_JSON`                                         | 400  | Correct input                                                  |
| `ORIGIN_REJECTED`, `CONSENT_REQUIRED`                                      | 403  | Do not retry unchanged                                         |
| `NOT_FOUND`                                                                | 404  | Start in owning browser or create another session              |
| `STALE_QUESTION`, `IDEMPOTENCY_CONFLICT`                                   | 409  | Reload/reconcile; do not resubmit against a different question |
| `WRITE_CONFLICT`                                                           | 409  | Retry the same payload/ID                                      |
| `REPORT_NOT_READY`, `SESSION_COMPLETED`, `EVENT_LIMIT`, `PROVIDER_CHANGED` | 409  | Follow the message; no blind retry                             |
| `BODY_TOO_LARGE`                                                           | 413  | Reduce input                                                   |
| `INVALID_CONTENT_TYPE`                                                     | 415  | Send JSON                                                      |
| `PROVIDER_UNAVAILABLE`, `INVALID_MODEL_OUTPUT`                             | 502  | Keep answer and submission ID; retry                           |
| `CONFIGURATION_ERROR`                                                      | 503  | Fix server env and restart                                     |

Contract v1 now includes owner-scoped deletion and targeted retry creation. The browser clears this session's app-owned draft/pending metadata in the current tab after successful deletion, not downloaded exports, provider-held records, other sessions or other tabs. Both new routes return origin errors through the normal JSON envelope. File upload, streaming audio, SSE, full authentication, pagination, timed interview, pause/cancel and incident labs remain deferred.
