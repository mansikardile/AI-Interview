"use client";

import Link from "next/link";

export type SessionLoadPhase = "loading" | "reconnecting" | "error" | "ready";

export function SessionLoadingPanel({ phase }: { phase: "loading" | "reconnecting" }) {
  return (
    <main className="container">
      <section className="panel stack" aria-busy="true" aria-live="polite">
        <p className="eyebrow">{phase === "reconnecting" ? "Reconnecting" : "Loading"}</p>
        <h1>{phase === "reconnecting" ? "Restoring your interview…" : "Opening your interview…"}</h1>
        <div className="skeleton-stack" aria-hidden="true">
          <div className="skeleton line wide" />
          <div className="skeleton line" />
          <div className="skeleton block" />
        </div>
        <p className="muted small">
          {phase === "reconnecting"
            ? "Network hiccup — retrying without losing your drafted answer."
            : "Fetching the latest session state for this browser."}
        </p>
      </section>
    </main>
  );
}

export function SessionErrorPanel({
  title,
  message,
  retryable,
  onRetry,
}: {
  title: string;
  message: string;
  retryable: boolean;
  onRetry?: () => void;
}) {
  return (
    <main className="container">
      <section className="panel stack">
        <p className="eyebrow">Interview status</p>
        <h1>{title}</h1>
        <p role="alert" className="error">
          {message}
        </p>
        <div className="row">
          {retryable && onRetry && (
            <button type="button" className="button" onClick={onRetry}>
              Retry connection
            </button>
          )}
          <Link className="button secondary" href="/">
            Back to setup
          </Link>
        </div>
      </section>
    </main>
  );
}

export function ReconnectBanner({
  message,
  onRetry,
  busy,
}: {
  message: string;
  onRetry: () => void;
  busy?: boolean;
}) {
  return (
    <div className="reconnect-banner" role="status">
      <p>{message}</p>
      <button type="button" className="button secondary" disabled={busy} onClick={onRetry}>
        {busy ? "Retrying…" : "Retry now"}
      </button>
    </div>
  );
}
