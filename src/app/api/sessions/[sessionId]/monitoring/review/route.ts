import { z } from "zod";
import { idSchema } from "@/contracts";
import { generateMonitoringReview } from "@/modules/monitoring/server";
import { getRuntime, ownerHash, parseJson, respond } from "@/modules/platform";

export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  return respond(async () => {
    await parseJson(request, z.object({ allowMetadataTransfer: z.literal(true) }).strict());
    const session = await getRuntime().service.get(
      await ownerHash(),
      idSchema.parse((await context.params).sessionId),
    );
    const local = process.env.AI_PROVIDER === "ollama";
    return generateMonitoringReview(
      session.events,
      local
        ? {
            provider: "ollama",
            baseUrl: process.env.OLLAMA_BASE_URL,
            model: process.env.OLLAMA_MODEL,
          }
        : {
            apiKey: process.env.JARVISLABS_API_KEY,
            baseUrl: process.env.JARVISLABS_BASE_URL,
            model: process.env.JARVISLABS_MODEL,
          },
    );
  });
}
