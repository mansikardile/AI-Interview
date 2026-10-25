export async function GET() {
  return Response.json(
    {
      data: {
        status: "ok",
        contractVersion: 1,
        ai: process.env.AI_PROVIDER ?? "mock",
        storage: process.env.SESSION_STORE ?? "memory",
        temporal: "scaffold-only",
        nudgebee: "optional-scaffold",
        media: "local-face-and-speech-activity",
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
