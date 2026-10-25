# InterviewIQ

An open-source mock interview starter for a four-person hackathon team. The interviewer asks follow-ups about your answer and produces feedback with quoted evidence. Optional session observations stay separate from technical feedback.

## Start here

```bash
nvm install
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000). On Windows, use Node.js 24 and `Copy-Item .env.example .env.local` instead of `cp`.

Default startup needs **no account, API key, Docker, camera, or microphone**. It uses mock intelligence and temporary memory storage. Complete a typed interview and open its report. `/interview/demo` is a fixture-only room for independent UI/media development.

## Divide the work

| Person | Responsibility                                                 | Start with                                                         |
| ------ | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| A      | Interview UI, setup, voice interaction, transcript editing     | [001 interview experience](specs/001-interview-experience/spec.md) |
| B      | Gemma interviewer, adaptive questions, evidence-based feedback | [002 intelligence](specs/002-intelligence/spec.md)                 |
| C      | Camera, VAD/audio, focus monitoring and device lifecycle       | [003 monitoring](specs/003-monitoring/spec.md)                     |
| D      | Session API, storage, reports, Temporal, optional Nudgebee     | [004 platform](specs/004-platform/spec.md)                         |

Each feature directory contains a spec, implementation plan and checkable tasks. Read [team ownership and first assignments](docs/TEAM.md) before branching. Shared contracts are already defined in `src/contracts/index.ts`; teammates use mocks/fixtures and do not have to wait for other integrations.

## Documentation map

- [Team ownership, paths, branches and checkpoints](docs/TEAM.md)
- [Spec-driven development workflow](docs/SDD.md)
- [Project principles](.specify/memory/constitution.md)
- [Architecture and lifecycle](docs/ARCHITECTURE.md)
- [API and module contracts](docs/CONTRACTS.md)
- [External services, database and worker setup](docs/INTEGRATIONS.md)
- [Data handling and public-release work](docs/SECURITY.md)
- [Demo and verification script](docs/DEMO.md)
- [Implementation status and deferred work](docs/STATUS.md)

## Commands

| Command                  | Purpose                                                                       |
| ------------------------ | ----------------------------------------------------------------------------- |
| `npm run dev`            | Next.js development server                                                    |
| `npm run check`          | ESLint, generated route types, TypeScript, contract/service/provider tests    |
| `npm run test:ai`        | Owner B's provider/prompt-boundary tests                                      |
| `npm run test:watch`     | Watch unit tests                                                              |
| `npm run build`          | Production build                                                              |
| `npm run test:smoke`     | HTTP journey against a running app; `SMOKE_BASE_URL` overrides localhost:3000 |
| `npm run format`         | Format sources and docs                                                       |
| `npm run db:migrate`     | Optional PostgreSQL schema initialization                                     |
| `npm run worker:dev`     | Separate optional Temporal worker                                             |
| `npm run temporal:smoke` | Execute the Temporal connectivity example                                     |

## Current scope

Working baseline: setup, typed answers, mock follow-ups, quoted feedback, report, optional page-visibility timeline, browser-scoped API, and retry-safe storage mutations. There is also an opt-in JarvisLabs text adapter, a PostgreSQL repository, a Temporal connectivity example, and a Nudgebee health client.

Camera detection, audio VAD, transcription, spoken questions, whiteboard analysis, full Temporal session orchestration, authentication/retention and incident labs remain owner-assigned work. Installing a dependency or including an adapter does not mean its live service was tested.

The mock model uses fixed placeholder scores. Memory mode resets on restart and cannot serve a multi-instance deployment. This is a local/team scaffold, not a production hiring or anti-cheating system.

## Stack and attribution

Generated from the official Next.js starter: Next.js App Router, React, TypeScript, Tailwind CSS and ESLint. Shared validation uses Zod; development includes Vitest and Prettier. Optional integrations use PostgreSQL, the Temporal TypeScript SDK and MediaPipe.

The workflow draws on [GitHub Spec Kit](https://github.com/github/spec-kit), without installing its CLI. [Nudgebee](https://github.com/nudgebee/nudgebee), [Temporal](https://github.com/temporalio/temporal), [JarvisLabs](https://jarvislabs.ai/products/models), and [Gemma](https://ai.google.dev/gemma/docs) remain separately operated upstream projects/services. No Nudgebee source or model weights are vendored. Choose a project license with the team before publishing; none is silently imposed here.
