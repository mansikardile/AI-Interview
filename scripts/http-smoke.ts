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

  // Test targeted practice retry round creation
  const retryRound = await fetch(`${base}/api/sessions/${session.id}/retry`, {
    method: "POST",
    headers: ownerHeaders,
  });
  assert.equal(retryRound.status, 201, "Targeted practice round created");
  const { data: retrySession } = await retryRound.json();
  assert.ok(retrySession.id && retrySession.id !== session.id, "Retry session has unique ID");
  assert.equal(retrySession.status, "in_progress", "Retry session is in progress");

  // Test session deletion
  const deleted = await fetch(`${base}/api/sessions/${session.id}`, {
    method: "DELETE",
    headers: ownerHeaders,
  });
  assert.equal(deleted.status, 200, "Session deleted successfully");
  assert.equal((await deleted.json()).data.deleted, true);

  // Verify deleted session is gone
  const afterDelete = await fetch(`${base}/api/sessions/${session.id}`, {
    headers: ownerHeaders,
  });
  assert.equal(afterDelete.status, 404, "Deleted session returns 404");

  const crossOrigin = await fetch(`${base}/api/sessions`, {
    method: "POST",
    headers: { ...headers, Origin: "https://example.invalid" },
    body: "{}",
  });
  assert.equal(crossOrigin.status, 403);
  console.log(
    "HTTP smoke passed: create → owned session → answer → retry → report → targeted retry round → deletion; ownership and Origin checks passed.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
