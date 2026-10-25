import {
  assessmentSchema,
  createSessionSchema,
  monitoringBatchSchema,
  questionSchema,
  reportSchema,
  sessionSchema,
  submitAnswerSchema,
  type InterviewConfig,
  type InterviewReport,
  type InterviewSession,
  type MonitoringEvent,
  type MonitoringConsent,
  type SubmitAnswerInput,
} from "@/contracts";
import { DomainError } from "@/lib/domain-error";
import type { InterviewIntelligence } from "@/modules/intelligence";
import type { SessionRepository } from "./repository";

export class SessionService {
  constructor(
    private readonly repository: SessionRepository,
    private readonly intelligence: InterviewIntelligence,
  ) {}

  async create(ownerHash: string, input: InterviewConfig): Promise<InterviewSession> {
    const config = createSessionSchema.parse(input);
    const question = questionSchema.parse(await this.intelligence.initialQuestion(config));
    const session = sessionSchema.parse({
      contractVersion: 1,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      completedAt: null,
      revision: 0,
      status: "in_progress",
      mode: this.intelligence.mode,
      storage: this.repository.storage,
      config,
      questions: [question],
      activeQuestionId: question.id,
      answers: [],
      events: [],
    });
    await this.repository.create(session, ownerHash);
    return session;
  }

  async get(ownerHash: string, id: string): Promise<InterviewSession> {
    const session = await this.repository.getOwned(id, ownerHash);
    if (!session)
      throw new DomainError(
        "NOT_FOUND",
        "This interview was not found in this browser. Memory sessions also disappear when the server restarts.",
        404,
      );
    return session;
  }

  async updateMonitoringConsent(ownerHash: string, id: string, monitoring: MonitoringConsent) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const session = await this.get(ownerHash, id);
      if (session.status !== "in_progress")
        throw new DomainError("SESSION_COMPLETED", "This interview has ended.", 409);
      const next = sessionSchema.parse({
        ...session,
        revision: session.revision + 1,
        config: { ...session.config, monitoring },
      });
      if (await this.repository.compareAndSwap(next, ownerHash, session.revision)) return next;
    }
    throw new DomainError(
      "WRITE_CONFLICT",
      "Consent changed while saving. Please retry.",
      409,
      true,
    );
  }

  async answer(ownerHash: string, id: string, input: SubmitAnswerInput): Promise<InterviewSession> {
    const answer = submitAnswerSchema.parse(input);
    const session = await this.get(ownerHash, id);
    const existing = session.answers.find((item) => item.submissionId === answer.submissionId);
    if (existing) {
      if (existing.text !== answer.text || existing.questionId !== answer.questionId) {
        throw new DomainError(
          "IDEMPOTENCY_CONFLICT",
          "This submission ID was already used with a different answer.",
          409,
        );
      }
      return session;
    }
    if (session.status !== "in_progress" || session.activeQuestionId !== answer.questionId) {
      throw new DomainError(
        "STALE_QUESTION",
        "This question is no longer active. Reload the interview before answering.",
        409,
      );
    }
    if (session.mode !== this.intelligence.mode) {
      throw new DomainError(
        "PROVIDER_CHANGED",
        "The model mode changed. Restore the original mode or start another interview.",
        409,
      );
    }
    const context = {
      config: session.config,
      questions: session.questions,
      answers: session.answers,
    };
    const assessment = assessmentSchema.parse(
      await this.intelligence.assessAnswer(context, answer),
    );
    if (!answer.text.includes(assessment.feedback.evidenceQuote)) {
      throw new DomainError(
        "INVALID_MODEL_OUTPUT",
        "Feedback must quote your answer accurately. Please retry.",
        502,
        true,
      );
    }
    const now = new Date().toISOString();
    const answers = [
      ...session.answers,
      { ...answer, submittedAt: now, mode: session.mode, feedback: assessment.feedback },
    ];
    const completed = answers.length >= session.config.questionCount;
    // A monitoring write may race inference. Reload, preserve observations, and retry CAS without repeating the model call.
    for (let attempt = 0; attempt < 5; attempt++) {
      const current = await this.get(ownerHash, id);
      const duplicate = current.answers.find((item) => item.submissionId === answer.submissionId);
      if (duplicate) {
        if (duplicate.text !== answer.text || duplicate.questionId !== answer.questionId)
          throw new DomainError(
            "IDEMPOTENCY_CONFLICT",
            "Submission ID already used with different content.",
            409,
          );
        return current;
      }
      if (
        current.activeQuestionId !== answer.questionId ||
        current.answers.length !== session.answers.length
      ) {
        throw new DomainError(
          "STALE_QUESTION",
          "Another answer was accepted. Reload the interview.",
          409,
        );
      }
      const next = sessionSchema.parse({
        ...current,
        revision: current.revision + 1,
        answers,
        questions: completed ? current.questions : [...current.questions, assessment.nextQuestion],
        activeQuestionId: completed ? null : assessment.nextQuestion.id,
        status: completed ? "completed" : "in_progress",
        completedAt: completed ? now : null,
      });
      if (await this.repository.compareAndSwap(next, ownerHash, current.revision)) return next;
    }
    throw new DomainError(
      "WRITE_CONFLICT",
      "The interview changed while saving. Please retry.",
      409,
      true,
    );
  }

  async addEvents(ownerHash: string, id: string, input: MonitoringEvent[]) {
    const { events } = monitoringBatchSchema.parse({ events: input });
    for (let attempt = 0; attempt < 5; attempt++) {
      const session = await this.get(ownerHash, id);
      if (events.some((event) => !session.config.monitoring[event.source])) {
        throw new DomainError(
          "CONSENT_REQUIRED",
          "This observation source was not enabled for this interview.",
          403,
        );
      }
      const ids = new Set(session.events.map((event) => event.id));
      const additions = events.filter((event) => {
        if (ids.has(event.id)) return false;
        ids.add(event.id);
        return true;
      });
      if (!additions.length) return session;
      if (session.status !== "in_progress")
        throw new DomainError("SESSION_COMPLETED", "This interview has ended.", 409);
      if (session.events.length + additions.length > 1000)
        throw new DomainError("EVENT_LIMIT", "Observation limit reached for this interview.", 409);
      const next = {
        ...session,
        events: [...session.events, ...additions],
        revision: session.revision + 1,
      };
      if (await this.repository.compareAndSwap(next, ownerHash, session.revision)) return next;
    }
    throw new DomainError(
      "WRITE_CONFLICT",
      "Could not save observations. Please retry.",
      409,
      true,
    );
  }

  async report(ownerHash: string, id: string): Promise<InterviewReport> {
    const session = await this.get(ownerHash, id);
    if (session.status !== "completed" || !session.completedAt)
      throw new DomainError("REPORT_NOT_READY", "Complete the interview to open its report.", 409);
    const average = (key: "correctness" | "reasoning" | "clarity") =>
      Math.round(
        (session.answers.reduce((sum, answer) => sum + answer.feedback.scores[key], 0) /
          session.answers.length) *
          100,
      ) / 100;
    return reportSchema.parse({
      sessionId: id,
      role: session.config.role,
      config: session.config,
      questions: session.questions,
      mode: session.mode,
      completedAt: session.completedAt,
      averageScores: {
        correctness: average("correctness"),
        reasoning: average("reasoning"),
        clarity: average("clarity"),
      },
      answers: session.answers,
      observations: {
        count: session.events.length,
        events: session.events,
        notice:
          "Session observations are not proof of assistance and do not affect technical feedback.",
      },
      practicePlan: [...new Set(session.answers.map((answer) => answer.feedback.nextPractice))],
    });
  }
}
