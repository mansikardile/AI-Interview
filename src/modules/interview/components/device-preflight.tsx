"use client";

import { useEffect, useState } from "react";
import type { MonitoringConsent } from "@/contracts";

export type DeviceCapability = "unknown" | "ready" | "denied" | "missing" | "unsupported";

export type DevicePreflightState = {
  microphone: DeviceCapability;
  camera: DeviceCapability;
  speechRecognition: DeviceCapability;
  speechSynthesis: DeviceCapability;
  checking: boolean;
};

function speechRecognitionAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition,
  );
}

async function queryPermission(name: PermissionName): Promise<DeviceCapability | null> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return null;
  try {
    const result = await navigator.permissions.query({ name });
    if (result.state === "granted") return "ready";
    if (result.state === "denied") return "denied";
    return "unknown";
  } catch {
    return null;
  }
}

async function probeDevices(consent: MonitoringConsent): Promise<Omit<DevicePreflightState, "checking">> {
  const speechRecognition: DeviceCapability = speechRecognitionAvailable() ? "ready" : "unsupported";
  const speechSynthesis: DeviceCapability =
    typeof window !== "undefined" && "speechSynthesis" in window ? "ready" : "unsupported";

  let microphone: DeviceCapability = "unknown";
  let camera: DeviceCapability = "unknown";

  // Capability / permission probe only — never open a MediaStream during preflight.
  if (!navigator.mediaDevices?.enumerateDevices) {
    return {
      microphone: "unsupported",
      camera: "unsupported",
      speechRecognition,
      speechSynthesis,
    };
  }

  const micPerm = await queryPermission("microphone" as PermissionName);
  const camPerm = await queryPermission("camera" as PermissionName);
  if (micPerm) microphone = micPerm;
  if (camPerm) camera = camPerm;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasMic = devices.some((d) => d.kind === "audioinput");
    const hasCam = devices.some((d) => d.kind === "videoinput");
    if (!hasMic) microphone = "missing";
    else if (microphone === "unknown") microphone = "ready";
    if (!hasCam) camera = "missing";
    else if (camera === "unknown") camera = "ready";
  } catch {
    if (microphone === "unknown") microphone = "unsupported";
    if (camera === "unknown") camera = "unsupported";
  }

  // When monitoring camera/audio consent is off, we still report capability for voice UI,
  // but we never request streams here.
  void consent;

  return { microphone, camera, speechRecognition, speechSynthesis };
}

function label(cap: DeviceCapability): string {
  switch (cap) {
    case "ready":
      return "Ready";
    case "denied":
      return "Permission denied";
    case "missing":
      return "Not found";
    case "unsupported":
      return "Unsupported";
    default:
      return "Checking…";
  }
}

export function DevicePreflight({
  consent,
  onReady,
  required = false,
}: {
  consent: MonitoringConsent;
  onReady?: (state: DevicePreflightState) => void;
  required?: boolean;
}) {
  const [state, setState] = useState<DevicePreflightState>({
    microphone: "unknown",
    camera: "unknown",
    speechRecognition: "unknown",
    speechSynthesis: "unknown",
    checking: true,
  });

  useEffect(() => {
    let mounted = true;
    void probeDevices(consent).then((result) => {
      if (!mounted) return;
      const next = { ...result, checking: false };
      setState(next);
      onReady?.(next);
    });
    return () => {
      mounted = false;
    };
  }, [consent, onReady]);

  const monitoringOff = !consent.focus && !consent.camera && !consent.audio;

  return (
    <section className="panel preflight" aria-labelledby="preflight-heading">
      <p className="eyebrow">Device preflight</p>
      <h2 id="preflight-heading">Before you answer</h2>
      <p className="muted small">
        Capability check only — no camera or microphone stream is opened here.
        {monitoringOff ? " Monitoring is off for this session." : ""} {required ? "Saved interviews require both live devices in the monitoring panel; capability is not a permission grant." : "Typed fixture answers work without devices."}
      </p>
      <ul className="status-list">
        <li>
          <span>Microphone</span>
          <span className="badge">{state.checking ? "Checking…" : label(state.microphone)}</span>
        </li>
        <li>
          <span>Camera</span>
          <span className="badge">{state.checking ? "Checking…" : label(state.camera)}</span>
        </li>
        <li>
          <span>Speech recognition</span>
          <span className="badge">
            {state.checking ? "Checking…" : label(state.speechRecognition)}
          </span>
        </li>
        <li>
          <span>Spoken questions</span>
          <span className="badge">
            {state.checking ? "Checking…" : label(state.speechSynthesis)}
          </span>
        </li>
      </ul>
      {(state.microphone === "denied" || state.camera === "denied") && (
        <p className="notice" role="status">
          {required ? "Permission denied — allow both devices in browser site settings, then retry in the device panel or exit the interview." : "Permission denied — continue with typed fixture answers."}
        </p>
      )}
    </section>
  );
}
