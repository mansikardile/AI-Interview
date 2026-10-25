import type {
  InterviewConfig,
  InterviewContext,
  Question,
  SubmitAnswerInput,
} from "@/contracts";
import { assessmentSchema } from "@/contracts";
import type { InterviewIntelligence } from "./types";

interface RoleQuestions {
  junior: [string, string];
  mid: [string, string];
  senior: [string, string];
}

const INITIAL_QUESTIONS: Record<"backend" | "frontend" | "sre", RoleQuestions> = {
  backend: {
    junior: [
      "How would you design error handling and HTTP status code responses for a RESTful user registration API?",
      "API error handling & validation",
    ],
    mid: [
      "How would you prevent duplicate payment processing when a client retries a request?",
      "API reliability & idempotency",
    ],
    senior: [
      "How would you architect an event-driven payment processing system that maintains data consistency across distributed services without distributed transactions?",
      "Distributed systems consistency",
    ],
  },
  frontend: {
    junior: [
      "How would you manage loading, error, and empty states when fetching a list of items from an API in a React component?",
      "Component state management",
    ],
    mid: [
      "How would you prevent an older search response from overwriting newer search results in a React application?",
      "Asynchronous UI & race conditions",
    ],
    senior: [
      "How would you implement an optimistic UI update for a collaborative kanban board with conflict resolution and offline rollback?",
      "Optimistic UI & state synchronization",
    ],
  },
  sre: {
    junior: [
      "A service is reporting intermittent 502 errors. How would you systematically check system metrics, logs, and processes to identify the root cause?",
      "Linux troubleshooting & diagnostics",
    ],
    mid: [
      "An application starts returning errors immediately after a deployment. How would you investigate and verify recovery?",
      "Incident response & canary deployments",
    ],
    senior: [
      "During a major regional cloud outage, several dependent microservices are failing. How would you orchestrate graceful degradation, traffic shedding, and failover?",
      "Resilience & disaster recovery",
    ],
  },
};

interface ConstraintProgression {
  turn1: { question: string; topic: string };
  turn2: { question: string; topic: string };
  default: { question: string; topic: string };
}

const CONSTRAINT_PROGRESSIONS: Record<"backend" | "frontend" | "sre", ConstraintProgression> = {
  backend: {
    turn1: {
      question:
        "The operation succeeds in the payment gateway, but the network response to your service times out, and two simultaneous retries arrive. What happens next, and how do you reconcile status?",
      topic: "Concurrent retries under network timeout",
    },
    turn2: {
      question:
        "The database storing your idempotency records experiences a replication lag spike, directing duplicate read requests to a replica before write replication completes. How does your architecture handle this race condition?",
      topic: "Replication lag & distributed state consistency",
    },
    default: {
      question:
        "How would you design a load test and chaos engineering scenario to verify this mechanism under partial database partition?",
      topic: "Verification & chaos testing",
    },
  },
  frontend: {
    turn1: {
      question:
        "The user changes the query twice while previous requests are in flight. Which response may update state, and how do you ensure canceled requests do not leak memory or throw uncaught errors?",
      topic: "Race conditions & memory cleanup",
    },
    turn2: {
      question:
        "Under poor cellular network conditions (variable latency and packet loss), the browser receives responses in reverse order while the user navigates away from the page. How do you handle component lifecycle unmounting and cache freshness?",
      topic: "Lifecycle unmounting & cache freshness",
    },
    default: {
      question:
        "How would you measure and monitor the user-perceived latency (CLS, INP) of this search interaction in production?",
      topic: "Frontend performance & real-user monitoring",
    },
  },
  sre: {
    turn1: {
      question:
        "A restart briefly restores service health, but errors return within 90 seconds and begin cascading to upstream dependencies. Which telemetry would you collect before executing the next action?",
      topic: "Cascading failure analysis & triage",
    },
    turn2: {
      question:
        "You initiate an automated rollback, but the latest deployment included a database schema migration that removed a column the previous release depended on. What is your containment plan?",
      topic: "Backward-incompatible migration rollback",
    },
    default: {
      question:
        "What specific SLOs, error budgets, and architectural circuit breakers would you introduce to prevent this outage pattern from recurring?",
      topic: "SLOs & systemic remediation",
    },
  },
};

/**
 * Extracts a clean, verbatim quotation from the candidate's answer text.
 * Finds the first coherent sentence or phrase.
 */
function extractEvidenceQuote(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "no answer provided";

  // Try to find the first complete sentence
  const sentenceMatch = trimmed.match(/^([^.?!]{15,200}[.?!])/);
  if (sentenceMatch?.[1]) {
    return sentenceMatch[1].trim();
  }

  // Fallback to taking up to 160 characters without splitting a word if possible
  if (trimmed.length <= 160) {
    return trimmed;
  }
  const slice = trimmed.slice(0, 160);
  const lastSpace = slice.lastIndexOf(" ");
  return lastSpace > 40 ? slice.slice(0, lastSpace) : slice;
}

export class MockIntelligence implements InterviewIntelligence {
  readonly mode = "mock" as const;

  async initialQuestion(config: InterviewConfig): Promise<Question> {
    const roleConfig = INITIAL_QUESTIONS[config.role];
    const [text, topic] = roleConfig[config.difficulty];
    return {
      id: crypto.randomUUID(),
      text,
      topic,
      kind: "initial",
    };
  }

  async assessAnswer(context: InterviewContext, answer: SubmitAnswerInput) {
    const quote = extractEvidenceQuote(answer.text);
    const role = context.config.role;
    const progression = CONSTRAINT_PROGRESSIONS[role];

    // Determine follow-up based on question sequence (turn 1 vs turn 2 vs later)
    const turnIndex = context.questions.length;
    const constraintStep =
      turnIndex <= 1 ? progression.turn1 : turnIndex === 2 ? progression.turn2 : progression.default;

    const followUpText = `You said: “${quote}”. ${constraintStep.question}`;

    const rolePracticeSuggestions = {
      backend:
        "Practice diagramming the sequence of events across client, API gateway, distributed cache, and database during concurrent retries.",
      frontend:
        "Practice implementing cleanup routines with AbortController and debounced state machines under artificial network throttling.",
      sre:
        "Practice writing structured incident response runbooks that isolate telemetry metrics (p99 latency, saturation, error rate) before restarting services.",
    }[role];

    return assessmentSchema.parse({
      feedback: {
        scores: { correctness: 3, reasoning: 3, clarity: 3 },
        evidenceQuote: quote,
        strengths: [
          "Your response directly addresses the question and is captured for review. (Mock feedback mode)",
          `Specific point noted: "${quote.slice(0, 80)}${quote.length > 80 ? "..." : ""}"`,
        ],
        gaps: [
          "Mock evaluation placeholder: Practice explaining edge cases, trade-offs, and verification steps in production.",
        ],
        nextPractice: rolePracticeSuggestions,
      },
      nextQuestion: {
        id: crypto.randomUUID(),
        text: followUpText,
        topic: constraintStep.topic,
        kind: "follow_up",
      },
    });
  }
}
