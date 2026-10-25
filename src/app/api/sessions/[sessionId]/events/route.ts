import { idSchema, monitoringBatchSchema } from "@/contracts";
import { getRuntime, ownerHash, parseJson, respond } from "@/modules/platform";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  return respond(async () => {
    const input = await parseJson(request, monitoringBatchSchema);
    const session = await getRuntime().service.addEvents(
      await ownerHash(),
      idSchema.parse((await context.params).sessionId),
      input.events,
    );
    return { accepted: true, revision: session.revision };
  });
}
