/** Session-scoped answer drafts. Never restore across different question IDs. */

const PREFIX = "interviewiq:draft:";

export function draftStorageKey(sessionId: string, questionId: string): string {
  return `${PREFIX}${sessionId}:${questionId}`;
}

export function readDraft(sessionId: string, questionId: string): string {
  if (typeof sessionStorage === "undefined") return "";
  try {
    return sessionStorage.getItem(draftStorageKey(sessionId, questionId)) ?? "";
  } catch {
    return "";
  }
}

export function writeDraft(sessionId: string, questionId: string, text: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const key = draftStorageKey(sessionId, questionId);
    if (!text.trim()) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, text);
  } catch {
    /* private mode / quota — typed interview still works */
  }
}

export function clearDraft(sessionId: string, questionId: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(draftStorageKey(sessionId, questionId));
  } catch {
    /* ignore */
  }
}

export function describeApiFailure(error: unknown): {
  title: string;
  message: string;
  retryable: boolean;
  code: string;
} {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: string }).code);
    const message = error instanceof Error ? error.message : "The request failed.";
    const retryable =
      "retryable" in error ? Boolean((error as { retryable: boolean }).retryable) : true;
    switch (code) {
      case "NOT_FOUND":
        return {
          code,
          title: "Interview unavailable",
          message:
            "This session was not found in this browser. Start a new practice session from home.",
          retryable: false,
        };
      case "STALE_QUESTION":
      case "IDEMPOTENCY_CONFLICT":
        return {
          code,
          title: "Session moved on",
          message: `${message} Reload the latest question state before submitting again.`,
          retryable: true,
        };
      case "PROVIDER_UNAVAILABLE":
      case "INVALID_MODEL_OUTPUT":
        return {
          code,
          title: "Reviewer unavailable",
          message: `${message} Your drafted answer is preserved — retry with the same submission.`,
          retryable: true,
        };
      case "SESSION_COMPLETED":
        return {
          code,
          title: "Already complete",
          message: message,
          retryable: false,
        };
      default:
        return {
          code,
          title: retryable ? "Connection issue" : "Could not continue",
          message,
          retryable,
        };
    }
  }
  return {
    code: "REQUEST_FAILED",
    title: "Connection issue",
    message:
      error instanceof Error
        ? error.message
        : "Could not reach the interview service. Your answer is preserved.",
    retryable: true,
  };
}
