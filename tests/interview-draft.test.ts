import { describe, expect, it } from "vitest";
import {
  describeApiFailure,
  draftStorageKey,
} from "@/modules/interview/draft-storage";
import { isWebSpeechCaptureAvailable } from "@/modules/interview/speech/create-web-speech-capture";
import { ApiError } from "@/lib/api-client";

describe("draft storage keys", () => {
  it("scopes drafts to session and question", () => {
    const a = draftStorageKey("session-1", "question-a");
    const b = draftStorageKey("session-1", "question-b");
    const c = draftStorageKey("session-2", "question-a");
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(a).toContain("session-1");
    expect(a).toContain("question-a");
  });
});

describe("describeApiFailure", () => {
  it("maps NOT_FOUND to non-retryable guidance", () => {
    const result = describeApiFailure(new ApiError("NOT_FOUND", "missing", false));
    expect(result.retryable).toBe(false);
    expect(result.title).toMatch(/unavailable/i);
  });

  it("keeps provider failures retryable", () => {
    const result = describeApiFailure(
      new ApiError("PROVIDER_UNAVAILABLE", "timeout", true),
    );
    expect(result.retryable).toBe(true);
    expect(result.message).toMatch(/preserved/i);
  });
});

describe("web speech availability", () => {
  it("reports unavailable in node test environment", () => {
    expect(isWebSpeechCaptureAvailable()).toBe(false);
  });
});
