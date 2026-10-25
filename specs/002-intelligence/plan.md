# Implementation plan: owner B

Local tests may select `AI_PROVIDER=ollama` with explicit `OLLAMA_MODEL`. A loopback-only transport adapts the same validated intelligence interface to Ollama native Chat API JSON/no-thinking inference. No cloud keys are sent locally. Timeout is 120 seconds for local loading/inference. Monitoring review selects the same provider and requests its JSON schema. Hosted Jarvis remains separately configured.

`src/modules/intelligence` contains the provider interface, mock provider, JarvisLabs text adapter and prompt construction. Export through `index.ts`. Other modules call only the interface, so improved prompts/model choices do not require frontend changes.

Use standard fetch against `${JARVISLABS_BASE_URL}/chat/completions`; the default base URL is `https://models.jarvislabs.net/v1`. Model ID is explicit in env and must match the user's account. The default suggested value is `gemma-4-26b-a4b-it`; verify its exact served identifier before a live demo.

Use a trusted system prompt, and JSON-serialize session config/history/answer into a separate user data envelope. Parse plain JSON or a single fenced JSON object, then validate with shared schemas. Verify quote grounding. Persist only validated output. Do not send monitoring events to the provider. Keep fake heuristics visibly labeled mock; never advertise them as a real ability score.

Limit transcript/history size, network timeout and provider output size. Treat failures as retryable domain errors, not opportunities to fabricate output. Add request mocks for invalid JSON, timeout, missing evidence and malicious instructions.

For vision, first confirm hosted image input and add a reviewed wire schema/data handling path. Do not assume the 26B/31B text endpoint transcribes audio. Separate transcription is A/C's integration.
