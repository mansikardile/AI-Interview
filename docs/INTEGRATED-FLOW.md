# Integrated interview flow

1. **Job context:** provide a JD, choose backend/frontend/SRE, experience level and question count. No device prompt or paid model call occurs at this step. Context can be edited before creation.
2. **Consent:** review the JD/settings, explicitly consent to required camera/audio, optionally enable focus observations. Continue creates the owner-scoped session and its initial JD-based question. Mock mode is labeled and does not actually tailor questions to JD; use Gemma for live tailoring.
3. **Devices:** click Start camera and Start microphone in the room, allowing browser/OS permission. Questions stay hidden and answers blocked until both detectors/devices are ready. Capability preflight is not a permission grant. Denial, stop or revocation blocks progression and retains drafts; users can always leave.
4. **Answer:** read or explicitly play the question. TTS pauses VAD analysis only, not the camera/mic streams. Optionally dictate with disclosed browser-vendor audio handling. Stop dictation, review/edit the transcript, then submit. Typed text is preserved when dictation starts; TTS and dictation do not run together. Web Speech manages its own capture because the browser API cannot portably consume C's stream; both owners clean up on stop/exit. Actual vendor speech behavior remains manual acceptance.
5. **Follow-up:** B evaluates only answer/JD/question history, validates an exact quotation and generates a changed-constraint follow-up. Monitoring never affects scores. API retries retain submission IDs. Network/model errors preserve drafts. Refresh restores only the active question's draft; completed sessions redirect to results.
6. **Results:** final submission stops devices and attempts bounded event delivery before completion. The report opens after server success and includes JD/level, original questions, answers, evidence, rubric scores, strengths/gaps and practice suggestions. Unsaved monitoring metadata stays separately exportable. Optional Gemma observation review is below technical results and requires separate metadata-transfer consent.

## Branch integration

- A: `origin/codex/interview-experience` at `7a92c69`
- B: `origin/codex/intelligence` at `ecc2e38`
- C: `origin/codex/monitoring-gemma-permissions` at `4a257a0`
- Combined: `codex/integration-interview-flow`; final target: `main`.

No teammate branch is deleted or rewritten. Merge commits retain all histories. Physical camera/microphone, OS permission indicators, real speech recognition/TTS acoustics, hosted Jarvis, PostgreSQL and Temporal execution are not established by unit/API tests. Memory sessions reset on restart. Permission gates are client UX, not tamper-proof server attestation.
