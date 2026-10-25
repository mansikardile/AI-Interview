import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { DomainError } from "@/lib/domain-error";

export async function ownerHash(create = false) {
  const jar = await cookies();
  let token = jar.get("iq_owner")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    if (!create)
      throw new DomainError("NOT_FOUND", "No interview session belongs to this browser yet.", 404);
    token = randomBytes(32).toString("hex");
    jar.set("iq_owner", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return createHash("sha256").update(token).digest("hex");
}

export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new DomainError("ORIGIN_REJECTED", "Cross-origin requests are not allowed.", 403);
}

export async function parseJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  assertOrigin(request);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new DomainError("INVALID_CONTENT_TYPE", "Send an application/json request.", 415);
  const raw = await request.text();
  if (raw.length > 100000) throw new DomainError("BODY_TOO_LARGE", "Request is too large.", 413);
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new DomainError("INVALID_JSON", "Send valid JSON.", 400);
  }
  return schema.parse(json);
}

export async function respond(action: () => Promise<unknown>, status = 200) {
  try {
    return NextResponse.json(
      { data: await action() },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "The request does not match the shared contract.",
            retryable: false,
          },
        },
        { status: 400 },
      );
    if (error instanceof DomainError)
      return NextResponse.json(
        { error: { code: error.code, message: error.message, retryable: error.retryable } },
        { status: error.status },
      );
    console.error(
      "InterviewIQ request failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "The request could not be completed.",
          retryable: true,
        },
      },
      { status: 500 },
    );
  }
}
