# Local setup and external integrations

All commands run from repository root. Node.js 24/npm are required. Copy `.env.example` to `.env.local`; no secrets belong in `NEXT_PUBLIC_*` variables.

## Default independent development

`AI_PROVIDER=mock`, `SESSION_STORE=memory`, then `npm run dev`. No infrastructure is required. Run `npm run check`; with the app running run `npm run test:smoke`. Use `SMOKE_BASE_URL` for a different port.

Environment is read on process startup. Restart Next.js after changing providers/storage. Existing sessions cannot switch between mock and live mode midway.

## JarvisLabs / Gemma: owner B

Use an existing authorized JarvisLabs API key in `.env.local`:

```dotenv
AI_PROVIDER=jarvis
JARVISLABS_API_KEY=your-server-side-key
JARVISLABS_BASE_URL=https://models.jarvislabs.net/v1
JARVISLABS_MODEL=gemma-4-26b-a4b-it
```

Verify the exact model ID against your account; the example is configurable, not a promise about account availability. The adapter uses the documented OpenAI-compatible Chat Completions shape with standard fetch, server-side only. It sends config and text answers, not camera frames or monitoring events. Live mode does not silently fall back to mock.

The foundation has schema validation, quote grounding, a 25-second timeout, output limits, and explicit provider errors. Live model quality/availability/latency still requires B06. Hosted image support must be verified before diagrams; audio transcription is a separate unimplemented integration.

Sources: [JarvisLabs Model APIs](https://jarvislabs.ai/products/models), [Gemma model capabilities](https://ai.google.dev/gemma/docs/core/model_card_4). Verify the actual hackathon's Gemma/API eligibility rules before submitting; using Gemma through one host does not itself prove prize eligibility.

## PostgreSQL: owner D

Requires Docker Compose (or an existing PostgreSQL database). The bundled service is local-only and uses development credentials.

```bash
docker compose -f infra/compose.yaml up -d
npm run db:migrate
```

The example `DATABASE_URL` points to `localhost:5432`. Change the port in Compose and the URL together if occupied. Then set `SESSION_STORE=postgres` and restart Next.js. Migration creates `interview_sessions` with an owner index and JSONB state; it is safe to rerun. Run the HTTP smoke test and manually reload a session after restarting Next.js.

`docker compose -f infra/compose.yaml down` stops the service while preserving its named volume. Do not add `--volumes` unless intentionally deleting the local database. No database was provisioned in an external account by this scaffold.

## Temporal: owner D

Install the Temporal CLI using the [official instructions](https://docs.temporal.io/cli/setup-cli). Start a development server in one terminal:

```bash
mkdir -p .local
temporal server start-dev --db-filename .local/temporal.db
```

In a second terminal run `npm run worker:dev`. In a third run `npm run temporal:smoke`. The gRPC port defaults to 7233; the UI is [localhost:8233](http://localhost:8233). The env address/namespace/task queue must match between worker and client.

This smoke example executes a bounded, idempotent activity and proves connectivity only. Interview API routes currently progress through the platform service without Temporal. D06 adds durable lifecycle orchestration, timeout/resume behavior and crash tests. Keep provider calls/database writes in Activities; deterministic Workflow code must not call fetch, access process env, or touch devices.

Source: [Temporal TypeScript setup](https://docs.temporal.io/develop/typescript/set-up-your-local-typescript), [persistent CLI development store](https://docs.temporal.io/cli/command-reference/server).

## MediaPipe / audio: owner C with A

Local MediaPipe face detection and Silero VAD are implemented. `npm ci` prepares pinned, checksum-verified model/runtime assets under the app's own origin; no CDN is contacted during capture. Localhost/HTTPS, source-specific consent, an explicit start action and browser permission are required. See `specs/003-monitoring/ASSETS.md` for versions, hashes and license notices.

`/monitoring` runs model diagnostics on generated inputs without physical devices. Camera/audio are off until started. VAD is speech activity only; transcription and question playback are still A's separate work. Use the stream-sharing and playback-suppression hooks in `docs/TEAM-C-HANDOFF.md`.

## Nudgebee: optional owner D stretch

`src/modules/platform/integrations/nudgebee.ts` contains a server-only optional health probe. Set `NUDGEBEE_BASE_URL` only if you already have a separately configured service. There is no public proxy endpoint and no arbitrary URL input from candidates.

The probe checks liveness, not tenant authorization or workflow execution. A real SRE interview lab needs verified upstream endpoints/auth, an isolated demo environment and a supported incident task. Do not expose the upstream runbook service directly or assume its dry-run mode isolates side effects.

Source: [Nudgebee runbook-server](https://github.com/nudgebee/nudgebee/blob/main/runbook-server/README.md).
