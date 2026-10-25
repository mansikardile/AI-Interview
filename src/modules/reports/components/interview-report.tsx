"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { InterviewReport as Report } from "@/contracts";
import { api } from "@/lib/api-client";
import { clearLocalSessionData } from "@/lib/session-privacy";
import { PendingObservations, GemmaReview } from "@/modules/monitoring";

export function InterviewReport({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [actionError, setActionError] = useState("");
  const [localDataCleared, setLocalDataCleared] = useState(true);
  useEffect(() => {
    if (!deleteSuccess) return;
    const timer = setTimeout(() => router.replace("/"), 1500);
    return () => clearTimeout(timer);
  }, [deleteSuccess, router]);

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
      setLocalDataCleared(clearLocalSessionData(sessionId));
      setReport(null);
      setDeleteSuccess(true);
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
            This session was removed from app storage. Downloaded exports, other sessions, backups
            and provider-held data are not erased. Redirecting home…
          </p>
          {!localDataCleared && (
            <p role="alert">
              Browser storage could not be cleared. Remove this app's site data to clear local
              drafts and pending metadata.
            </p>
          )}
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
      {report.config && (
        <section className="panel stack">
          <h2>Interview context</h2>
          <p>
            {report.config.role} · {report.config.difficulty} · {report.answers.length} completed
            answers
          </p>
          <details>
            <summary>Original job description</summary>
            <p style={{ whiteSpace: "pre-wrap" }}>
              {report.config.jobDescription || "No job description supplied by the API client."}
            </p>
          </details>
          {report.config.practiceFocus && <p>Practice focus: {report.config.practiceFocus}</p>}
        </section>
      )}

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
      <PendingObservations sessionId={sessionId} />
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
              <h3>
                {report.questions?.find((question) => question.id === answer.questionId)?.text ||
                  "Interview question"}
              </h3>
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
              <p>
                <strong>Next practice:</strong> {answer.feedback.nextPractice}
              </p>
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
                disabled={isRetrying || isDeleting || showDeleteConfirm}
                onClick={handleStartRetry}
              >
                {isRetrying ? "Preparing round…" : "Start targeted practice round →"}
              </button>
            </div>
            <p className="small muted">
              A new round keeps your JD and focuses on these practice areas. Camera/audio consent
              and device access must be enabled again.
            </p>
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

            <div
              className="no-print"
              style={{ marginTop: "14px", borderTop: "1px solid #eef2f7", paddingTop: "14px" }}
            >
              <p className="small muted" style={{ marginBottom: "10px" }}>
                Candidate privacy: you can permanently delete this session from server storage at
                any time.
              </p>
              {!showDeleteConfirm ? (
                <button
                  className="button secondary danger-text"
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isRetrying || isDeleting}
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
      <GemmaReview sessionId={sessionId} />
    </main>
  );
}
