import type { MonitoringConsent, MonitoringEvent } from "@/contracts";

export type SensorStatus = "off" | "requesting" | "loading" | "running" | "paused" | "unavailable";
export type SensorState = { status: SensorStatus; message: string };
export type MonitoringState = {
  camera: SensorState;
  audio: SensorState;
  focus: boolean;
  faceCount: number | null;
  speechProbability: number;
  level: number;
};
export const initialMonitoringState: MonitoringState = {
  camera: { status: "off", message: "Camera is off." },
  audio: { status: "off", message: "Microphone is off." },
  focus: false,
  faceCount: null,
  speechProbability: 0,
  level: 0,
};
export type FaceSample = { faces: number; quality: "good" | "dark" | "bright" | "flat" };
export interface FaceAnalyzer {
  inspect(source: HTMLVideoElement | HTMLCanvasElement, timestamp: number): FaceSample;
  close(): void;
}
export interface VoiceAnalyzer {
  start(): Promise<void>;
  destroy(): Promise<void>;
}
export interface MonitoringDependencies {
  getMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  loadFace: () => Promise<FaceAnalyzer>;
  loadVoice: (
    stream: MediaStream,
    frame: (probability: number, rms: number) => void,
  ) => Promise<VoiceAnalyzer>;
  now: () => number;
  timestamp: () => string;
  id: () => string;
  hidden: () => boolean;
  appSpeaking: () => boolean;
}
export type ObservationSink = (event: MonitoringEvent) => void;
export type { MonitoringConsent, MonitoringEvent };
