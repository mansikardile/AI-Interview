import assert from "node:assert/strict";
import { JarvisIntelligence } from "../src/modules/intelligence/jarvis";
import { generateMonitoringReview } from "../src/modules/monitoring/jarvis-review";
import { fixtureSession } from "../src/fixtures/interview";

async function main() {
  const apiKey = process.env.JARVISLABS_API_KEY;
  const model = process.env.JARVISLABS_MODEL;
  const baseUrl = process.env.JARVISLABS_BASE_URL ?? "https://models.jarvislabs.net/v1";
  assert.ok(apiKey && model, "Set JARVISLABS_API_KEY and JARVISLABS_MODEL in .env.local.");
  // Same options as the app runtime (src/modules/platform/runtime.ts).
  const intelligence = new JarvisIntelligence({
    apiKey,
    baseUrl,
    model,
    timeoutMs: 60000,
    structuredOutput: true,
    disableThinking: true,
  });
  console.log(`Testing hosted JarvisLabs Gemma: ${model}. Synthetic data only.`);
  let started = Date.now();
  const question = await intelligence.initialQuestion(fixtureSession.config);
  assert.ok(question.text.length >= 10);
  console.log(`PASS: generated schema-valid interview question (${Date.now() - started}ms).`);
  const answer = {
    submissionId: crypto.randomUUID(),
    questionId: question.id,
    text: "I would use an idempotency key and persist the result atomically in PostgreSQL. A unique constraint prevents concurrent retries from creating duplicate payments. I would test simultaneous requests and a crash after committing.",
  };
  started = Date.now();
  const assessment = await intelligence.assessAnswer(
    { config: fixtureSession.config, questions: [question], answers: [] },
    answer,
  );
  assert.ok(answer.text.includes(assessment.feedback.evidenceQuote));
  console.log(
    `PASS: validated technical assessment, exact quote and follow-up (${Date.now() - started}ms).`,
  );
  const id = crypto.randomUUID();
  started = Date.now();
  const review = await generateMonitoringReview(
    [
      {
        id,
        source: "focus",
        type: "page_visible",
        occurredAt: new Date().toISOString(),
        durationMs: 4000,
      },
    ],
    { apiKey, baseUrl, model },
  );
  assert.equal(review.provider, "jarvislabs");
  assert.ok(review.practiceTips.length);
  console.log(
    `PASS: hosted monitoring review with validated evidence IDs; provider=jarvislabs (${Date.now() - started}ms).`,
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Jarvis smoke failed");
  process.exitCode = 1;
});
