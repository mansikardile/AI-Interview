import { describe, expect, it } from "vitest";
import { MockIntelligence } from "@/modules/intelligence";
import { SessionService } from "@/modules/platform/session-service";
import { MemorySessionRepository } from "@/modules/platform/repository";
import { createSessionSchema, type MonitoringEvent } from "@/contracts";

describe("server acknowledgement and revocation", () => {
  const event = (): MonitoringEvent => ({
    id: crypto.randomUUID(),
    source: "camera",
    type: "no_face",
    occurredAt: new Date().toISOString(),
  });
  it("requires acknowledgement before accepting a new source and rejects it after revocation", async () => {
    const service = new SessionService(new MemorySessionRepository(), new MockIntelligence());
    const session = await service.create("owner", createSessionSchema.parse({}));
    await expect(service.addEvents("owner", session.id, [event()])).rejects.toMatchObject({
      code: "CONSENT_REQUIRED",
    });
    const enabled = await service.updateMonitoringConsent("owner", session.id, {
      focus: false,
      camera: true,
      audio: false,
    });
    expect(enabled.config.monitoring.camera).toBe(true);
    await service.addEvents("owner", session.id, [event()]);
    await service.updateMonitoringConsent("owner", session.id, {
      focus: false,
      camera: false,
      audio: false,
    });
    await expect(service.addEvents("owner", session.id, [event()])).rejects.toMatchObject({
      code: "CONSENT_REQUIRED",
    });
    expect((await service.get("owner", session.id)).events).toHaveLength(1);
  });
  it("enforces owner isolation and refuses consent updates after completion", async () => {
    const service = new SessionService(new MemorySessionRepository(), new MockIntelligence());
    const session = await service.create("owner", createSessionSchema.parse({ questionCount: 1 }));
    const consent = { focus: true, camera: false, audio: false };
    await expect(
      service.updateMonitoringConsent("other", session.id, consent),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await service.answer("owner", session.id, {
      submissionId: crypto.randomUUID(),
      questionId: session.activeQuestionId!,
      text: "A concrete answer for practice.",
    });
    await expect(
      service.updateMonitoringConsent("owner", session.id, consent),
    ).rejects.toMatchObject({ code: "SESSION_COMPLETED" });
  });
  it("keeps technical feedback identical with and without monitoring events", async () => {
    const service = new SessionService(new MemorySessionRepository(), new MockIntelligence());
    const reports = [];
    for (const monitoring of [false, true]) {
      const session = await service.create(
        "owner",
        createSessionSchema.parse({ questionCount: 1, monitoring: { camera: monitoring } }),
      );
      if (monitoring) await service.addEvents("owner", session.id, [event()]);
      await service.answer("owner", session.id, {
        submissionId: crypto.randomUUID(),
        questionId: session.activeQuestionId!,
        text: "Use an idempotency key and an atomic unique write.",
      });
      reports.push(await service.report("owner", session.id));
    }
    expect(reports[0].averageScores).toEqual(reports[1].averageScores);
    expect(reports[0].answers[0].feedback).toEqual(reports[1].answers[0].feedback);
    expect(reports[1].observations.count).toBe(1);
  });
});
