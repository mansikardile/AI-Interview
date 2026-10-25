"use client";
import { useEffect, useState } from "react";
import type { MonitoringEvent } from "@/contracts";
import { pendingStorageKey, readPendingEvents } from "../event-queue";
import { downloadObservations } from "../export";

export function PendingObservations({ sessionId }: { sessionId: string }) {
  const [events, setEvents] = useState<MonitoringEvent[]>([]);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        try {
          setEvents(readPendingEvents(window.sessionStorage, sessionId));
        } catch {}
      }
    });
    return () => {
      active = false;
    };
  }, [sessionId]);
  if (!events.length) return null;
  return (
    <section className="notice" role="status">
      <p>
        {events.length} observation(s) were not saved before this interview ended. They are stored
        in this tab only and are not included in the report.
      </p>
      <div className="row">
        <button
          className="text-link"
          type="button"
          onClick={() => downloadObservations(events, `interviewiq-unsaved-${sessionId}.json`)}
        >
          Export unsaved metadata
        </button>
        <button
          className="text-link"
          type="button"
          onClick={() => {
            try {
              sessionStorage.removeItem(pendingStorageKey(sessionId));
            } catch {}
            setEvents([]);
          }}
        >
          Discard local metadata
        </button>
      </div>
    </section>
  );
}
