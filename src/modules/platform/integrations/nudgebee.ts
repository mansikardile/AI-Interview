import "server-only";

export async function checkNudgebeeHealth() {
  const baseUrl = process.env.NUDGEBEE_BASE_URL;
  if (!baseUrl)
    return {
      configured: false,
      reachable: false,
      note: "Optional incident lab is not configured.",
    };
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    return {
      configured: true,
      reachable: response.ok,
      note: "Liveness only; tenant authentication and incident-lab execution are not implemented.",
    };
  } catch {
    return {
      configured: true,
      reachable: false,
      note: "The configured Nudgebee service could not be reached.",
    };
  }
}
