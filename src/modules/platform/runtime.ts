import "server-only";
import { Pool } from "pg";
import {
  JarvisIntelligence,
  MockIntelligence,
  type InterviewIntelligence,
} from "@/modules/intelligence";
import { DomainError } from "@/lib/domain-error";
import { MemorySessionRepository, type SessionRepository } from "./repository";
import { PostgresSessionRepository } from "./postgres";
import { SessionService } from "./session-service";

type Runtime = {
  repository: SessionRepository;
  intelligence: InterviewIntelligence;
  service: SessionService;
};
const globalRuntime = globalThis as typeof globalThis & { interviewIqRuntime?: Runtime };

export function getIntelligence(): InterviewIntelligence {
  const provider = process.env.AI_PROVIDER ?? "mock";
  if (provider === "mock") return new MockIntelligence();
  if (provider !== "jarvis" || !process.env.JARVISLABS_API_KEY)
    throw new DomainError(
      "CONFIGURATION_ERROR",
      "Configure AI_PROVIDER and the server-side model key, then restart the app.",
      503,
    );
  return new JarvisIntelligence({
    apiKey: process.env.JARVISLABS_API_KEY,
    baseUrl: process.env.JARVISLABS_BASE_URL ?? "https://models.jarvislabs.net/v1",
    model: process.env.JARVISLABS_MODEL ?? "gemma-4-26b-a4b-it",
  });
}

export function getRuntime(): Runtime {
  if (globalRuntime.interviewIqRuntime) return globalRuntime.interviewIqRuntime;
  const storage = process.env.SESSION_STORE ?? "memory";
  if (storage !== "memory" && storage !== "postgres")
    throw new DomainError("CONFIGURATION_ERROR", "SESSION_STORE must be memory or postgres.", 503);
  if (storage === "postgres" && !process.env.DATABASE_URL)
    throw new DomainError(
      "CONFIGURATION_ERROR",
      "Set DATABASE_URL before enabling PostgreSQL.",
      503,
    );
  const repository =
    storage === "postgres"
      ? new PostgresSessionRepository(
          new Pool({ connectionString: process.env.DATABASE_URL, max: 5 }),
        )
      : new MemorySessionRepository();
  const intelligence = getIntelligence();
  globalRuntime.interviewIqRuntime = {
    repository,
    intelligence,
    service: new SessionService(repository, intelligence),
  };
  return globalRuntime.interviewIqRuntime;
}
