import type { MonitoringConsent, MonitoringState } from "./types";

export function requiredMediaReady(consent: MonitoringConsent, state: MonitoringState): boolean {
  const usable = (status: string) => status === "running" || status === "paused";
  return (
    consent.camera && consent.audio && usable(state.camera.status) && usable(state.audio.status)
  );
}
