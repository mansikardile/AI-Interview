"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { InterviewConfig } from "@/contracts";
import { api } from "@/lib/api-client";
import { MonitoringConsentFields } from "@/modules/monitoring";

export function InterviewSetup() {
  const router = useRouter();
  const [config, setConfig] = useState<InterviewConfig>({
    role: "backend",
    difficulty: "mid",
    jobDescription: "",
    questionCount: 3,
    monitoring: { focus: false, camera: false, audio: false },
  });
  const [mode, setMode] = useState({ ai: "loading", storage: "loading" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"context" | "consent">("context");
  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then(({ data }) => setMode(data))
      .catch(() => setMode({ ai: "unavailable", storage: "unavailable" }));
  }, []);

  async function start(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!config.jobDescription.trim()) {
      setError("Add the job description first so your interview has the right context.");
      return;
    }
    if (step === "context") {
      setStep("consent");
      return;
    }
    setPending(true);
    if (!config.monitoring.camera || !config.monitoring.audio) {
      setError(
        "Camera and microphone consent are required. Allow both to continue to browser permissions.",
      );
      setPending(false);
      return;
    }
    try {
      const session = await api.createSession({
        ...config,
        jobDescription: config.jobDescription.trim(),
      });
      router.push(`/interview/${session.id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not start the interview.");
      setPending(false);
    }
  }

  return (
    <main className="container">
      <div className="hero">
        <p className="eyebrow">Your next interview starts here</p>
        <h1>
          Practice the answer.
          <br />
          <span>Understand the why.</span>
        </h1>
        <p className="lead">
          A mock interviewer that follows your reasoning, challenges your assumptions, and helps you
          know what to practice next.
        </p>
        <div className="row">
          <span className="badge">AI: {mode.ai === "loading" ? "checking…" : mode.ai}</span>
          <span className="badge">
            Storage: {mode.storage === "loading" ? "checking…" : mode.storage}
          </span>
          <span className="badge">Candidate-controlled practice</span>
        </div>
      </div>
      <div className="two-column">
        <form className="panel stack" onSubmit={start}>
          <div>
            <p className="eyebrow">
              {step === "context" ? "01 / Job context" : "02 / Consent and device permissions"}
            </p>
            <h2>
              {step === "context"
                ? "Start with your job description"
                : "Prepare your interview devices"}
            </h2>
          </div>
          {step === "context" ? (
            <>
              <label>
                Job description · required
                <textarea
                  required
                  maxLength={8000}
                  rows={5}
                  placeholder="Paste the job description and responsibilities you want to practice…"
                  value={config.jobDescription}
                  onChange={(event) => setConfig({ ...config, jobDescription: event.target.value })}
                />
              </label>
              <div className="form-grid">
                <label>
                  Interview track
                  <select
                    value={config.role}
                    onChange={(event) =>
                      setConfig({ ...config, role: event.target.value as InterviewConfig["role"] })
                    }
                  >
                    <option value="backend">Backend engineering</option>
                    <option value="frontend">Frontend engineering</option>
                    <option value="sre">Site reliability engineering</option>
                  </select>
                </label>
                <label>
                  Experience level
                  <select
                    value={config.difficulty}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        difficulty: event.target.value as InterviewConfig["difficulty"],
                      })
                    }
                  >
                    <option value="junior">Junior</option>
                    <option value="mid">Mid-level</option>
                    <option value="senior">Senior</option>
                  </select>
                </label>
              </div>
              <label>
                Questions, including follow-ups
                <select
                  value={config.questionCount}
                  onChange={(event) =>
                    setConfig({ ...config, questionCount: Number(event.target.value) })
                  }
                >
                  {[1, 2, 3, 4, 5].map((count) => (
                    <option key={count} value={count}>
                      {count} question{count === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <p>
                {config.role} · {config.difficulty} · {config.questionCount} questions including
                follow-ups
              </p>
              <details>
                <summary>Review job description</summary>
                <p style={{ whiteSpace: "pre-wrap" }}>{config.jobDescription}</p>
              </details>
              <p>
                The next room requests camera and microphone access only when you click each start
                button. Once both are ready, your JD-based interview unlocks.
              </p>
              <MonitoringConsentFields
                required
                value={config.monitoring}
                disabled={pending}
                onChange={(monitoring) => setConfig({ ...config, monitoring })}
              />
              <button
                type="button"
                className="button secondary"
                disabled={pending}
                onClick={() => {
                  setStep("context");
                  setError("");
                }}
              >
                Back to job context
              </button>
            </>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="button" disabled={pending}>
            {pending
              ? "Preparing your JD-based session…"
              : step === "context"
                ? "Continue to consent →"
                : "Create interview and enable devices →"}
          </button>
          <p className="small muted">
            Camera and microphone access are required for saved interviews. Typed answers are
            available. Browser-supported dictation produces editable text, and questions can be read
            aloud. Diagram interviewing remains deferred.
          </p>
        </form>
        <aside className="stack">
          <section className="panel accent">
            <p className="eyebrow">More than a question bank</p>
            <h2>“What happens if two retries arrive together?”</h2>
            <p>
              A follow-up should test how you apply your answer. Your report should point to what
              you actually said.
            </p>
          </section>
          <section className="panel">
            <p className="eyebrow">Developer starting points</p>
            <h2>Four modules. One contract.</h2>
            <ul className="plain-list">
              <li>A · Interview experience</li>
              <li>B · AI interviewer and feedback</li>
              <li>C · Camera, audio and focus</li>
              <li>D · Platform, reports and integrations</li>
            </ul>
            <Link className="text-link" href="/interview/demo">
              Open the independent fixture room →
            </Link>
          </section>
          <p className="notice">
            Default mode uses deterministic fixture feedback and temporary memory storage. Its
            placeholder scores do not measure your ability. Use the documented live provider to
            develop real feedback.
          </p>
        </aside>
      </div>
    </main>
  );
}
