import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "./activities";

const { confirmWorker } = proxyActivities<typeof activities>({
  startToCloseTimeout: "10 seconds",
  retry: { maximumAttempts: 3 },
});

// This is a connectivity foundation, not the finished interview lifecycle.
export async function interviewConnectivityProbe(input: { sessionId: string }) {
  return confirmWorker(input);
}
