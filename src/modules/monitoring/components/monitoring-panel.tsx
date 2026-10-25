"use client";

import { useEffect, useRef } from "react";
import type { MonitoringConsent, MonitoringEvent } from "@/contracts";

export type MonitoringPanelProps = {
  consent: MonitoringConsent;
  events: MonitoringEvent[];
  onEvents: (events: MonitoringEvent[]) => void;
  active: boolean;
};

export function MonitoringPanel({ consent, events, onEvents, active }: MonitoringPanelProps) {
  const callback = useRef(onEvents);
  useEffect(() => {
    callback.current = onEvents;
  }, [onEvents]);

  useEffect(() => {
    if (!consent.focus || !active) return;
    let hiddenAt: number | null = document.hidden ? performance.now() : null;
    function observe() {
      const hidden = document.hidden;
      const durationMs =
        !hidden && hiddenAt !== null
          ? Math.min(86400000, Math.max(0, Math.round(performance.now() - hiddenAt)))
          : undefined;
      hiddenAt = hidden ? performance.now() : null;
      callback.current([
        {
          id: crypto.randomUUID(),
          source: "focus",
          type: hidden ? "page_hidden" : "page_visible",
          occurredAt: new Date().toISOString(),
          ...(durationMs === undefined ? {} : { durationMs }),
        },
      ]);
    }
    document.addEventListener("visibilitychange", observe);
    return () => document.removeEventListener("visibilitychange", observe);
  }, [consent.focus, active]);

  return (
    <section className="panel" aria-labelledby="monitoring-heading">
      <p className="eyebrow">Optional practice conditions</p>
      <h2 id="monitoring-heading">Session observations</h2>
      <p className="muted">
        These observations do not change your technical feedback or establish outside assistance.
      </p>
      <ul className="status-list">
        <li>
          <span>Page visibility</span>
          <span className="badge">{consent.focus && active ? "Observing" : "Off"}</span>
        </li>
        <li>
          <span>Camera detection</span>
          <span className="badge">To build · C</span>
        </li>
        <li>
          <span>Audio activity</span>
          <span className="badge">To build · C</span>
        </li>
      </ul>
      <p className="small muted">No camera or microphone is accessed by this starter.</p>
      {events.length > 0 ? (
        <ol className="timeline">
          {events.slice(-8).map((event) => (
            <li key={event.id}>
              <span>{event.type.replaceAll("_", " ")}</span>
              <small>
                {new Date(event.occurredAt).toLocaleTimeString()}
                {event.durationMs !== undefined
                  ? ` · ${(event.durationMs / 1000).toFixed(1)}s away`
                  : ""}
              </small>
            </li>
          ))}
        </ol>
      ) : (
        <p className="small muted">No observations recorded.</p>
      )}
    </section>
  );
}
