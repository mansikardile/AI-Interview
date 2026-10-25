"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { InterviewReport as Report } from "@/contracts";
import { api } from "@/lib/api-client";

export function InterviewReport({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .getReport(sessionId)
      .then((value) => {
        if (active) setReport(value);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Report unavailable.");
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  const handleExportJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = url;
    downloadAnchor.download = `interview-report-${report.role}-${report.sessionId.slice(0, 8)}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStartRetry = async () => {
    try {
      setIsRetrying(true);
      setActionError("");
      const retrySession = await api.createRetryRound(sessionId);
      router.push(`/interview/${retrySession.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create practice round.");
      setIsRetrying(false);
    }
  };

  const handleDeleteSession = async () => {
    try {
      setIsDeleting(true);
      setActionError("");
      await api.deleteSession(sessionId);
      setDeleteSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete session.");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (deleteSuccess) {
    return (
      <main className="container">
        <section className="panel stack">
          <h1>Session Data Deleted</h1>
          <p className="muted">
            Your interview session and feedback records have been permanently removed. Redirecting
            to home…
          </p>
          <Link className="button" href="/">
            Go to Home
          </Link>
        </section>
      </main>
    );
  }

  if (!report) {
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
  }

  return (
    <main className="container stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Your {report.role} practice report</p>
          <h1 className="room-title">Know what to practice next.</h1>
        </div>
        <div className="row no-print">
          <button className="button secondary" type="button" onClick={handleExportJson}>
            Export JSON
          </button>
          <button className="button secondary" type="button" onClick={handlePrint}>
            Print / PDF
          </button>
          <Link className="button secondary" href="/">
            New interview
          </Link>
        </div>
      </div>

      {actionError && (
        <p className="error no-print" role="alert">
          {actionError}
        </p>
      )}

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
          <section className="panel accent stack">
            <div>
              <p className="eyebrow">Your next round</p>
              <h2>Targeted practice</h2>
            </div>
            <ul>
              {report.practicePlan.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
            <div className="no-print">
              <button
                className="button"
                type="button"
                disabled={isRetrying}
                onClick={handleStartRetry}
              >
                {isRetrying ? "Preparing round…" : "Start targeted practice round →"}
              </button>
            </div>
          </section>

          <section className="panel stack">
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

            <div className="no-print" style={{ marginTop: "14px", borderTop: "1px solid #eef2f7", paddingTop: "14px" }}>
              <p className="small muted" style={{ marginBottom: "10px" }}>
                Candidate privacy: you can permanently delete this session from server storage at any time.
              </p>
              {!showDeleteConfirm ? (
                <button
                  className="button secondary danger-text"
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete session data
                </button>
              ) : (
                <div className="stack" style={{ gap: "8px" }}>
                  <p className="small" style={{ color: "#b91c1c", fontWeight: 600 }}>
                    Are you sure? This cannot be undone.
                  </p>
                  <div className="row">
                    <button
                      className="button danger"
                      type="button"
                      disabled={isDeleting}
                      onClick={handleDeleteSession}
                    >
                      {isDeleting ? "Deleting…" : "Confirm delete"}
                    </button>
                    <button
                      className="button secondary"
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

