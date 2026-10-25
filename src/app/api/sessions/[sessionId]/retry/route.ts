import { idSchema } from "@/contracts";
import { assertOrigin, getRuntime, ownerHash, respond } from "@/modules/platform";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  assertOrigin(request);
  return respond(async () =>
    getRuntime().service.createRetryRound(
      await ownerHash(true),
      idSchema.parse((await context.params).sessionId),
    ),
    201,
  );
}
