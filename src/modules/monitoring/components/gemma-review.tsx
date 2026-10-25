"use client";
import { useState } from "react";
import { monitoringReviewSchema, type MonitoringReview } from "@/contracts/monitoring-review";

export function GemmaReview({ sessionId }: { sessionId: string }) {
  const [allowed, setAllowed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState<MonitoringReview | null>(null);
  async function generate() {
    setPending(true);
    setError("");
    setReview(null);
    try {
      const response = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/monitoring/review`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(125000),
          body: JSON.stringify({ allowMetadataTransfer: true }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Review unavailable.");
      setReview(monitoringReviewSchema.parse(result.data));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Review unavailable.");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="panel stack">
      <h2>Gemma 4 practice-conditions review</h2>
      <p className="muted">
        Gemma interprets saved observations, not video or audio. Reviews are generated on request
        and are not saved. The server uses local Ollama for testing or paid JarvisLabs inference in
        Jarvis mode.
      </p>
      <label>
        <input
          type="checkbox"
          checked={allowed}
          disabled={pending}
          onChange={(e) => setAllowed(e.target.checked)}
        />{" "}
        Allow sending the latest 100 saved event IDs, types, timestamps and durations to the
        configured model (local Ollama or JarvisLabs). No recordings, answers or free-text event
        details are sent.
      </label>
      <button className="button" disabled={!allowed || pending} onClick={() => void generate()}>
        {pending ? "Asking Gemma 4…" : "Generate Gemma review"}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {review && (
        <div className="stack">
          <p className="eyebrow">
            Live · {review.provider} · {review.model} · {review.eventCount} observations
          </p>
          {review.observations.map((item, i) => (
            <div key={i}>
              <p>{item.explanation}</p>
              <p className="muted">Possible alternative: {item.alternativeExplanation}</p>
              <details>
                <summary>Referenced observation IDs</summary>
                <ul>
                  {item.eventIds.map((id) => (
                    <li key={id}>
                      <code>{id}</code>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          ))}
          <ul>
            {review.practiceTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
          <p className="notice">{review.limitation}</p>
        </div>
      )}
    </section>
  );
}
