import { createSessionSchema } from "@/contracts";
import { getRuntime, ownerHash, parseJson, respond } from "@/modules/platform";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return respond(async () => {
    const config = await parseJson(request, createSessionSchema);
    return getRuntime().service.create(await ownerHash(true), config);
  }, 201);
}
