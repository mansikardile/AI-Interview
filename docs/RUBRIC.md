# InterviewIQ Technical Rubric & Evaluation Guide

Version: 1.0 · Owner B (Intelligence) · Requirement: AI-003, AI-004, B07

This document establishes the official scoring criteria, rubric anchors, and feedback guidelines for the InterviewIQ intelligence module.

---

## 1. Core Principles

1. **Evidence Grounding**: Every evaluation must include an `evidenceQuote` containing an exact, verbatim substring from the candidate's answer. Evaluations without verifiable quote grounding are rejected.
2. **Objective Technical Standards**: Feedback evaluates technical accuracy, design justification, and trade-off depth. It never evaluates emotion, sentiment, personality, or perceived honesty.
3. **Actionable Growth**: Feedback must provide concrete, specific strengths, identified gaps, and an explicit `nextPractice` exercise to help the candidate improve.
4. **Changing-Constraint Follow-Ups**: Follow-up questions must acknowledge the candidate's stated mechanism and introduce a realistic operational constraint change (concurrency, timeout, partition, scale, memory limit, or degradation).

---

## 2. Dimension Scoring Anchors (0–5 Scale)

### 2.1 Correctness
*Measures factual accuracy, mechanism soundness, and failure-mode handling.*

| Score | Anchor | Description | Example (Backend - Idempotency) |
|---|---|---|---|
| **0** | Dangerous / Wrong | Actively harmful antipattern or completely irrelevant. | "Store the processed status in an in-memory variable in the server process." |
| **1** | Major Misconception | Misunderstands core platform primitives or fundamental mechanisms. | "Payment gateways automatically prevent duplicates if you just resend the HTTP request." |
| **2** | Partially Correct | Works for happy path, but misses obvious failure modes. | "Generate a UUID and check if it exists in the database before running payment, without a lock or transaction." |
| **3** | Solid Foundation | Correct and reliable for standard scenarios and common errors. | "Use a unique idempotency key in a database transaction with a unique index to reject duplicate inserts." |
| **4** | Robust & Comprehensive | Handles concurrency, retry storms, and edge cases. | "Insert an idempotency record in state `IN_PROGRESS` with a unique constraint; on duplicate key, wait or return existing record." |
| **5** | Production-Grade Nuance | Deeply accounts for distributed failure modes and race conditions. | "Atomic insert with two-phase state machine (`PENDING`, `COMPLETED`, `FAILED`), payload hash verification, and TTL on locks." |

### 2.2 Reasoning
*Measures logical deduction, design justification, and trade-off analysis.*

| Score | Anchor | Description | Example (Frontend - Race Conditions) |
|---|---|---|---|
| **0** | No Justification | Bare assertion without rationale. | "Use a library." |
| **1** | Superficial Buzzwords | Drops terms without explaining mechanics or trade-offs. | "It's faster and more modern." |
| **2** | Basic 'Why' | Explains why on the surface, but doesn't compare alternatives. | "We cancel requests because old responses overwrite new ones." |
| **3** | Structured Rationale | Explains trade-offs and rationale for chosen mechanism. | "Using `AbortController` over timestamp tagging because it saves network bandwidth and cleans up socket handles." |
| **4** | Comparative Analysis | Evaluates multiple approaches against concrete constraints. | "Compares `AbortController` (drops inflight, client savings) vs sequence ID/token (server still completes work, handles out-of-order)." |
| **5** | Systems Thinking | Evaluates blast radius, UI latency perception, and edge cases. | "Analyzes debounce window vs user keystroke cadence, request coalescing, cache invalidation, and memory leak cleanup on unmount." |

### 2.3 Clarity
*Measures structure, terminology, precision, and signal-to-noise ratio.*

| Score | Anchor | Description |
|---|---|---|
| **0** | Incoherent | Contradictory, unreadable, or incomprehensible. |
| **1** | Disorganized | Muddled terminology, confusing sequence of steps. |
| **2** | Understandable | Main point gets across, but verbose, repetitive, or hand-wavy. |
| **3** | Professional | Clear explanation with standard industry terminology and logical flow. |
| **4** | Crisp & Dense | High signal-to-noise ratio; structured cleanly (problem, solution, edge cases). |
| **5** | Exemplary | Masterful architectural articulation that can guide an engineering team immediately. |

---

## 3. Follow-Up Generation Guidelines

A high-quality follow-up question must:
1. **Acknowledge the candidate's claim**: Quote or paraphrase their specific proposed approach.
2. **Introduce a concrete constraint change**:
   - **Backend**: Concurrent retries hitting separate replicas, database connection pool exhaustion, partial downstream payment capture timeout, network split-brain.
   - **Frontend**: Fast subsequent typing triggering out-of-order resolution, rapid unmounting during fetch, slow 3G connection with stale cache.
   - **SRE**: Rollback failing due to database schema migration incompatibility, cascading health check failures, metric pipeline delay during incident.
3. **Ask for actionable adaptation**: Prompt the candidate to walk through how their system handles the new constraint.

---

## 4. Prompt Safety & Untrusted Data Envelopes

- Candidate inputs (answers, job descriptions, resume text) are strictly **untrusted data**.
- They are sent within a serialized JSON data envelope, never as system instructions.
- Any attempt to override prompts (`"Ignore previous instructions"`, `"System reset"`) is treated as literal candidate answer text, resulting in a low correctness score and zero instruction leakage.
