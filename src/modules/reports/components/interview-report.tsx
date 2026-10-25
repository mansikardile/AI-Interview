"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { InterviewReport as Report } from "@/contracts";
import { api } from "@/lib/api-client";

export function InterviewReport({ sessionId }: { sessionId: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api
      .getReport(sessionId)
      .then((value) => {
        if (active) setReport(value);
      })
      .catch((error) => {
        if (active) setError(error instanceof Error ? error.message : "Report unavailable.");
      });
    return () => {
      active = false;
    };
  }, [sessionId]);
  if (!report)
    return (
      <main className="container">
        <section className="panel">
          <h1>{error ? "Report unavailable" : "Opening your report…"}</h1>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Link href={`/interview/${sessionId}`}>Return to interview</Link>
        </section>
      </main>
    );
  return (
    <main className="container stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Your {report.role} practice report</p>
          <h1 className="room-title">Know what to practice next.</h1>
        </div>
        <Link className="button" href="/">
          New interview →
        </Link>
      </div>
      {report.mode === "mock" && (
        <p className="notice">
          Demo report: feedback and scores are fixed placeholders for development. They do not
          measure your interview ability.
        </p>
      )}
      <div className="score-grid">
        {Object.entries(report.averageScores).map(([key, value]) => (
          <section className="panel" key={key}>
            <p className="eyebrow">{key}</p>
            <p className="score">
              {value}
              <small> / 5</small>
            </p>
            <p className="small muted">
              {report.mode === "mock" ? "Placeholder" : "AI practice feedback"}
            </p>
          </section>
        ))}
      </div>
      <div className="two-column">
        <div className="stack">
          {report.answers.map((answer, index) => (
            <section className="panel stack" key={answer.submissionId}>
              <h2>Answer {index + 1}</h2>
              <p className="muted">{answer.text}</p>
              <blockquote>“{answer.feedback.evidenceQuote}”</blockquote>
              <div>
                <h3>What worked</h3>
                <ul>
                  {answer.feedback.strengths.map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>What to develop</h3>
                <ul>
                  {answer.feedback.gaps.map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
        <aside className="stack">
          <section className="panel accent">
            <p className="eyebrow">Your next round</p>
            <h2>Targeted practice</h2>
            <ul>
              {report.practicePlan.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h2>Session observations</h2>
            <p>
              {report.observations.count} event{report.observations.count === 1 ? "" : "s"}{" "}
              recorded.
            </p>
            <p className="muted">{report.observations.notice}</p>
            <ul>
              {report.observations.events.slice(-10).map((event) => (
                <li key={event.id}>
                  {event.type.replaceAll("_", " ")}
                  {event.durationMs === undefined
                    ? ""
                    : ` · ${(event.durationMs / 1000).toFixed(1)}s`}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
