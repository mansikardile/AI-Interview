import assert from "node:assert/strict";

async function main() {
  const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
  const headers = { "Content-Type": "application/json" };
  const created = await fetch(`${base}/api/sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ questionCount: 1 }),
  });
  assert.equal(created.status, 201);
  const cookie = created.headers
    .getSetCookie()
    .find((value) => value.startsWith("iq_owner="))
    ?.split(";")[0];
  assert.ok(cookie, "Session creation sets an owner cookie");
  const { data: session } = await created.json();
  const privateResponse = await fetch(`${base}/api/sessions/${session.id}`);
  assert.equal(privateResponse.status, 404, "Other browsers cannot read the session");
  const ownerHeaders = { ...headers, Cookie: cookie };
  const answer = {
    submissionId: crypto.randomUUID(),
    questionId: session.activeQuestionId,
    text: "Use an idempotency key, persist the result atomically, and test simultaneous retries.",
  };
  const submitted = await fetch(`${base}/api/sessions/${session.id}/answers`, {
    method: "POST",
    headers: ownerHeaders,
    body: JSON.stringify(answer),
  });
  assert.equal(submitted.status, 200);
  assert.equal((await submitted.json()).data.status, "completed");
  const retry = await fetch(`${base}/api/sessions/${session.id}/answers`, {
    method: "POST",
    headers: ownerHeaders,
    body: JSON.stringify(answer),
  });
  assert.equal((await retry.json()).data.answers.length, 1);
  const report = await fetch(`${base}/api/sessions/${session.id}/report`, {
    headers: { Cookie: cookie },
  });
  assert.equal(report.status, 200);
  assert.equal((await report.json()).data.observations.count, 0);
  const crossOrigin = await fetch(`${base}/api/sessions`, {
    method: "POST",
    headers: { ...headers, Origin: "https://example.invalid" },
    body: "{}",
  });
  assert.equal(crossOrigin.status, 403);
  console.log(
    "HTTP smoke passed: create → owned session → answer → retry → report; ownership and Origin checks passed.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
