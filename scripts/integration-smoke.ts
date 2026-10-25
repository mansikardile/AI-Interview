import assert from "node:assert/strict";
import { sessionSchema, reportSchema } from "../src/contracts";
async function main() {
  const base = process.env.SMOKE_BASE_URL || "http://localhost:3000";
  const jd =
    "Synthetic backend role: build PostgreSQL payment APIs with idempotency and concurrency tests.";
  const created = await fetch(`${base}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: "backend",
      difficulty: "mid",
      jobDescription: jd,
      questionCount: 3,
      monitoring: { camera: true, audio: true, focus: true },
    }),
  });
  assert.equal(created.status, 201);
  const cookie = created.headers
    .getSetCookie()
    .find((c) => c.startsWith("iq_owner="))
    ?.split(";")[0];
  assert.ok(cookie);
  const headers = { "Content-Type": "application/json", Cookie: cookie };
  let session = sessionSchema.parse((await created.json()).data);
  const url = `${base}/api/sessions/${session.id}`;
  assert.equal((await fetch(`${url}/report`, { headers })).status, 409);
  for (let i = 0; i < 3; i++) {
    const answer = {
      submissionId: crypto.randomUUID(),
      questionId: session.activeQuestionId,
      text: `I use a unique idempotency key and database transaction. A unique constraint prevents races. I test concurrent retries and rollback recovery in round ${i + 1}.`,
    };
    const response = await fetch(`${url}/answers`, {
      method: "POST",
      headers,
      body: JSON.stringify(answer),
    });
    assert.equal(response.status, 200);
    session = sessionSchema.parse((await response.json()).data);
    const retry = await fetch(`${url}/answers`, {
      method: "POST",
      headers,
      body: JSON.stringify(answer),
    });
    assert.equal(retry.status, 200);
    assert.equal((await retry.json()).data.answers.length, i + 1);
    assert.equal(session.config.jobDescription, jd);
  }
  const response = await fetch(`${url}/report`, { headers });
  assert.equal(response.status, 200);
  const report = reportSchema.parse((await response.json()).data);
  assert.equal(report.config?.jobDescription, jd);
  assert.equal(report.questions?.length, 3);
  assert.equal(report.answers.length, 3);
  assert.equal((await fetch(`${url}/report`)).status, 404);
  console.log(
    `Integrated HTTP flow passed: JD → 3 rounds → retry-safe answers → results (${report.mode}). Synthetic API test, not a physical-device test.`,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
