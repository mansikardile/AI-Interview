import { ollamaBaseUrl, ollamaFetcher } from "@/lib/ollama";
import { DomainError } from "@/lib/domain-error";
import { JarvisIntelligence } from "./jarvis";

export class OllamaIntelligence extends JarvisIntelligence {
  constructor(options: { baseUrl?: string; model: string }) {
    if (!/^gemma[-_ ]?4/i.test(options.model))
      throw new DomainError("GEMMA_REQUIRED", "Configure an installed Gemma 4 Ollama model.", 503);
    super({
      apiKey: "ollama",
      baseUrl: ollamaBaseUrl(options.baseUrl),
      model: options.model,
      fetcher: ollamaFetcher,
      timeoutMs: 120000,
    });
  }
}
