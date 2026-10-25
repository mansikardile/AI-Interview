import { describe, expect, it } from "vitest";
import { requiredMediaReady } from "../../src/modules/monitoring/readiness";
import { initialMonitoringState, type SensorStatus } from "../../src/modules/monitoring/types";

describe("required camera/microphone gate", () => {
  const consent = { camera: true, audio: true, focus: false };
  const state = {
    ...initialMonitoringState,
    camera: { status: "running" as const, message: "Ready" },
    audio: { status: "running" as const, message: "Ready" },
  };
  it("requires both explicit consents and both running devices", () => {
    expect(requiredMediaReady(consent, state)).toBe(true);
    expect(requiredMediaReady({ ...consent, camera: false }, state)).toBe(false);
    expect(requiredMediaReady({ ...consent, audio: false }, state)).toBe(false);
  });
  it.each(["off", "requesting", "loading", "unavailable"] as SensorStatus[])(
    "blocks when either device is %s",
    (status) => {
      expect(requiredMediaReady(consent, { ...state, camera: { ...state.camera, status } })).toBe(
        false,
      );
      expect(requiredMediaReady(consent, { ...state, audio: { ...state.audio, status } })).toBe(
        false,
      );
    },
  );
  it("does not treat paused analysis/playback as permission loss", () => {
    expect(
      requiredMediaReady(consent, { ...state, audio: { ...state.audio, status: "paused" } }),
    ).toBe(true);
  });
});
