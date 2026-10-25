import { z } from "zod";

export const monitoringReviewContentSchema = z
  .object({
    observations: z
      .array(
        z
          .object({
            eventIds: z.array(z.uuid()).min(1).max(20),
            explanation: z.string().min(1).max(500),
            alternativeExplanation: z.string().min(1).max(500),
          })
          .strict(),
      )
      .max(8),
    practiceTips: z.array(z.string().min(1).max(300)).min(1).max(5),
  })
  .strict();
export const monitoringReviewSchema = monitoringReviewContentSchema.extend({
  provider: z.enum(["jarvislabs", "ollama"]),
  model: z.string(),
  generatedAt: z.iso.datetime(),
  eventCount: z.number().int().nonnegative(),
  limitation: z.string(),
});
export type MonitoringReview = z.infer<typeof monitoringReviewSchema>;
