"use client";
import { useState } from "react";
import Link from "next/link";
import type { MonitoringConsent, MonitoringEvent } from "@/contracts";
import { MonitoringPanel } from "./monitoring-panel";
import { createFaceAnalyzer, createVoiceAnalyzer } from "../adapters/browser";

export function MonitoringLab() {
  const [consent, setConsent] = useState<MonitoringConsent>({
    focus: false,
    camera: false,
    audio: false,
  });
  const [events, setEvents] = useState<MonitoringEvent[]>([]);
  const [active, setActive] = useState(true);
  const [diagnostic, setDiagnostic] = useState(
    "Not run. This test uses generated images and silent audio; it does not access your devices.",
  );
  const [testing, setTesting] = useState(false);

  async function verifyAssets() {
    setTesting(true);
    setDiagnostic("Verifying local face model and speech inference…");
    let face: Awaited<ReturnType<typeof createFaceAnalyzer>> | null = null;
    let voice: Awaited<ReturnType<typeof createVoiceAnalyzer>> | null = null;
    let context: AudioContext | null = null;
    let stream: MediaStream | null = null;
    try {
      context = new AudioContext();
      await context.resume();
      const destination = context.createMediaStreamDestination();
      stream = destination.stream;
      const silent = context.createBufferSource();
      silent.buffer = context.createBuffer(1, 16000, 16000);
      silent.loop = true;
      silent.connect(destination);
      silent.start();
      face = await createFaceAnalyzer();
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const graphics = canvas.getContext("2d")!;
      for (let y = 0; y < 240; y += 16)
        for (let x = 0; x < 320; x += 16) {
          graphics.fillStyle = ((x + y) / 16) % 2 ? "#404040" : "#b0b0b0";
          graphics.fillRect(x, y, 16, 16);
        }
      const result = face.inspect(canvas, performance.now());
      let finish: (() => void) | undefined;
      let frames = 0;
      const firstFrames = new Promise<void>((resolve) => {
        finish = resolve;
      });
      voice = await createVoiceAnalyzer(stream, () => {
        frames++;
        if (frames >= 3) finish?.();
      });
      await voice.start();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          firstFrames,
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new Error("Speech model loaded but audio frames did not arrive.")),
              12000,
            );
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
      setDiagnostic(
        `Passed: local face inference (${result.faces} faces, ${result.quality} image quality), Silero inference on ${frames} generated silent frames. No camera or microphone accessed.`,
      );
    } catch (error) {
      setDiagnostic(
        `Diagnostic failed: ${error instanceof Error ? error.message : "unknown error"}. Check npm run prepare:monitoring and browser console.`,
      );
    } finally {
      face?.close();
      if (voice) await voice.destroy().catch(() => {});
      stream?.getTracks().forEach((track) => track.stop());
      if (context) await context.close().catch(() => {});
      setTesting(false);
    }
  }

  return (
    <main className="container stack">
      <div>
        <p className="eyebrow">Team C / independent development</p>
        <h1 className="room-title">Monitoring test room</h1>
        <p className="muted">
          Local-only events in this room are fixtures and are not written to an interview. Use a
          real session to test delivery to its report.
        </p>
      </div>
      <div className="two-column">
        <MonitoringPanel
          sessionId="team-c-lab"
          consent={consent}
          events={events}
          onConsentChange={async (value) => setConsent(value)}
          onEvents={async (batch) =>
            setEvents((current) => [
              ...new Map([...current, ...batch].map((event) => [event.id, event])).values(),
            ])
          }
          active={active}
        />
        <aside className="stack">
          <section className="panel stack">
            <h2>Model diagnostic</h2>
            <p>
              Run real model inference against generated inputs before requesting hardware access.
            </p>
            <button
              className="button"
              type="button"
              disabled={testing}
              onClick={() => void verifyAssets()}
            >
              {testing ? "Checking local models…" : "Verify local models without devices"}
            </button>
            <p role="status" data-testid="model-diagnostic">
              {diagnostic}
            </p>
          </section>
          <section className="panel stack">
            <h2>Lifecycle checks</h2>
            <button
              className="button secondary"
              type="button"
              onClick={() => setActive((current) => !current)}
            >
              {active ? "End test session" : "Start another test session"}
            </button>
            <p className="small muted">
              Ending the test releases streams and stops observations. Restarting does not
              automatically reacquire devices.
            </p>
            <Link className="text-link" href="/">
              Back to interview setup →
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
