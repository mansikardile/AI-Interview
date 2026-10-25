import { idSchema, submitAnswerSchema } from "@/contracts";
import { getRuntime, ownerHash, parseJson, respond } from "@/modules/platform";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  return respond(async () => {
    const input = await parseJson(request, submitAnswerSchema);
    return getRuntime().service.answer(
      await ownerHash(),
      idSchema.parse((await context.params).sessionId),
      input,
    );
  });
}
