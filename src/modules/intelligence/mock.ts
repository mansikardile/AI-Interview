import type { InterviewConfig, InterviewContext, SubmitAnswerInput } from "@/contracts";
import { assessmentSchema } from "@/contracts";
import type { InterviewIntelligence } from "./types";

const initialQuestions = {
  backend: [
    "How would you prevent duplicate payment processing when a client retries a request?",
    "API reliability",
  ],
  frontend: [
    "How would you prevent an older search response from overwriting newer search results in a React application?",
    "Asynchronous UI",
  ],
  sre: [
    "An application starts returning errors immediately after a deployment. How would you investigate and verify recovery?",
    "Incident response",
  ],
} as const;

export class MockIntelligence implements InterviewIntelligence {
  readonly mode = "mock" as const;

  async initialQuestion(config: InterviewConfig) {
    const [text, topic] = initialQuestions[config.role];
    return { id: crypto.randomUUID(), text, topic, kind: "initial" as const };
  }

  async assessAnswer(context: InterviewContext, answer: SubmitAnswerInput) {
    const quote = answer.text.slice(0, 160);
    const constraint = {
      backend:
        "The operation succeeds but the response times out, and two retries arrive together. What happens next?",
      frontend:
        "The user changes the query twice while requests are in flight. Which response may update state, and why?",
      sre: "A restart briefly restores health but errors return. Which evidence would you collect before the next change?",
    }[context.config.role];

    return assessmentSchema.parse({
      feedback: {
        scores: { correctness: 3, reasoning: 3, clarity: 3 },
        evidenceQuote: quote,
        strengths: [
          "Your response is captured for review. This is fixture feedback, not a model evaluation.",
        ],
        gaps: ["Practice explaining one failure case and a concrete verification step."],
        nextPractice:
          "Explain the sequence of events, one tradeoff, and how you would test the result.",
      },
      nextQuestion: {
        id: crypto.randomUUID(),
        text: `You said: “${quote}”. ${constraint}`,
        topic: "Reasoning under a changed constraint",
        kind: "follow_up",
      },
    });
  }
}
