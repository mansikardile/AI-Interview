import { afterEach, describe, expect, it, vi } from "vitest";
import { ollamaBaseUrl, ollamaFetcher } from "../src/lib/ollama";
import { generateMonitoringReview } from "../src/modules/monitoring/jarvis-review";
import { OllamaIntelligence } from "../src/modules/intelligence/ollama";
import { MockIntelligence } from "../src/modules/intelligence/mock";
import { fixtureSession } from "../src/fixtures/interview";
afterEach(() => vi.unstubAllGlobals());
describe("local Ollama transport", () => {
  it("requests the merged rubric assessment schema with top-level follow-up", async () => {
    const answer = {
      submissionId: crypto.randomUUID(),
      questionId: fixtureSession.activeQuestionId!,
      text: "I use an idempotency key and an atomic transaction.",
    };
    const assessment = await new MockIntelligence().assessAnswer(fixtureSession, answer);
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({
          done: true,
          message: {
            content: JSON.stringify({
              feedback: assessment.feedback,
              nextQuestion: {
                text: assessment.nextQuestion.text,
                topic: assessment.nextQuestion.topic,
              },
            }),
          },
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    const result = await new OllamaIntelligence({ model: "gemma4:test" }).assessAnswer(
      fixtureSession,
      answer,
    );
    expect(answer.text).toContain(result.feedback.evidenceQuote);
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.format.properties).toHaveProperty("feedback");
    expect(body.format.properties).toHaveProperty("nextQuestion");
    expect(body.format.required).toEqual(["feedback", "nextQuestion"]);
  });
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
    const fetcher = vi.fn().mockResolvedValue(
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
