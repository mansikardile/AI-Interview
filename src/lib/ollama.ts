import { DomainError } from "./domain-error";

export function ollamaBaseUrl(value = "http://127.0.0.1:11434/v1") {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname.replace(/\/$/, "") !== "/v1"
  ) {
    throw new DomainError(
      "CONFIGURATION_ERROR",
      "Local Ollama requires a loopback HTTP URL ending in /v1.",
      503,
    );
  }
  return url.toString().replace(/\/$/, "");
}

/** Same output validator, Ollama's explicit no-thinking JSON transport. */
export const ollamaFetcher: typeof fetch = async (input, init) => {
  const url = new URL(String(input));
  ollamaBaseUrl(`${url.origin}/v1`);
  const request = JSON.parse(String(init?.body));
  const response = await fetch(`${url.origin}/api/chat`, {
    ...init,
    headers: { "Content-Type": "application/json" },
    redirect: "error",
    body: JSON.stringify({
      model: request.model,
      messages: request.messages,
      stream: false,
      think: false,
      format: request.response_format?.json_schema?.schema ?? "json",
      options: { temperature: request.temperature, num_predict: request.max_tokens },
    }),
  });
  if (!response.ok) return response;
  const raw = await response.text();
  if (raw.length > 64000) throw new Error("Oversized Ollama response");
  const body = JSON.parse(raw);
  if (body.done_reason === "length") throw new Error("Truncated Ollama response");
  return Response.json({ choices: [{ message: body.message }] });
};
