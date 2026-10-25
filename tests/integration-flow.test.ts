import { describe, expect, it, vi } from "vitest";
import { MockIntelligence } from "@/modules/intelligence";
import { SessionService } from "@/modules/platform/session-service";
import { MemorySessionRepository } from "@/modules/platform/repository";
import { fixtureConfig } from "@/fixtures/interview";

describe("JD → interview → results", () => {
  it.each(["backend", "frontend", "sre"] as const)(
    "preserves %s context, history, retries and separate observations",
    async (role) => {
      const intelligence = new MockIntelligence();
      const initial = vi.spyOn(intelligence, "initialQuestion");
      const assess = vi.spyOn(intelligence, "assessAnswer");
      const service = new SessionService(new MemorySessionRepository(), intelligence);
      const config = {
        ...fixtureConfig,
        role,
        questionCount: 3,
        jobDescription: `Synthetic ${role} job: build reliable systems and test failure modes.`,
        monitoring: { camera: true, audio: true, focus: true },
      };
      let session = await service.create("owner", config);
      expect(initial.mock.calls[0][0].jobDescription).toBe(config.jobDescription);
      await expect(service.report("owner", session.id)).rejects.toMatchObject({
        code: "REPORT_NOT_READY",
      });
      session = await service.addEvents("owner", session.id, [
        {
          id: crypto.randomUUID(),
          source: "focus",
          type: "page_hidden",
          occurredAt: new Date().toISOString(),
        },
      ]);
      for (let i = 0; i < 3; i++) {
        const input = {
          submissionId: crypto.randomUUID(),
          questionId: session.activeQuestionId!,
          text: `I persist state atomically and test concurrent requests. Round ${i + 1} includes rollback verification.`,
        };
        session = await service.answer("owner", session.id, input);
        expect((await service.answer("owner", session.id, input)).answers).toHaveLength(i + 1);
        expect(assess.mock.calls[i][0].config.jobDescription).toBe(config.jobDescription);
        expect(assess.mock.calls[i][0].answers).toHaveLength(i);
        expect(assess.mock.calls[i][0]).not.toHaveProperty("events");
        if (i < 2) expect(session.questions.at(-1)?.kind).toBe("follow_up");
      }
      const report = await service.report("owner", session.id);
      expect(session.status).toBe("completed");
      expect(report.config?.jobDescription).toBe(config.jobDescription);
      expect(report.questions).toHaveLength(3);
      expect(report.answers).toHaveLength(3);
      expect(report.observations.count).toBe(1);
      expect(report.averageScores).toEqual({ correctness: 3, reasoning: 3, clarity: 3 });
      for (const answer of report.answers) {
        expect(report.questions?.some((q) => q.id === answer.questionId)).toBe(true);
        expect(answer.text).toContain(answer.feedback.evidenceQuote);
      }
      await expect(service.report("other", session.id)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    },
  );
});
