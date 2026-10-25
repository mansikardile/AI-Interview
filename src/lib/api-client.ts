import {
  deleteSessionResponseSchema,
  reportSchema,
  sessionSchema,
  type InterviewConfig,
  type MonitoringEvent,
  type MonitoringConsent,
  type SubmitAnswerInput,
} from "@/contracts";
import { z } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
  }
}

async function request<T>(
  url: string,
  schema: z.ZodType<T>,
  body?: unknown,
  options?: { method?: string; signal?: AbortSignal },
): Promise<T> {
  const response = await fetch(url, {
    method: options?.method ?? (body === undefined ? "GET" : "POST"),
    signal: options?.signal,
    credentials: "same-origin",
    cache: "no-store",
    ...(body === undefined
      ? {}
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok)
    throw new ApiError(
      result.error?.code ?? "REQUEST_FAILED",
      result.error?.message ?? "The request failed.",
      result.error?.retryable ?? true,
    );
  return schema.parse(result.data);
}

export const api = {
  createSession: (config: InterviewConfig) => request("/api/sessions", sessionSchema, config),
  getSession: (id: string) => request(`/api/sessions/${encodeURIComponent(id)}`, sessionSchema),
  submitAnswer: (id: string, answer: SubmitAnswerInput) =>
    request(`/api/sessions/${encodeURIComponent(id)}/answers`, sessionSchema, answer),
  addEvents: (id: string, events: MonitoringEvent[], signal?: AbortSignal) =>
    request(
      `/api/sessions/${encodeURIComponent(id)}/events`,
      z.object({ accepted: z.boolean(), revision: z.number() }),
      { events },
      { signal },
    ),
  updateMonitoringConsent: (id: string, monitoring: MonitoringConsent) =>
    request(
      `/api/sessions/${encodeURIComponent(id)}/monitoring`,
      sessionSchema,
      { monitoring },
      { method: "PATCH" },
    ),
  getReport: (id: string) =>
    request(`/api/sessions/${encodeURIComponent(id)}/report`, reportSchema),
  deleteSession: (id: string) =>
    request(`/api/sessions/${encodeURIComponent(id)}`, deleteSessionResponseSchema, undefined, {
      method: "DELETE",
    }),
  createRetryRound: (id: string) =>
    request(`/api/sessions/${encodeURIComponent(id)}/retry`, sessionSchema, undefined, {
      method: "POST",
    }),
};
