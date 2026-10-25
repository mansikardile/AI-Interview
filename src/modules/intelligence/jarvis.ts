import {
  assessmentSchema,
  questionSchema,
  type Assessment,
  type InterviewConfig,
  type InterviewContext,
  type Question,
  type SubmitAnswerInput,
} from "@/contracts";
import { DomainError } from "@/lib/domain-error";
import {
  SYSTEM_COACH_PROMPT,
  buildAssessAnswerPrompt,
  buildInitialQuestionPrompt,
} from "./prompts";
import type { InterviewIntelligence } from "./types";

type JarvisOptions = {
  apiKey: string;
  baseUrl: string;
  model: string;
  fetcher?: typeof fetch;
};

/**
 * Normalizes an evidence quote by trimming whitespace and stripping
 * leading/trailing quotation marks that LLMs commonly add.
 */
function normalizeQuote(quote: string): string {
  let cleaned = quote.trim();
  // Strip outer matching quotes if present
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith("“") && cleaned.endsWith("”")) ||
    (cleaned.startsWith("`") && cleaned.endsWith("`"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

export function validateAssessment(value: unknown, answer: string): Assessment {
  const result = assessmentSchema.safeParse(value);
  if (!result.success) {
    throw new DomainError(
      "INVALID_MODEL_OUTPUT",
      "The model returned invalid feedback schema. Please retry.",
      502,
      true,
    );
  }

  const rawQuote = result.data.feedback.evidenceQuote;
  const cleanQuote = normalizeQuote(rawQuote);

  if (!cleanQuote || !answer.includes(cleanQuote)) {
    throw new DomainError(
      "INVALID_MODEL_OUTPUT",
      "The model returned ungrounded feedback evidence. Please retry.",
      502,
      true,
    );
  }

  // Preserve the validated, normalized quote in the returned assessment
  result.data.feedback.evidenceQuote = cleanQuote;
  return result.data;
}

/**
 * Robust JSON parser that handles pure JSON, markdown fenced JSON,
 * or JSON embedded within model conversational wrappers.
 */
export function parseModelJson(content: string): unknown {
  const trimmed = content.trim();

  // 1. Try direct JSON parse
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue to extract from markdown or wrapper
  }

  // 2. Try markdown fenced block (```json ... ``` or ``` ...)
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1].trim());
    } catch {
      // Continue to bracket extraction
    }
  }

  // 3. Try to locate outermost balanced { ... } object
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Failed all extraction strategies
    }
  }

  throw new DomainError(
    "INVALID_MODEL_OUTPUT",
    "The model did not return valid JSON. Please retry.",
    502,
    true,
  );
}

export class JarvisIntelligence implements InterviewIntelligence {
  readonly mode = "live" as const;

  constructor(private readonly options: JarvisOptions) {}

  private async request(systemPromptAddendum: string, data: unknown): Promise<unknown> {
    try {
      const response = await (this.options.fetcher ?? fetch)(
        `${this.options.baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.options.apiKey}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(25000),
          body: JSON.stringify({
            model: this.options.model,
            temperature: 0.2,
            max_tokens: 1800,
            messages: [
              {
                role: "system",
                content: `${SYSTEM_COACH_PROMPT}\n\nTASK:\n${systemPromptAddendum}`,
              },
              { role: "user", content: JSON.stringify(data) },
            ],
          }),
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new DomainError(
          "PROVIDER_UNAVAILABLE",
          `The interview model service returned status ${response.status}. Please retry.`,
          502,
          true,
        );
      }

      const body = await response.text();
      if (body.length > 64000) {
        throw new DomainError(
          "INVALID_MODEL_OUTPUT",
          "The model response exceeded size limits.",
          502,
          true,
        );
      }

      const envelope = JSON.parse(body) as { choices?: { message?: { content?: unknown } }[] };
      const content = envelope.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new DomainError(
          "INVALID_MODEL_OUTPUT",
          "The model response was incomplete or missing content. Please retry.",
          502,
          true,
        );
      }

      return parseModelJson(content);
    } catch (error) {
      if (error instanceof DomainError) throw error;
      throw new DomainError(
        "PROVIDER_UNAVAILABLE",
        "The model request failed or timed out. Please retry.",
        502,
        true,
      );
    }
  }

  async initialQuestion(config: InterviewConfig): Promise<Question> {
    const { task, data } = buildInitialQuestionPrompt(config);
    const value = await this.request(task, data);
    const candidate = typeof value === "object" && value !== null ? value : {};

    const result = questionSchema.safeParse({
      ...candidate,
      id: crypto.randomUUID(),
      kind: "initial",
    });

    if (!result.success) {
      throw new DomainError(
        "INVALID_MODEL_OUTPUT",
        "The model returned an invalid initial question structure. Please retry.",
        502,
        true,
      );
    }

    return result.data;
  }

  async assessAnswer(context: InterviewContext, answer: SubmitAnswerInput): Promise<Assessment> {
    const { task, data } = buildAssessAnswerPrompt(context, answer);
    const value = await this.request(task, data);

    const raw = value as {
      feedback?: unknown;
      nextQuestion?: { text?: unknown; topic?: unknown };
    } | null;

    return validateAssessment(
      {
        feedback: raw?.feedback,
        nextQuestion: {
          text: raw?.nextQuestion?.text,
          topic: raw?.nextQuestion?.topic,
          id: crypto.randomUUID(),
          kind: "follow_up",
        },
      },
      answer.text,
    );
  }
}
