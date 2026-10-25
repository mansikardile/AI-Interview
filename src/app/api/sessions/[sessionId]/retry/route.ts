import { idSchema } from "@/contracts";
import { assertOrigin, getRuntime, ownerHash, respond } from "@/modules/platform";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  return respond(async () => {
    assertOrigin(request);
    return getRuntime().service.createRetryRound(
      await ownerHash(),
      idSchema.parse((await context.params).sessionId),
    );
  }, 201);
}
