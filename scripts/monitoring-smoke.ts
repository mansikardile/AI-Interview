import assert from "node:assert/strict";

async function main() {
  const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
  const created = await fetch(`${base}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionCount: 1 }),
  });
  assert.equal(created.status, 201);
  const cookie = created.headers
    .getSetCookie()
    .find((value) => value.startsWith("iq_owner="))
    ?.split(";")[0];
  assert.ok(cookie);
  const headers = { "Content-Type": "application/json", Cookie: cookie };
  const { data: session } = await created.json();
  const url = `${base}/api/sessions/${session.id}`;
  const reviewRequest = (body: object, customHeaders = headers) =>
    fetch(`${url}/monitoring/review`, {
      method: "POST",
      headers: customHeaders,
      body: JSON.stringify(body),
    });
  assert.equal(
    (
      await reviewRequest({ allowMetadataTransfer: true }, {
        "Content-Type": "application/json",
      } as typeof headers)
    ).status,
    404,
  );
  assert.equal((await reviewRequest({ allowMetadataTransfer: false })).status, 400);
  // Never spend inference tokens in a smoke test. Only test explicit missing-config behavior.
  if (process.env.SMOKE_EXPECT_JARVIS_UNCONFIGURED === "true") {
    const unavailable = await reviewRequest({ allowMetadataTransfer: true });
    assert.equal(unavailable.status, 503);
    assert.equal((await unavailable.json()).error.code, "JARVIS_NOT_CONFIGURED");
  }
  const patch = (monitoring: object, customHeaders = headers) =>
    fetch(`${url}/monitoring`, {
      method: "PATCH",
      headers: customHeaders,
      body: JSON.stringify({ monitoring }),
    });
  assert.equal(
    (await patch({ camera: true }, { "Content-Type": "application/json" } as typeof headers))
      .status,
    404,
  );
  const event = {
    id: crypto.randomUUID(),
    source: "camera",
    type: "no_face",
    occurredAt: new Date().toISOString(),
    detail: "Synthetic HTTP contract test, not a real camera observation.",
  };
  const send = () =>
    fetch(`${url}/events`, { method: "POST", headers, body: JSON.stringify({ events: [event] }) });
  assert.equal((await send()).status, 403);
  assert.equal((await patch({ camera: true })).status, 200);
  assert.equal((await send()).status, 200);
  assert.equal((await send()).status, 200);
  assert.equal((await patch({ camera: false })).status, 200);
  assert.equal((await send()).status, 403);
  assert.equal(
    (
      await fetch(`${url}/answers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          submissionId: crypto.randomUUID(),
          questionId: session.activeQuestionId,
          text: "Use idempotency keys and persist results atomically.",
        }),
      })
    ).status,
    200,
  );
  const response = await fetch(`${url}/report`, { headers });
  assert.equal(response.status, 200);
  const report = (await response.json()).data;
  assert.equal(report.observations.count, 1);
  assert.equal(report.averageScores.correctness, 3);
  assert.equal((await patch({ camera: true })).status, 409);
  console.log(
    "Monitoring HTTP smoke passed: ownership → consent → observations → deduplication → revocation → separate report.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
