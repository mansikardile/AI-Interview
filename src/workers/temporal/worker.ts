import path from "node:path";
import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities";

async function main() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
  });
  try {
    const worker = await Worker.create({
      connection,
      namespace: process.env.TEMPORAL_NAMESPACE ?? "default",
      taskQueue: process.env.TEMPORAL_TASK_QUEUE ?? "interviewiq",
      workflowsPath: path.resolve("src/workers/temporal/workflows.ts"),
      activities,
    });
    console.log(
      "InterviewIQ Temporal worker ready. Run npm run temporal:smoke in another terminal.",
    );
    await worker.run();
  } finally {
    await connection.close();
  }
}
main().catch(() => {
  console.error("Worker failed. Check the Temporal server/address and worker logs.");
  process.exitCode = 1;
});
