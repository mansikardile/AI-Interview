export async function confirmWorker(input: { sessionId: string }) {
  // Idempotent smoke activity. Add durable, scoped repository effects in D06.
  return { sessionId: input.sessionId, status: "worker-connected" as const };
}
