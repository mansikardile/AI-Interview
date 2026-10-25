import type {
  Assessment,
  InterviewConfig,
  InterviewContext,
  Question,
  SubmitAnswerInput,
} from "@/contracts";

export interface InterviewIntelligence {
  readonly mode: "mock" | "live";
  initialQuestion(config: InterviewConfig): Promise<Question>;
  assessAnswer(context: InterviewContext, answer: SubmitAnswerInput): Promise<Assessment>;
}
