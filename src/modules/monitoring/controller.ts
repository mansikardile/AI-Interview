import { browserDependencies } from "./adapters/browser";
import { requiredMediaReady } from "./readiness";
import { mediaErrorMessage, SustainedCondition, VoiceActivityTracker } from "./detection";
import {
  initialMonitoringState,
  type FaceAnalyzer,
  type MonitoringConsent,
  type MonitoringDependencies,
  type MonitoringState,
  type ObservationSink,
  type VoiceAnalyzer,
} from "./types";

export class MonitoringController {
  private state: MonitoringState = initialMonitoringState;
  private listeners = new Set<() => void>();
  private consent: MonitoringConsent = { focus: false, camera: false, audio: false };
  private active = false;
  private restoreActive = false;
  private cameraGeneration = 0;
  private audioGeneration = 0;
  private cameraStream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private audioStream: MediaStream | null = null;
  private face: FaceAnalyzer | null = null;
  private voice: VoiceAnalyzer | null = null;
  private cameraTimer: ReturnType<typeof setInterval> | null = null;
  private audioTimer: ReturnType<typeof setInterval> | null = null;
  private noFace = new SustainedCondition<"none">(3000);
  private manyFaces = new SustainedCondition<"many">(2000);
  private activity = new VoiceActivityTracker();
  private lastVideoTime = -1;
  private lastVideoAt = 0;
  private lastAudioAt = 0;
  private lastAudioUi = 0;
  private playback = false;
  private focusHiddenAt: number | null = null;
  private cleanupFocus: (() => void) | null = null;

  constructor(
    private readonly emit: ObservationSink,
    private readonly deps: MonitoringDependencies = browserDependencies,
  ) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.state;
  isReady = () =>
    this.active &&
    requiredMediaReady(this.consent, this.state) &&
    !!this.cameraStream
      ?.getVideoTracks()
      .some((track) => track.readyState === "live" && !track.muted) &&
    !!this.audioStream
      ?.getAudioTracks()
      .some((track) => track.readyState === "live" && !track.muted);
  getServerSnapshot = () => initialMonitoringState;
  private update(partial: Partial<MonitoringState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => listener());
  }
  private event(
    source: "camera" | "audio" | "focus",
    type: Parameters<ObservationSink>[0]["type"],
    detail?: string,
    durationMs?: number,
  ) {
    if (!this.active || !this.consent[source]) return;
    this.emit({
      id: this.deps.id(),
      source,
      type,
      occurredAt: this.deps.timestamp(),
      ...(detail ? { detail } : {}),
      ...(durationMs === undefined ? {} : { durationMs }),
    });
  }

  configure(consent: MonitoringConsent, active: boolean) {
    this.consent = consent;
    this.active = active;
    if (!active || !consent.camera) this.stopCamera();
    if (!active || !consent.audio) this.stopAudio();
    if (!active || !consent.focus) {
      this.cleanupFocus?.();
      this.cleanupFocus = null;
      this.focusHiddenAt = null;
      this.update({ focus: false });
    } else if (!this.cleanupFocus && typeof document !== "undefined") {
      const observe = () => this.visibilityChanged(this.deps.hidden());
      document.addEventListener("visibilitychange", observe);
      this.cleanupFocus = () => document.removeEventListener("visibilitychange", observe);
      this.focusHiddenAt = this.deps.hidden() ? this.deps.now() : null;
      this.update({ focus: true });
    }
  }

  visibilityChanged(hidden: boolean) {
    this.noFace.reset();
    this.manyFaces.reset();
    this.activity.reset();
    this.lastVideoAt = this.lastAudioAt = this.deps.now();
    if (this.active && this.consent.focus) {
      const duration =
        !hidden && this.focusHiddenAt !== null
          ? Math.max(0, Math.min(86400000, Math.round(this.deps.now() - this.focusHiddenAt)))
          : undefined;
      this.focusHiddenAt = hidden ? this.deps.now() : null;
      this.event("focus", hidden ? "page_hidden" : "page_visible", undefined, duration);
    }
  }

  setPlaybackActive(value: boolean) {
    this.playback = value;
    this.activity.reset();
  }
  suspendForNavigation() {
    const wasActive = this.active;
    this.dispose();
    this.restoreActive = wasActive;
  }
  restoreAfterNavigation() {
    if (this.restoreActive) {
      this.restoreActive = false;
      this.configure(this.consent, true);
    }
  }
  // A can clone this stream for transcription; it owns and must stop that clone.
  getMicrophoneStream(): MediaStream | null {
    return this.audioStream;
  }

  async startCamera(video: HTMLVideoElement) {
    if (!this.active || !this.consent.camera) return;
    this.stopCamera();
    const generation = ++this.cameraGeneration;
    this.update({ camera: { status: "requesting", message: "Waiting for camera permission…" } });
    let stream: MediaStream | null = null;
    let analyzer: FaceAnalyzer | null = null;
    try {
      stream = await this.deps.getMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      if (generation !== this.cameraGeneration) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.cameraStream = stream;
      this.video = video;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      if (generation !== this.cameraGeneration) {
        stream.getTracks().forEach((track) => track.stop());
        if (video.srcObject === stream) video.srcObject = null;
        return;
      }
      this.update({ camera: { status: "loading", message: "Loading the local face model…" } });
      analyzer = await this.deps.loadFace();
      if (generation !== this.cameraGeneration) {
        analyzer.close();
        stream.getTracks().forEach((track) => track.stop());
        if (video.srcObject === stream) video.srcObject = null;
        return;
      }
      this.face = analyzer;
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => this.cameraUnavailable("Camera disconnected or access was revoked.");
        track.onmute = () => {
          this.noFace.reset();
          this.manyFaces.reset();
          this.update({
            camera: {
              status: "paused",
              message: "Camera signal interrupted; face observations paused.",
            },
          });
        };
      });
      this.lastVideoTime = -1;
      this.lastVideoAt = this.deps.now();
      this.update({
        camera: {
          status: "running",
          message: "Local detection is running. Frames are not uploaded.",
        },
      });
      this.cameraTimer = setInterval(() => {
        if (this.deps.hidden()) {
          this.noFace.reset();
          this.manyFaces.reset();
          this.lastVideoAt = this.deps.now();
          return;
        }
        if (
          !video.videoWidth ||
          video.readyState < 2 ||
          video.currentTime === this.lastVideoTime ||
          stream?.getVideoTracks().some((track) => track.muted)
        ) {
          this.noFace.reset();
          this.manyFaces.reset();
          if (this.deps.now() - this.lastVideoAt > 5000)
            this.cameraUnavailable("Camera frames stopped arriving. Retry the camera.");
          return;
        }
        this.lastVideoTime = video.currentTime;
        this.lastVideoAt = this.deps.now();
        try {
          this.processFace(analyzer!.inspect(video, this.deps.now()));
        } catch {
          this.cameraUnavailable("Face analysis failed. Retry the local model.");
        }
      }, 250); // Bound synchronous inference to four frames/second.
    } catch (error) {
      if (generation === this.cameraGeneration) this.cameraUnavailable(mediaErrorMessage(error));
      else {
        stream?.getTracks().forEach((track) => track.stop());
        analyzer?.close();
      }
      if (video.srcObject === stream) video.srcObject = null;
    }
  }

  processFace(sample: { faces: number; quality: "good" | "dark" | "bright" | "flat" }) {
    if (!this.active || !this.consent.camera || this.deps.hidden()) return;
    if (sample.quality !== "good") {
      this.noFace.reset();
      this.manyFaces.reset();
      this.update({
        faceCount: null,
        camera: {
          status: "paused",
          message:
            "Image quality is insufficient. Improve lighting or uncover the lens; no face-absence event is recorded.",
        },
      });
      return;
    }
    this.update({
      faceCount: sample.faces,
      camera: {
        status: "running",
        message: `${sample.faces} face${sample.faces === 1 ? "" : "s"} detected locally.`,
      },
    });
    const noFace = this.noFace.sample(sample.faces === 0 ? "none" : null, this.deps.now());
    const many = this.manyFaces.sample(sample.faces > 1 ? "many" : null, this.deps.now());
    if (noFace !== null)
      this.event(
        "camera",
        "no_face",
        "No face detected in usable frames for the configured grace period.",
        noFace,
      );
    if (many !== null)
      this.event(
        "camera",
        "multiple_faces",
        "More than one face detected for the configured grace period.",
        many,
      );
  }

  private cameraUnavailable(message: string) {
    this.stopCamera();
    this.update({ camera: { status: "unavailable", message } });
    this.event("camera", "camera_unavailable", message);
  }
  stopCamera() {
    ++this.cameraGeneration;
    if (this.cameraTimer) clearInterval(this.cameraTimer);
    this.cameraTimer = null;
    this.cameraStream?.getTracks().forEach((track) => {
      track.onended = null;
      track.onmute = null;
      track.stop();
    });
    this.cameraStream = null;
    this.face?.close();
    this.face = null;
    if (this.video) this.video.srcObject = null;
    this.video = null;
    this.noFace.reset();
    this.manyFaces.reset();
    this.update({ camera: { status: "off", message: "Camera is off." }, faceCount: null });
  }

  async startAudio() {
    if (!this.active || !this.consent.audio) return;
    this.stopAudio();
    const generation = ++this.audioGeneration;
    this.update({ audio: { status: "requesting", message: "Waiting for microphone permission…" } });
    let stream: MediaStream | null = null;
    let analyzer: VoiceAnalyzer | null = null;
    try {
      stream = await this.deps.getMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      if (generation !== this.audioGeneration) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.audioStream = stream;
      this.update({
        audio: { status: "loading", message: "Loading the local Silero speech model…" },
      });
      analyzer = await this.deps.loadVoice(stream, (probability, rms) => {
        if (generation === this.audioGeneration) this.processAudio(probability, rms);
      });
      if (generation !== this.audioGeneration) {
        await analyzer.destroy();
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.voice = analyzer;
      await analyzer.start();
      if (generation !== this.audioGeneration) {
        await analyzer.destroy();
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.getAudioTracks().forEach((track) => {
        track.onended = () =>
          this.audioUnavailable("Microphone disconnected or access was revoked.");
        track.onmute = () => {
          this.activity.reset();
          this.update({
            audio: {
              status: "paused",
              message: "Microphone signal interrupted; silence observations paused.",
            },
          });
        };
      });
      this.lastAudioAt = this.deps.now();
      this.update({
        audio: {
          status: "running",
          message: "Local speech activity detection is running. Audio is not recorded.",
        },
      });
      this.audioTimer = setInterval(() => {
        if (this.deps.hidden() || this.playback || this.deps.appSpeaking()) {
          this.activity.reset();
          this.lastAudioAt = this.deps.now();
          return;
        }
        if (this.deps.now() - this.lastAudioAt > 10000)
          this.audioUnavailable(
            "Audio processing stopped. Retry the microphone; no silence event is inferred.",
          );
      }, 1000);
    } catch (error) {
      if (generation === this.audioGeneration) this.audioUnavailable(mediaErrorMessage(error));
      else {
        stream?.getTracks().forEach((track) => track.stop());
        void analyzer?.destroy();
      }
    }
  }

  processAudio(probability: number, rms: number) {
    this.lastAudioAt = this.deps.now();
    if (
      !this.active ||
      !this.consent.audio ||
      this.deps.hidden() ||
      this.playback ||
      this.deps.appSpeaking() ||
      this.audioStream?.getAudioTracks().some((track) => track.muted)
    ) {
      this.activity.reset();
      return;
    }
    if (this.deps.now() - this.lastAudioUi >= 250) {
      this.lastAudioUi = this.deps.now();
      this.update({
        speechProbability: probability,
        level: Math.min(1, Math.max(0, rms * 5)),
        audio: {
          status: "running",
          message:
            probability >= 0.7 ? "Speech activity detected." : "Listening; a pause is normal.",
        },
      });
    }
    const activity = this.activity.sample(probability, this.deps.now());
    if (activity)
      this.event(
        "audio",
        activity.type,
        activity.type === "silence"
          ? "No speech activity detected during a sustained pause; this can be normal thinking time."
          : "Sustained speech activity detected; no speaker identification is performed.",
        activity.durationMs,
      );
  }
  private audioUnavailable(message: string) {
    this.stopAudio();
    this.update({ audio: { status: "unavailable", message } });
    this.event("audio", "microphone_unavailable", message);
  }
  stopAudio() {
    ++this.audioGeneration;
    if (this.audioTimer) clearInterval(this.audioTimer);
    this.audioTimer = null;
    this.audioStream?.getTracks().forEach((track) => {
      track.onended = null;
      track.onmute = null;
      track.stop();
    });
    this.audioStream = null;
    const voice = this.voice;
    this.voice = null;
    if (voice) void voice.destroy().catch(() => {});
    this.activity.reset();
    this.update({
      audio: { status: "off", message: "Microphone is off." },
      speechProbability: 0,
      level: 0,
    });
  }
  dispose() {
    this.restoreActive = false;
    this.active = false;
    this.cleanupFocus?.();
    this.cleanupFocus = null;
    this.stopCamera();
    this.stopAudio();
    this.focusHiddenAt = null;
    this.update({ focus: false });
  }
}
