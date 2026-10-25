// A and C can implement/consume this port without sharing microphone internals.
// No browser device is accessed by importing these types.
export type SpeechCaptureState = "idle" | "requesting" | "listening" | "processing" | "unavailable";

export type TranscriptUpdate = {
  text: string;
  final: boolean;
  capturedAt: string;
};

export interface SpeechCaptureController {
  start(): Promise<void>;
  stop(): Promise<void>;
  dispose(): void;
}

export type SpeechCaptureOptions = {
  onStateChange: (state: SpeechCaptureState) => void;
  onTranscript: (update: TranscriptUpdate) => void;
  onError: (message: string) => void;
};
