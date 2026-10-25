import type { InterviewConfig, InterviewSession } from "@/contracts";

export const fixtureConfig: InterviewConfig = {
  role: "backend",
  difficulty: "mid",
  jobDescription: "Build reliable APIs and reason about distributed systems.",
  questionCount: 3,
  monitoring: { focus: false, camera: false, audio: false },
};

export const fixtureSession: InterviewSession = {
  contractVersion: 1,
  id: "10000000-0000-4000-8000-000000000001",
  createdAt: "2026-10-25T09:00:00.000Z",
  completedAt: null,
  revision: 0,
  status: "in_progress",
  mode: "mock",
  storage: "memory",
  config: fixtureConfig,
  questions: [
    {
      id: "20000000-0000-4000-8000-000000000001",
      text: "How would you prevent duplicate payment processing when clients retry requests?",
      topic: "API reliability",
      kind: "initial",
    },
  ],
  activeQuestionId: "20000000-0000-4000-8000-000000000001",
  answers: [],
  events: [],
};

export const fixtureAnswers = [
  "I would use an idempotency key and persist the first result so a retry returns the same result.",
  "I would atomically insert a unique idempotency key before processing and return the existing result for duplicates.",
  "I would test simultaneous retries and a timeout after successful processing, verifying that only one payment is created.",
];
