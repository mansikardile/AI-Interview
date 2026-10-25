# A/B/C integration plan

Start with C's pushed branch, merge B preserving its rubric/parser/prompts plus C's Ollama timeout/export, then merge A preserving its draft recovery, status UI, dictation and TTS. Resolve shared behavior, not merely merge markers.

Saved setup has two steps: required JD/role/level/count, then unchecked camera/audio consent. Session creation retains the JD. C gates question visibility and submission on device readiness. TTS uses `playbackActive`, not `active=false`, so capture continues. Dictation and TTS are mutually exclusive; dictation appends to existing typed text and must stop before transcript editing/submission.

Draft restoration occurs when adopting fetched authoritative session state, before question-scoped persistence. Accepted answers clear the old question's draft. Final submission flushes observations/stops devices and navigates only after successful completion. Report adds optional backwards-compatible `config` and `questions` so JD and Q/A mappings remain visible. Model review stays below technical results.

Verify unit/service/provider tests, merged local Gemma smoke, production build, multiround API smoke, browser setup/fixture interactions and physical-device limitations. Preserve each branch in history; push integration, merge it into up-to-date main without force, and verify all three remote branch tips are ancestors of main.
