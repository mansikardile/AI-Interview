import { describe, expect, it } from "vitest";
import {
  createSessionSchema,
  monitoringBatchSchema,
  monitoringEventSchema,
  sessionSchema,
  submitAnswerSchema,
} from "@/contracts";
import { fixtureSession } from "@/fixtures/interview";

describe("v1 wire contracts", () => {
  it("defaults to a bounded interview with all monitoring off", () => {
    const config = createSessionSchema.parse({});
    expect(config.questionCount).toBe(3);
    expect(config.monitoring).toEqual({ focus: false, camera: false, audio: false });
    expect(createSessionSchema.safeParse({ questionCount: 100 }).success).toBe(false);
  });
  it("rejects unbounded/empty answers and unexpected fields", () => {
    const base = { submissionId: crypto.randomUUID(), questionId: crypto.randomUUID() };
    expect(submitAnswerSchema.safeParse({ ...base, text: "  " }).success).toBe(false);
    expect(submitAnswerSchema.safeParse({ ...base, text: "a".repeat(12001) }).success).toBe(false);
    expect(
      submitAnswerSchema.safeParse({ ...base, text: "valid", ownerHash: "injected" }).success,
    ).toBe(false);
  });
  it("rejects mismatched event sources, negative durations and oversized batches", () => {
    const event = {
      id: crypto.randomUUID(),
      source: "focus",
      type: "page_hidden",
      occurredAt: new Date().toISOString(),
    };
    expect(monitoringEventSchema.safeParse({ ...event, type: "no_face" }).success).toBe(false);
    expect(monitoringEventSchema.safeParse({ ...event, durationMs: -1 }).success).toBe(false);
    expect(monitoringBatchSchema.safeParse({ events: Array(51).fill(event) }).success).toBe(false);
  });
  it("keeps shared fixtures compatible with the session contract", () => {
    expect(sessionSchema.parse(fixtureSession).id).toBe(fixtureSession.id);
  });
});
