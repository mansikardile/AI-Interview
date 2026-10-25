# Gemma 4 through JarvisLabs

The app uses the [JarvisLabs hosted Model API](https://jarvislabs.ai/products/models), not its GPU-management SDK. The documented base URL is `https://models.jarvislabs.net/v1`; requests use Bearer authorization and `POST /chat/completions`. Checked October 25, 2026.

## Setup

### Local Ollama (no Jarvis key)

```dotenv
AI_PROVIDER=ollama
SESSION_STORE=memory
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_MODEL=gemma4:e2b-mlx
```

Use your installed Gemma 4 tag (`ollama list`); this machine already has the tag above. Start `ollama serve`, then `npm run dev` or `npm run test:ollama`. No model download is automatic. The smoke test uses synthetic content and actual inference. `.env.local` is gitignored; `.env.example` retains mock defaults for teammates.

The app uses Ollama's [native Chat API](https://docs.ollama.com/api/chat) with `stream:false`, `think:false`, task-specific JSON schemas and a 120-second timeout. Questions, assessments and monitoring reviews all request their actual output schema; monitoring IDs are constrained to supplied evidence. The response adapter reuses Jarvis validation/quote checks. Local HTTP is loopback-only, redirects are rejected, and cloud authorization is never forwarded. Do not expose Ollama publicly.

Both interview generation and monitoring reviews use Ollama when `AI_PROVIDER=ollama`. Reviews label the provider `ollama`, never `jarvislabs`. The browser does not call Ollama directly. Invalid JSON or invented IDs still fail explicitly.

### Hosted JarvisLabs

Create gitignored `.env.local` from `.env.example`, then set:

```dotenv
AI_PROVIDER=jarvis
JARVISLABS_API_KEY=your-private-model-api-key
JARVISLABS_BASE_URL=https://models.jarvislabs.net/v1
JARVISLABS_MODEL=exact-gemma-4-api-id-from-your-dashboard
```

The last value is a placeholder, not a runnable model ID. Jarvis lists Gemma 4 26B A4B IT and Gemma 4 31B publicly, but the public quickstart does not specify their exact API IDs. Copy your account's ID rather than assuming a display name or Hugging Face name works. Never use `NEXT_PUBLIC_` for credentials, commit keys, or paste them into chat. Restart Next.js after changes.

## Genuine model roles

- Team B: with `AI_PROVIDER=jarvis`, initial questions, technical feedback and changed-constraint follow-ups use Gemma 4. Mock mode stays explicitly labeled. Live errors do not switch to mock output.
- Team C: reports have a metadata-transfer checkbox and **Generate Gemma review** button. An owner-scoped API sends the latest 100 saved IDs/types/timestamps/durations and validates explanations against known IDs. No event detail strings, answers, frames or audio are sent. It uses Ollama in local mode; otherwise live Jarvis configuration is required even in a mock interview.

MediaPipe and Silero remain the real-time detectors. Gemma supplies uncertain alternative explanations and practice suggestions. Review text is AI output, not proof of cheating; it never changes technical scores. We do not assume the hosted endpoint accepts images or transcribes audio.

## Live acceptance

Local verification on October 25, 2026: `npm run test:ollama` passed actual question generation, exact-quote assessment and evidence-linked monitoring review with `gemma4:e2b-mlx`. The schema constrains event IDs to supplied values and the prompt provides an exact-ID template. Invalid output remains an explicit error; no mock fallback or silent evidence repair. Schema validity is not a factual-quality guarantee.

1. Run `npm run check` and `npm run build`, then start the app with the above environment.
2. Create an interview: the initial question must appear without a demo label.
3. Consent to focus monitoring; switch tabs and return. Finish the interview and check saved observations.
4. Opt into metadata transfer and generate the report review. Confirm `Live · jarvislabs`, the exact model and valid referenced event IDs. Technical scores must stay unchanged.
5. Invalid credentials/model, rate limits and malformed output must show errors, not substitute reviews. Each explicit repeat request incurs another token charge; there are no automatic paid retries or persisted review cache.

Provider contract tests use mocked HTTP. No account key was available during implementation, so credentials, exact model availability, response quality and billed inference remain unverified. Positive physical-device camera/microphone scenarios remain manual acceptance checks.
