import "server-only";
import { Pool } from "pg";
import {
  JarvisIntelligence,
  OllamaIntelligence,
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
  if (provider === "ollama") {
    if (!process.env.OLLAMA_MODEL)
      throw new DomainError(
        "CONFIGURATION_ERROR",
        "Set OLLAMA_MODEL to an installed Gemma 4 model.",
        503,
      );
    return new OllamaIntelligence({
      baseUrl: process.env.OLLAMA_BASE_URL,
      model: process.env.OLLAMA_MODEL,
    });
  }
  if (
    provider !== "jarvis" ||
    !process.env.JARVISLABS_API_KEY ||
    !process.env.JARVISLABS_MODEL ||
    !/gemma[-_ ]?4/i.test(process.env.JARVISLABS_MODEL)
  )
    throw new DomainError(
      "CONFIGURATION_ERROR",
      "Configure AI_PROVIDER=jarvis, the server-side API key and exact Gemma 4 model ID from JarvisLabs, then restart the app.",
      503,
    );
  return new JarvisIntelligence({
    apiKey: process.env.JARVISLABS_API_KEY,
    baseUrl: process.env.JARVISLABS_BASE_URL ?? "https://models.jarvislabs.net/v1",
    model: process.env.JARVISLABS_MODEL,
    timeoutMs: 60000,
    structuredOutput: true,
    disableThinking: true,
  });
}

export function getRuntime(): Runtime {
  if (globalRuntime.interviewIqRuntime) {
    // Route bundles/HMR can have different class identities. Only the repository is safe to reuse.
    const repository = globalRuntime.interviewIqRuntime.repository;
    const intelligence = getIntelligence();
    return { repository, intelligence, service: new SessionService(repository, intelligence) };
  }
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
