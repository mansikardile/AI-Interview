import {
  deleteSessionResponseSchema,
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

type RequestOptions = {
  method?: string;
  body?: unknown;
};

async function request<T>(
  url: string,
  schema: z.ZodType<T>,
  optionsOrBody?: RequestOptions | unknown,
): Promise<T> {
  const isOptions =
    optionsOrBody !== null &&
    typeof optionsOrBody === "object" &&
    ("method" in optionsOrBody || "body" in optionsOrBody);
  const method = isOptions
    ? (optionsOrBody as RequestOptions).method ?? "GET"
    : optionsOrBody === undefined
      ? "GET"
      : "POST";
  const body = isOptions ? (optionsOrBody as RequestOptions).body : optionsOrBody;

  const response = await fetch(url, {
    method,
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
  deleteSession: (id: string) =>
    request(`/api/sessions/${encodeURIComponent(id)}`, deleteSessionResponseSchema, {
      method: "DELETE",
    }),
  createRetryRound: (id: string) =>
    request(`/api/sessions/${encodeURIComponent(id)}/retry`, sessionSchema, {
      method: "POST",
    }),
};

