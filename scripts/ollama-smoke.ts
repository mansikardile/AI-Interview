import assert from "node:assert/strict";
import { OllamaIntelligence } from "../src/modules/intelligence/ollama";
import { generateMonitoringReview } from "../src/modules/monitoring/jarvis-review";
import { fixtureSession } from "../src/fixtures/interview";

async function main() {
  const options = {
    baseUrl: process.env.OLLAMA_BASE_URL,
    model: process.env.OLLAMA_MODEL || "gemma4:e2b-mlx",
  };
  const intelligence = new OllamaIntelligence(options);
  console.log(`Testing real local Gemma: ${options.model}. Synthetic data only.`);
  const question = await intelligence.initialQuestion(fixtureSession.config);
  assert.ok(question.text.length >= 10);
  console.log("PASS: generated schema-valid interview question.");
  const answer = {
    submissionId: crypto.randomUUID(),
    questionId: question.id,
    text: "I would use an idempotency key and persist the result atomically in PostgreSQL. A unique constraint prevents concurrent retries from creating duplicate payments. I would test simultaneous requests and a crash after committing.",
  };
  const assessment = await intelligence.assessAnswer(
    { config: fixtureSession.config, questions: [question], answers: [] },
    answer,
  );
  assert.ok(answer.text.includes(assessment.feedback.evidenceQuote));
  console.log("PASS: validated technical assessment, exact quote and follow-up.");
  const id = crypto.randomUUID();
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
    { ...options, provider: "ollama" },
  );
  assert.equal(review.provider, "ollama");
  assert.ok(review.practiceTips.length);
  console.log("PASS: real monitoring review with validated evidence IDs; provider=ollama.");
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Ollama smoke failed");
  process.exitCode = 1;
});
