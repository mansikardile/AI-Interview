import {
  reportSchema,
  sessionSchema,
  type InterviewConfig,
  type MonitoringEvent,
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

async function request<T>(url: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
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
  addEvents: (id: string, events: MonitoringEvent[]) =>
    request(
      `/api/sessions/${encodeURIComponent(id)}/events`,
      z.object({ accepted: z.boolean(), revision: z.number() }),
      { events },
    ),
  getReport: (id: string) =>
    request(`/api/sessions/${encodeURIComponent(id)}/report`, reportSchema),
};
