import { Client, Connection } from "@temporalio/client";

async function main() {
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
  });
  try {
    const client = new Client({
      connection,
      namespace: process.env.TEMPORAL_NAMESPACE ?? "default",
    });
    const result = await client.workflow.execute("interviewConnectivityProbe", {
      workflowId: `interviewiq-probe-${crypto.randomUUID()}`,
      taskQueue: process.env.TEMPORAL_TASK_QUEUE ?? "interviewiq",
      args: [{ sessionId: crypto.randomUUID() }],
      workflowExecutionTimeout: "30 seconds",
    });
    console.log("Temporal connectivity probe completed:", result);
  } finally {
    await connection.close();
  }
}
main().catch(() => {
  console.error("Temporal smoke failed. Start the server and npm run worker:dev first.");
  process.exitCode = 1;
});
