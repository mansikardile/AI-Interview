import { idSchema } from "@/contracts";
import { getRuntime, ownerHash, respond } from "@/modules/platform";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  return respond(async () =>
    getRuntime().service.get(await ownerHash(), idSchema.parse((await context.params).sessionId)),
  );
}
