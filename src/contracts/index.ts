import { z } from "zod";

export const CONTRACT_VERSION = 1 as const;
export const idSchema = z.string().uuid();
export const monitoringConsentSchema = z
  .object({
    focus: z.boolean().default(false),
    camera: z.boolean().default(false),
    audio: z.boolean().default(false),
  })
  .strict();

export const createSessionSchema = z
  .object({
    role: z.enum(["backend", "frontend", "sre"]).default("backend"),
    difficulty: z.enum(["junior", "mid", "senior"]).default("mid"),
    jobDescription: z.string().trim().max(8000).default(""),
    questionCount: z.number().int().min(1).max(5).default(3),
    monitoring: monitoringConsentSchema.default({ focus: false, camera: false, audio: false }),
  })
  .strict();

export const updateMonitoringConsentSchema = z
  .object({ monitoring: monitoringConsentSchema })
  .strict();

export const questionSchema = z
  .object({
    id: idSchema,
    text: z.string().min(10).max(2000),
    topic: z.string().min(1).max(120),
    kind: z.enum(["initial", "follow_up"]),
  })
  .strict();

export const feedbackSchema = z
  .object({
    scores: z
      .object({
        correctness: z.number().min(0).max(5),
        reasoning: z.number().min(0).max(5),
        clarity: z.number().min(0).max(5),
      })
      .strict(),
    evidenceQuote: z.string().min(1).max(500),
    strengths: z.array(z.string().min(1).max(500)).min(1).max(5),
    gaps: z.array(z.string().min(1).max(500)).max(5),
    nextPractice: z.string().min(1).max(1000),
  })
  .strict();

export const assessmentSchema = z
  .object({
    feedback: feedbackSchema,
    nextQuestion: questionSchema,
  })
  .strict();

export const submitAnswerSchema = z
  .object({
    submissionId: idSchema,
    questionId: idSchema,
    text: z.string().trim().min(1).max(12000),
  })
  .strict();

const sourceTypes = {
  focus: ["page_hidden", "page_visible"],
  camera: ["no_face", "multiple_faces", "camera_unavailable"],
  audio: ["speech_activity", "silence", "microphone_unavailable"],
} as const;

export const monitoringEventSchema = z
  .object({
    id: idSchema,
    source: z.enum(["focus", "camera", "audio"]),
    type: z.enum([
      "page_hidden",
      "page_visible",
      "no_face",
      "multiple_faces",
      "camera_unavailable",
      "speech_activity",
      "silence",
      "microphone_unavailable",
    ]),
    occurredAt: z.string().datetime(),
    durationMs: z.number().int().min(0).max(86400000).optional(),
    detail: z.string().max(300).optional(),
  })
  .strict()
  .superRefine((event, context) => {
    if (!(sourceTypes[event.source] as readonly string[]).includes(event.type)) {
      context.addIssue({
        code: "custom",
        message: "Event type does not match its source",
        path: ["type"],
      });
    }
  });

export const monitoringBatchSchema = z
  .object({
    events: z.array(monitoringEventSchema).min(1).max(50),
  })
  .strict();

export const answerSchema = submitAnswerSchema.extend({
  submittedAt: z.string().datetime(),
  mode: z.enum(["mock", "live"]),
  feedback: feedbackSchema,
});

export const sessionSchema = z
  .object({
    contractVersion: z.literal(CONTRACT_VERSION),
    id: idSchema,
    createdAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable(),
    revision: z.number().int().min(0),
    status: z.enum(["in_progress", "completed"]),
    mode: z.enum(["mock", "live"]),
    storage: z.enum(["memory", "postgres"]),
    config: createSessionSchema,
    questions: z.array(questionSchema),
    activeQuestionId: idSchema.nullable(),
    answers: z.array(answerSchema),
    events: z.array(monitoringEventSchema),
  })
  .strict();

export const reportSchema = z.object({
  sessionId: idSchema,
  role: createSessionSchema.shape.role,
  mode: z.enum(["mock", "live"]),
  completedAt: z.string().datetime(),
  averageScores: feedbackSchema.shape.scores,
  answers: z.array(answerSchema),
  observations: z.object({
    count: z.number().int().min(0),
    events: z.array(monitoringEventSchema),
    notice: z.string(),
  }),
  practicePlan: z.array(z.string()),
});

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  }),
});

export type InterviewConfig = z.infer<typeof createSessionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Feedback = z.infer<typeof feedbackSchema>;
export type Assessment = z.infer<typeof assessmentSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
export type MonitoringConsent = z.infer<typeof monitoringConsentSchema>;
export type MonitoringEvent = z.infer<typeof monitoringEventSchema>;
export type InterviewSession = z.infer<typeof sessionSchema>;
export type InterviewReport = z.infer<typeof reportSchema>;

// Intelligence receives only interview evidence, never monitoring observations.
export type InterviewContext = Pick<InterviewSession, "config" | "questions" | "answers">;
