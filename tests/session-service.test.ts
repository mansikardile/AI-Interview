import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InterviewConfig, MonitoringEvent, SubmitAnswerInput } from "@/contracts";
import { fixtureConfig } from "@/fixtures/interview";
import { MockIntelligence } from "@/modules/intelligence";
import { MemorySessionRepository } from "@/modules/platform/repository";
import { SessionService } from "@/modules/platform/session-service";

describe("session contract and state", () => {
  let repository: MemorySessionRepository;
  let intelligence: MockIntelligence;
  let service: SessionService;
  const owner = "owner-a";

  beforeEach(() => {
    repository = new MemorySessionRepository();
    intelligence = new MockIntelligence();
    service = new SessionService(repository, intelligence);
  });
  const input = (questionId: string): SubmitAnswerInput => ({
    submissionId: crypto.randomUUID(),
    questionId,
    text: "I would persist a unique idempotency key atomically and return the original result for a retry.",
  });
  const observation = (): MonitoringEvent => ({
    id: crypto.randomUUID(),
    source: "focus",
    type: "page_hidden",
    occurredAt: new Date().toISOString(),
  });
  const config = (overrides: Partial<InterviewConfig> = {}) => ({ ...fixtureConfig, ...overrides });

  it("completes a bounded interview and returns a grounded report", async () => {
    const session = await service.create(owner, config({ questionCount: 1 }));
    const answer = input(session.activeQuestionId!);
    const completed = await service.answer(owner, session.id, answer);
    expect(completed.status).toBe("completed");
    expect(completed.activeQuestionId).toBeNull();
    const report = await service.report(owner, session.id);
    expect(answer.text).toContain(report.answers[0].feedback.evidenceQuote);
    expect(report.mode).toBe("mock");
  });
  it("scopes reads, answers, events and reports to the browser owner", async () => {
    const session = await service.create(owner, config());
    await expect(service.get("other-owner", session.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      service.answer("other-owner", session.id, input(session.activeQuestionId!)),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      service.addEvents("other-owner", session.id, [observation()]),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.report("other-owner", session.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("returns the same accepted answer on retry and rejects conflicting ID reuse", async () => {
    const session = await service.create(owner, config());
    const answer = input(session.activeQuestionId!);
    await service.answer(owner, session.id, answer);
    const retried = await service.answer(owner, session.id, answer);
    expect(retried.answers).toHaveLength(1);
    await expect(
      service.answer(owner, session.id, { ...answer, text: "Different content" }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it("prevents two competing answers from overwriting each other", async () => {
    const session = await service.create(owner, config());
    const results = await Promise.allSettled([
      service.answer(owner, session.id, input(session.activeQuestionId!)),
      service.answer(owner, session.id, input(session.activeQuestionId!)),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect((await service.get(owner, session.id)).answers).toHaveLength(1);
  });
  it("deduplicates simultaneous identical answer submissions", async () => {
    const session = await service.create(owner, config());
    const answer = input(session.activeQuestionId!);
    const results = await Promise.all([
      service.answer(owner, session.id, answer),
      service.answer(owner, session.id, answer),
    ]);
    expect(results.every((result) => result.answers.length === 1)).toBe(true);
  });
  it("enforces source-specific consent and deduplicates observations", async () => {
    const session = await service.create(
      owner,
      config({ monitoring: { focus: true, camera: false, audio: false } }),
    );
    const event = observation();
    await service.addEvents(owner, session.id, [event, event]);
    expect((await service.addEvents(owner, session.id, [event])).events).toHaveLength(1);
    await expect(
      service.addEvents(owner, session.id, [
        { ...event, id: crypto.randomUUID(), source: "camera", type: "no_face" },
      ]),
    ).rejects.toMatchObject({ code: "CONSENT_REQUIRED" });
  });
  it("does not pass monitoring events into interview intelligence", async () => {
    const spy = vi.spyOn(intelligence, "assessAnswer");
    const session = await service.create(
      owner,
      config({ monitoring: { focus: true, camera: false, audio: false } }),
    );
    await service.addEvents(owner, session.id, [observation()]);
    await service.answer(owner, session.id, input(session.activeQuestionId!));
    expect(spy.mock.calls[0][0]).not.toHaveProperty("events");
  });
  it("preserves observation writes racing answer assessment", async () => {
    const session = await service.create(
      owner,
      config({ monitoring: { focus: true, camera: false, audio: false } }),
    );
    await Promise.all([
      service.answer(owner, session.id, input(session.activeQuestionId!)),
      service.addEvents(owner, session.id, [observation()]),
    ]);
    const state = await service.get(owner, session.id);
    expect(state.answers).toHaveLength(1);
    expect(state.events).toHaveLength(1);
  });
  it("leaves state unchanged after provider failure", async () => {
    const session = await service.create(owner, config());
    vi.spyOn(intelligence, "assessAnswer").mockRejectedValue(new Error("provider failure"));
    await expect(
      service.answer(owner, session.id, input(session.activeQuestionId!)),
    ).rejects.toThrow();
    expect(await service.get(owner, session.id)).toEqual(session);
  });
  it("rejects fabricated quote evidence before storing an answer", async () => {
    const session = await service.create(owner, config());
    const answer = input(session.activeQuestionId!);
    const result = await intelligence.assessAnswer(session, answer);
    result.feedback.evidenceQuote = "Words the candidate never said";
    vi.spyOn(intelligence, "assessAnswer").mockResolvedValue(result);
    await expect(service.answer(owner, session.id, answer)).rejects.toMatchObject({
      code: "INVALID_MODEL_OUTPUT",
    });
    expect((await service.get(owner, session.id)).answers).toHaveLength(0);
  });
  it("does not expose a report before completion", async () => {
    const session = await service.create(owner, config());
    await expect(service.report(owner, session.id)).rejects.toMatchObject({
      code: "REPORT_NOT_READY",
    });
  });
  it("deletes an owned session and rejects deletion by a different owner", async () => {
    const session = await service.create(owner, config());
    await expect(service.delete("different-owner", session.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    const result = await service.delete(owner, session.id);
    expect(result.deleted).toBe(true);
    await expect(service.get(owner, session.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("creates a targeted retry round from a completed session", async () => {
    const session = await service.create(owner, config({ questionCount: 1 }));
    await expect(service.createRetryRound(owner, session.id)).rejects.toMatchObject({
      code: "REPORT_NOT_READY",
    });
    await service.answer(owner, session.id, input(session.activeQuestionId!));
    const retrySession = await service.createRetryRound(owner, session.id);
    expect(retrySession.id).not.toBe(session.id);
    expect(retrySession.config.role).toBe(session.config.role);
    expect(retrySession.status).toBe("in_progress");
    expect(retrySession.config.jobDescription).toBe(session.config.jobDescription);
    expect(retrySession.config.practiceFocus).toContain("Targeted practice focus");
    expect(retrySession.config.monitoring).toEqual({ focus: false, camera: false, audio: false });
    expect(retrySession.answers).toHaveLength(0);
    expect(retrySession.events).toHaveLength(0);
    expect(retrySession.questions.length).toBeGreaterThan(0);
  });
});
