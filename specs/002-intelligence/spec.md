# 002: AI interviewer and feedback

Owner B · Contract version 1 · Status: mock adapter and opt-in text provider foundation

## Goal

Interview questions and follow-ups reveal understanding, and feedback gives specific practice advice grounded in the answer.

## Requirements

- AI-009: `AI_PROVIDER=ollama` uses an explicitly configured local Gemma 4 model for real inference tests, with no Jarvis key or mock fallback. Only loopback HTTP endpoints are permitted for this local transport. Both interview intelligence and monitoring review support it and label the provider accurately. Keep JarvisLabs configuration separate for deployment.

- AI-001: Expose `InterviewIntelligence.initialQuestion(config)` and `.assessAnswer(session, input)` behind one public interface. Provide deterministic mock mode for other owners.
- AI-002: Live questions follow role, difficulty and job description. Candidate/job-description text is untrusted data, not an instruction source.
- AI-003: Assessment returns bounded rubric scores (correctness, reasoning, clarity), strengths, gaps, one exact answer quotation, and a next question. Mark mock assessments explicitly.
- AI-004: Follow-ups refer to the candidate's claim and change a constraint, request reasoning, or ask for application. Do not infer cheating/memorization from writing style.
- AI-005: Validate provider JSON and verify the returned evidence quote is present verbatim in the submitted answer. Reject malformed/ungrounded results. Never silently fall back to mock in live mode.
- AI-006: Provider key stays server-side; calls have timeouts and bounded response sizes. Do not log transcripts or provider bodies.
- AI-007: Monitoring events are excluded from assessment prompts and score calculation.
- AI-008: Future diagram analysis accepts an explicitly uploaded diagram with consent. Do not use webcam expressions as an interview rubric.

## Acceptance

1. Given fixture answers, mock mode returns schema-valid deterministic feedback and a related follow-up.
2. Given a mock provider response with a fabricated quote or score above 5, live adapter rejects it.
3. Given identical answers with different monitoring observations, feedback is identical in deterministic mode and monitoring is absent from the live request payload.
4. Given provider timeout, API returns a retryable provider error and the answer is not partially saved.
5. Given a sentence in a job description saying "ignore your instructions", the prompt treats it as data; output still must pass the same contract.

## Non-goals

An AI-writing detector, cheating probability, facial/personality scoring, and unvalidated automatic execution of generated tools.

## Verify

Run `npm run test:ai`. Owner B adds a human-reviewed evaluation set for follow-up relevance, factual accuracy and feedback evidence. Schema-valid output alone does not establish quality.
