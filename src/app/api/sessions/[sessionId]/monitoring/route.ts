import { idSchema, updateMonitoringConsentSchema } from "@/contracts";
import { getRuntime, ownerHash, parseJson, respond } from "@/modules/platform";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  return respond(async () => {
    const { monitoring } = await parseJson(request, updateMonitoringConsentSchema);
    return getRuntime().service.updateMonitoringConsent(
      await ownerHash(),
      idSchema.parse((await context.params).sessionId),
      monitoring,
    );
  });
}
