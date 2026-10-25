import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MonitoringController } from "@/modules/monitoring/controller";
import type { MonitoringDependencies } from "@/modules/monitoring/types";
import type { MonitoringEvent } from "@/contracts";

function streamFixture() {
  const track = {
    readyState: "live",
    stop: vi.fn(),
    muted: false,
    onended: null as (() => void) | null,
    onmute: null as (() => void) | null,
  };
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
    getAudioTracks: () => [track],
  } as unknown as MediaStream;
  return { track, stream };
}

describe("device lifecycle and observations", () => {
  let at: number, hidden: boolean, tts: boolean;
  let events: MonitoringEvent[];
  let deps: MonitoringDependencies;
  let controller: MonitoringController;
  let stream: ReturnType<typeof streamFixture>;
  const allConsent = { focus: true, camera: true, audio: true };
  beforeEach(() => {
    vi.useFakeTimers();
    at = 0;
    hidden = false;
    tts = false;
    events = [];
    stream = streamFixture();
    deps = {
      getMedia: vi.fn(async () => stream.stream),
      loadFace: vi.fn(async () => ({
        inspect: vi.fn(() => ({ faces: 1, quality: "good" as const })),
        close: vi.fn(),
      })),
      loadVoice: vi.fn(async () => ({ start: vi.fn(), destroy: vi.fn(async () => {}) })),
      now: () => at,
      hidden: () => hidden,
      appSpeaking: () => tts,
      id: () => crypto.randomUUID(),
      timestamp: () => new Date().toISOString(),
    };
    controller = new MonitoringController((event) => events.push(event), deps);
  });
  afterEach(() => {
    controller.dispose();
    vi.useRealTimers();
  });
  const video = () =>
    ({
      srcObject: null,
      muted: false,
      playsInline: false,
      play: vi.fn(async () => {}),
      videoWidth: 640,
      readyState: 3,
      currentTime: 1,
    }) as unknown as HTMLVideoElement;

  it("requires both live tracks and resets readiness immediately on stop/revocation", async () => {
    controller.configure(allConsent, true);
    expect(controller.isReady()).toBe(false);
    await controller.startCamera(video());
    expect(controller.isReady()).toBe(false);
    await controller.startAudio();
    expect(controller.isReady()).toBe(true);
    stream.track.muted = true;
    expect(controller.isReady()).toBe(false);
    stream.track.muted = false;
    controller.stopCamera();
    expect(controller.isReady()).toBe(false);
    await controller.startCamera(video());
    expect(controller.isReady()).toBe(true);
    controller.configure({ ...allConsent, audio: false }, true);
    expect(controller.isReady()).toBe(false);
  });

  it("opens no devices and emits no events without consent", async () => {
    controller.configure({ focus: false, camera: false, audio: false }, true);
    await controller.startCamera(video());
    await controller.startAudio();
    controller.visibilityChanged(true);
    controller.processFace({ faces: 0, quality: "good" });
    expect(deps.getMedia).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });
  it("turns sustained no-face/multiple-face detections into distinct neutral observations", () => {
    controller.configure(allConsent, true);
    for (at = 0; at <= 4000; at += 250) controller.processFace({ faces: 0, quality: "good" });
    expect(events.map((event) => event.type)).toEqual(["no_face"]);
    controller.processFace({ faces: 1, quality: "good" });
    for (at = 5000; at <= 7500; at += 250) controller.processFace({ faces: 2, quality: "good" });
    expect(events.map((event) => event.type)).toEqual(["no_face", "multiple_faces"]);
  });
  it("resets camera grace on poor-quality frames and hidden tabs", () => {
    controller.configure(allConsent, true);
    for (at = 0; at <= 2500; at += 250) controller.processFace({ faces: 0, quality: "good" });
    controller.processFace({ faces: 0, quality: "dark" });
    at = 3000;
    controller.processFace({ faces: 0, quality: "good" });
    hidden = true;
    at = 6000;
    controller.processFace({ faces: 0, quality: "good" });
    expect(events).toEqual([]);
  });
  it("counts visibility duration and never treats blur as a different tab", () => {
    controller.configure(allConsent, true);
    controller.visibilityChanged(true);
    at = 12000;
    controller.visibilityChanged(false);
    expect(events.map((event) => event.type)).toEqual(["page_hidden", "page_visible"]);
    expect(events[1].durationMs).toBe(12000);
  });
  it("suppresses speech and silence during application playback and when hidden", () => {
    controller.configure(allConsent, true);
    tts = true;
    for (at = 0; at <= 20000; at += 250) controller.processAudio(0.1, 0);
    expect(events).toEqual([]);
    tts = false;
    controller.setPlaybackActive(true);
    for (at = 21000; at <= 22000; at += 100) controller.processAudio(0.9, 0.2);
    expect(events).toEqual([]);
    controller.setPlaybackActive(false);
    for (at = 23000; at <= 23500; at += 100) controller.processAudio(0.9, 0.2);
    expect(events.map((event) => event.type)).toEqual(["speech_activity"]);
    hidden = true;
    at = 40000;
    controller.processAudio(0.1, 0);
    expect(events).toHaveLength(1);
  });
  it("handles denied camera permission as unavailable, not no-face", async () => {
    controller.configure(allConsent, true);
    vi.mocked(deps.getMedia).mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    await controller.startCamera(video());
    expect(controller.getSnapshot().camera.status).toBe("unavailable");
    expect(events.map((event) => event.type)).toEqual(["camera_unavailable"]);
  });
  it("closes the detector, clears video and stops tracks on revocation", async () => {
    controller.configure(allConsent, true);
    const element = video();
    await controller.startCamera(element);
    const analyzer = await vi.mocked(deps.loadFace).mock.results[0].value;
    controller.configure({ ...allConsent, camera: false }, true);
    expect(stream.track.stop).toHaveBeenCalled();
    expect(analyzer.close).toHaveBeenCalled();
    expect(element.srcObject).toBeNull();
    expect(controller.getSnapshot().camera.status).toBe("off");
  });
  it("stops a stream that resolves after cancellation without loading its model", async () => {
    controller.configure(allConsent, true);
    let resolve!: (stream: MediaStream) => void;
    vi.mocked(deps.getMedia).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const pending = controller.startCamera(video());
    controller.stopCamera();
    resolve(stream.stream);
    await pending;
    expect(stream.track.stop).toHaveBeenCalled();
    expect(deps.loadFace).not.toHaveBeenCalled();
  });
  it("releases audio processing and tracks on session end, and shares only the live stream", async () => {
    controller.configure(allConsent, true);
    await controller.startAudio();
    expect(controller.getMicrophoneStream()).toBe(stream.stream);
    const analyzer = await vi.mocked(deps.loadVoice).mock.results[0].value;
    controller.configure(allConsent, false);
    expect(stream.track.stop).toHaveBeenCalled();
    expect(analyzer.destroy).toHaveBeenCalled();
    expect(controller.getMicrophoneStream()).toBeNull();
  });
  it("distinguishes a disconnected microphone from sustained silence", async () => {
    controller.configure(allConsent, true);
    await controller.startAudio();
    stream.track.onended?.();
    expect(events.map((event) => event.type)).toEqual(["microphone_unavailable"]);
    expect(controller.getSnapshot().audio.status).toBe("unavailable");
  });
  it("treats stalled audio processing as unavailable, not silence", async () => {
    controller.configure(allConsent, true);
    await controller.startAudio();
    at = 11000;
    await vi.advanceTimersByTimeAsync(1000);
    expect(events.map((event) => event.type)).toEqual(["microphone_unavailable"]);
  });
  it("restores focus observation after a cached navigation without reacquiring devices", async () => {
    controller.configure(allConsent, true);
    await controller.startAudio();
    controller.suspendForNavigation();
    controller.visibilityChanged(true);
    expect(events).toHaveLength(0);
    controller.restoreAfterNavigation();
    controller.visibilityChanged(true);
    expect(events.map((event) => event.type)).toEqual(["page_hidden"]);
    expect(deps.getMedia).toHaveBeenCalledTimes(1);
    expect(controller.getMicrophoneStream()).toBeNull();
    controller.dispose();
    controller.restoreAfterNavigation();
    controller.visibilityChanged(false);
    expect(events).toHaveLength(1);
  });
});
