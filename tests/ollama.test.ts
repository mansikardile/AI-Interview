import { afterEach, describe, expect, it, vi } from "vitest";
import { ollamaBaseUrl, ollamaFetcher } from "../src/lib/ollama";
import { generateMonitoringReview } from "../src/modules/monitoring/jarvis-review";
afterEach(() => vi.unstubAllGlobals());
describe("local Ollama transport", () => {
  it.each([
    "http://remote.example/v1",
    "https://127.0.0.1/v1",
    "http://localhost/v1?secret=a",
    "http://user:password@localhost/v1",
  ])("rejects nonlocal/unsafe URL %s", (url) => {
    expect(() => ollamaBaseUrl(url)).toThrow();
  });
  it("uses native JSON/no-thinking transport without leaking cloud keys", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ done: true, message: { content: '{"ok":true}' } }));
    vi.stubGlobal("fetch", fetcher);
    const response = await ollamaFetcher("http://127.0.0.1:11434/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer cloud-secret" },
      body: JSON.stringify({
        model: "gemma4:test",
        messages: [],
        max_tokens: 100,
        temperature: 0.2,
      }),
    });
    expect((await response.json()).choices[0].message.content).toBe('{"ok":true}');
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:11434/api/chat");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toMatchObject({ think: false, stream: false, format: "json" });
    expect(init.redirect).toBe("error");
  });
  it("labels actual Ollama reviews without requiring Jarvis credentials", async () => {
    const id = crypto.randomUUID();
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  observations: [
                    {
                      eventIds: [id],
                      explanation: "Tab hidden",
                      alternativeExplanation: "Possibly checking permitted notes",
                    },
                  ],
                  practiceTips: ["Arrange notes first"],
                }),
              },
            },
          ],
        }),
      );
    const result = await generateMonitoringReview(
      [{ id, source: "focus", type: "page_hidden", occurredAt: new Date().toISOString() }],
      { provider: "ollama", model: "gemma4:test", fetcher },
    );
    expect(result.provider).toBe("ollama");
    expect(fetcher.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
  });
});
