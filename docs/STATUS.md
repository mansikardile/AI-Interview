# Scaffold delivery status

Permission/Ollama update: saved interview UI requires explicit camera/audio consent and both devices ready. Denial, stop and revocation block progression and preserve drafts; fixtures/lab remain optional. Local `gemma4:e2b-mlx` passed real synthetic question/assessment/review inference. Hosted Jarvis and physical-device acceptance remain unverified. See `GEMMA-JARVIS.md` and `VERIFICATION.md`.

Updated: 2026-10-25. Task checkboxes describe scaffold implementation, not completion of every product feature.

| Area          | Included now                                                                                                                | Assigned next                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Interview UI  | Role/level/JD setup, typed answer loop, sample answers, fixture route, report navigation                                    | Voice interaction, draft recovery, accessibility/device testing         |
| Intelligence  | Deterministic labeled mock, text Jarvis adapter, schema/quote validation and provider failure handling                      | Human-reviewed prompt evaluation and live endpoint verification         |
| Monitoring    | Local MediaPipe face detection, Silero VAD, visibility, consent updates, lifecycle guards, bounded retry/storage and export | Physical-device/browser/lighting/acoustic acceptance checks             |
| Platform      | Anonymous owner scope, routes, CAS/idempotency, memory and optional PostgreSQL adapters                                     | Real PostgreSQL persistence checks, deletion/retention/auth/rate limits |
| Reports       | Per-answer feedback, placeholder/live labels, rubric averages and separate observations                                     | Targeted retry round and export                                         |
| Temporal      | Separate connectivity workflow/worker/smoke client                                                                          | Run against a server and integrate session lifecycle                    |
| Nudgebee      | Optional health adapter only                                                                                                | One verified isolated incident interview lab                            |
| Team workflow | Four owner specs/plans/tasks, maintained contracts, CI and contribution guide                                               | Add teammate names and split branches after common scaffold commit      |

No model API key, external account, deployment, database container, Temporal server or Nudgebee deployment is created automatically. Memory mock mode is the working baseline. See the final handoff / `docs/VERIFICATION.md` for the checks actually executed.
