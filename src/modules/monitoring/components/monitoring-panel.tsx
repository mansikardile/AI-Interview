"use client";
import Link from "next/link";

import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type Ref,
} from "react";
import type { MonitoringConsent, MonitoringEvent } from "@/contracts";
import { MonitoringController } from "../controller";
import { MonitoringEventQueue } from "../event-queue";
import { downloadObservations } from "../export";
import { requiredMediaReady } from "../readiness";
import styles from "./monitoring.module.css";

export type MonitoringHandle = {
  isReady(): boolean;
  finish(): Promise<boolean>;
  resume(): void;
  getMicrophoneStream(): MediaStream | null;
  setPlaybackActive(active: boolean): void;
};
export type MonitoringPanelProps = {
  sessionId: string;
  consent: MonitoringConsent;
  events: MonitoringEvent[];
  onEvents: (events: MonitoringEvent[], signal?: AbortSignal) => void | Promise<void>;
  onConsentChange?: (consent: MonitoringConsent) => Promise<void>;
  active: boolean;
  playbackActive?: boolean;
  required?: boolean;
  onReadinessChange?: (ready: boolean) => void;
  ref?: Ref<MonitoringHandle>;
};

export function MonitoringPanel({
  sessionId,
  consent,
  events,
  onEvents,
  onConsentChange,
  active,
  playbackActive = false,
  required = false,
  onReadinessChange,
  ref,
}: MonitoringPanelProps) {
  const video = useRef<HTMLVideoElement>(null);
  const [localEvents, setLocalEvents] = useState<MonitoringEvent[]>([]);
  const [pendingConsent, setPendingConsent] = useState(false);
  const [error, setError] = useState("");
  const [queue] = useState(
    () =>
      new MonitoringEventQueue(sessionId, async (batch, signal) => {
        await onEvents(batch, signal);
      }),
  );
  const [controller] = useState(
    () =>
      new MonitoringController((event) => {
        setLocalEvents((current) => [...current.slice(-999), event]);
        queue.enqueue([event]);
      }),
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getServerSnapshot,
  );
  const delivery = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);
  const ready = active && requiredMediaReady(consent, state);
  useEffect(() => {
    onReadinessChange?.(ready);
  }, [ready, onReadinessChange]);
  const timeline = [
    ...new Map([...events, ...localEvents].map((event) => [event.id, event])).values(),
  ];

  useEffect(() => {
    queue.setTransport(async (batch, signal) => {
      await onEvents(batch, signal);
    });
  }, [queue, onEvents]);
  useEffect(() => {
    controller.configure(consent, active);
    queue.discardSources(consent);
  }, [controller, queue, consent, active]);
  useEffect(() => {
    controller.setPlaybackActive(playbackActive);
  }, [controller, playbackActive]);
  useEffect(() => {
    try {
      queue.restore(window.sessionStorage);
    } catch {
      /* Delivery works without browser storage. */
    }
    const online = () => {
      void queue.retry();
    };
    const pagehide = () => {
      controller.suspendForNavigation();
    };
    const pageshow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        controller.restoreAfterNavigation();
        void queue.retry();
      }
    };
    const element = video.current;
    window.addEventListener("online", online);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("pageshow", pageshow);
    return () => {
      controller.dispose();
      queue.dispose();
      window.removeEventListener("online", online);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("pageshow", pageshow);
      if (element) element.srcObject = null;
    };
  }, [controller, queue]);
  useImperativeHandle(
    ref,
    () => ({
      isReady: controller.isReady,
      finish: async () => {
        controller.dispose();
        if (video.current) video.current.srcObject = null;
        return queue.flush();
      },
      resume: () => controller.configure(consent, active),
      getMicrophoneStream: () => controller.getMicrophoneStream(),
      setPlaybackActive: (value) => controller.setPlaybackActive(value),
    }),
    [controller, queue, consent, active],
  );

  async function changeConsent(source: keyof MonitoringConsent, enabled: boolean) {
    if (!onConsentChange || pendingConsent) return;
    const next = { ...consent, [source]: enabled };
    if (!enabled) {
      controller.configure(next, active);
      queue.discardSources(next);
    }
    setPendingConsent(true);
    setError("");
    try {
      await onConsentChange(next);
      controller.configure(next, active);
    } catch {
      setError(
        "Could not save consent. Devices remain stopped; retry before enabling observations.",
      );
    } finally {
      setPendingConsent(false);
    }
  }
  const cameraBusy = state.camera.status === "loading" || state.camera.status === "requesting";
  const audioBusy = state.audio.status === "loading" || state.audio.status === "requesting";

  return (
    <section className={`panel ${styles.panel}`} aria-labelledby="monitoring-heading">
      <div>
        <p className="eyebrow">
          {required ? "Required interview devices" : "Optional practice conditions"}
        </p>
        <h2 id="monitoring-heading">Session observations</h2>
        <p className="muted">
          Frames and audio stay on this device. Observations do not change technical feedback or
          establish outside assistance.
        </p>
      </div>
      {required && (
        <div className="notice">
          <p>
            Camera and microphone permission are required before questions and answers unlock. Your
            browser will ask permission when you start each device. You can stop or revoke access at
            any time; this blocks interview progression and preserves your draft.
          </p>
          <p role="status">
            {ready
              ? "Both devices ready."
              : "Interview blocked: enable camera and microphone below."}
          </p>
          <p>
            If access is denied, allow camera/microphone in your browser’s site settings, then
            retry. Use localhost or HTTPS. <Link href="/">Exit to setup</Link>.
          </p>
        </div>
      )}
      <fieldset
        className={styles.consents}
        disabled={!active || pendingConsent || !onConsentChange}
      >
        <legend>Observation consent</legend>
        {(
          [
            ["focus", "Page visibility"],
            ["camera", "Camera observations"],
            ["audio", "Microphone activity"],
          ] as const
        ).map(([source, label]) => (
          <label key={source}>
            <input
              type="checkbox"
              checked={consent[source]}
              onChange={(event) => void changeConsent(source, event.target.checked)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      {pendingConsent && (
        <p role="status" className="small muted">
          Saving consent…
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className={styles.sensor}>
        <div className={styles.heading}>
          <h3>Webcam</h3>
          <span className="badge">{state.camera.status}</span>
        </div>
        <video
          ref={video}
          muted
          playsInline
          className={styles.video}
          aria-label="Local webcam preview"
          hidden={
            !consent.camera ||
            state.camera.status === "off" ||
            state.camera.status === "unavailable"
          }
        />
        <p className="small muted" role="status">
          {state.camera.message}
        </p>
        <div className="row">
          <button
            type="button"
            className="button secondary"
            disabled={
              !active ||
              !consent.camera ||
              pendingConsent ||
              cameraBusy ||
              state.camera.status === "running" ||
              state.camera.status === "paused"
            }
            onClick={() => {
              if (video.current) void controller.startCamera(video.current);
            }}
          >
            {state.camera.status === "unavailable" ? "Retry camera" : "Start camera"}
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={state.camera.status === "off"}
            onClick={() => {
              controller.stopCamera();
              if (video.current) video.current.srcObject = null;
            }}
          >
            Stop camera
          </button>
        </div>
        <p className="small muted">
          No-face grace: 3s · Multiple-face grace: 2s. Low-quality frames pause observations.
        </p>
      </div>
      <div className={styles.sensor}>
        <div className={styles.heading}>
          <h3>Microphone</h3>
          <span className="badge">{state.audio.status}</span>
        </div>
        <meter
          className={styles.meter}
          min={0}
          max={1}
          value={state.level}
          aria-label="Microphone signal level"
        />
        <p className="small muted" role="status">
          {state.audio.message}
        </p>
        <div className="row">
          <button
            type="button"
            className="button secondary"
            disabled={
              !active ||
              !consent.audio ||
              pendingConsent ||
              audioBusy ||
              state.audio.status === "running" ||
              state.audio.status === "paused"
            }
            onClick={() => void controller.startAudio()}
          >
            {state.audio.status === "unavailable" ? "Retry microphone" : "Start microphone"}
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={state.audio.status === "off"}
            onClick={() => controller.stopAudio()}
          >
            Stop microphone
          </button>
        </div>
        <p className="small muted">
          Silero detects speech activity, not who is speaking. A 10s pause is recorded neutrally.
          Playback pauses analysis.
        </p>
      </div>
      <div className={styles.heading}>
        <span>Page visibility</span>
        <span className="badge">{state.focus ? "Observing" : "Off"}</span>
      </div>
      <div className={styles.delivery} role="status">
        <p>{delivery.message}</p>
        <p>
          {delivery.pending} pending
          {delivery.dropped ? ` · ${delivery.dropped} not queued (limit reached)` : ""}
        </p>
        {delivery.pending > 0 && (
          <button type="button" className="text-link" onClick={() => void queue.retry()}>
            Retry delivery
          </button>
        )}
      </div>
      <button
        className="text-link"
        type="button"
        disabled={!timeline.length && !delivery.pending}
        onClick={() =>
          downloadObservations(
            [
              ...new Map(
                [...timeline, ...queue.pendingEvents()].map((event) => [event.id, event]),
              ).values(),
            ],
            `interviewiq-observations-${sessionId}.json`,
          )
        }
      >
        Export observation metadata
      </button>
      {timeline.length ? (
        <ol className="timeline" aria-label="Observation timeline">
          {timeline.slice(-12).map((event) => (
            <li key={event.id}>
              <span>{event.type.replaceAll("_", " ")}</span>
              <small>
                {new Date(event.occurredAt).toLocaleTimeString()}
                {event.durationMs === undefined
                  ? ""
                  : ` · ${(event.durationMs / 1000).toFixed(1)}s`}
              </small>
              {event.detail && <small>{event.detail}</small>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="small muted">
          No observations recorded. Devices start only when you click their start buttons.
        </p>
      )}
    </section>
  );
}
