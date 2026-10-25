# Spec-driven development for four teammates

## What we adopted

GitHub Spec Kit describes an intent-first flow: specify behavior, plan implementation, divide tasks, implement, and compare the result against the specification. It also recommends agreeing on contracts before implementing consumers independently.

This repository uses that method with maintained Markdown specs and executable Zod contracts. **The Spec Kit CLI and its slash commands are not installed.** Nothing here requires a particular coding agent, global CLI, or paid account.

Sources reviewed on 2026-10-25:

- [Spec-driven development](https://github.github.io/spec-kit/concepts/sdd.html)
- [Spec Kit workflow](https://github.com/github/spec-kit)
- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Temporal TypeScript setup](https://docs.temporal.io/develop/typescript/set-up-your-local-typescript)

## The daily loop

1. Read `.specify/memory/constitution.md` and your `specs/00N-*/spec.md`.
2. Pick one unchecked task. Read its acceptance scenarios and dependent contract.
3. If behavior is ambiguous, write the proposed decision into the spec/plan. For a shared-contract change, get an affected teammate's review before merging.
4. Implement only that slice behind the existing public module interface. Use fixtures for unavailable modules/providers.
5. Add meaningful verification for the behavior, run `npm run check`, and manually walk the acceptance scenario.
6. Compare code, spec, plan, and tasks. Record deviations explicitly; do not rewrite requirements merely to make a failing implementation appear complete.
7. Update task checkboxes and open a small PR with requirement IDs, evidence, and any limitation.

## Document responsibilities

| Artifact               | Answers                                           | Example                                   |
| ---------------------- | ------------------------------------------------- | ----------------------------------------- |
| Constitution           | What principles must every feature respect?       | Monitoring cannot lower technical scores  |
| `spec.md`              | What does a user observe?                         | A duplicate submission creates one answer |
| `plan.md`              | How will it work?                                 | Store answer IDs and use compare-and-swap |
| `tasks.md`             | What is the next independently reviewable change? | Wire speech capture to answer input       |
| `src/contracts`        | What exactly crosses boundaries?                  | `SubmitAnswerInput` schema                |
| Tests / demo checklist | Does the implementation match the agreement?      | Retry and isolation tests                 |

## Adding a feature

Copy `specs/templates/feature.md` into a new numbered directory and add `plan.md` / `tasks.md`. Include requirement IDs, Given/When/Then scenarios, error paths, data handling, non-goals, dependencies, and how the result will be verified.

## Task notation

`[x]` means implemented and verified in this scaffold. `[ ]` means work remains. `[P]` means parallelizable after the shared contract is accepted. `STRETCH` is outside the initial integrated demo.

## Contract changes

Wire format version starts at `1`. Additive optional fields are generally compatible. Renaming fields, changing enums, or changing status semantics requires coordinated consumers and fixtures. Owner D maintains `docs/CONTRACTS.md`; all affected owners review a breaking change. Keep `contracts`, fixtures, specs, and tests in the same PR.
