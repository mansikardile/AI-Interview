"use client";

import { useEffect, useRef, useState } from "react";
import type { SpeechCaptureController, SpeechCaptureState } from "@/contracts/media";
import { createWebSpeechCapture } from "../speech/create-web-speech-capture";

export type CreateSpeechCapture = (options: {
  onStateChange: (state: SpeechCaptureState) => void;
  onTranscript: (update: { text: string; final: boolean; capturedAt: string }) => void;
  onError: (message: string) => void;
}) => SpeechCaptureController;

export function VoiceAnswerControls({
  disabled,
  onTranscriptText,
  createSpeechCapture = createWebSpeechCapture,
  onDictationStart,
  onBusyChange,
}: {
  disabled?: boolean;
  /** Merges recognition text into the editable answer draft. */
  onTranscriptText: (text: string, final: boolean) => void;
  createSpeechCapture?: CreateSpeechCapture;
  onDictationStart?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [state, setState] = useState<SpeechCaptureState>("idle");
  const [error, setError] = useState("");
  const controller = useRef<SpeechCaptureController | null>(null);
  const transcriptRef = useRef(onTranscriptText);
  useEffect(() => {
    transcriptRef.current = onTranscriptText;
  }, [onTranscriptText]);
  useEffect(() => {
    if (disabled && (state === "listening" || state === "requesting"))
      void controller.current?.stop();
  }, [disabled, state]);
  useEffect(() => {
    onBusyChange?.(state === "listening" || state === "requesting" || state === "processing");
  }, [state, onBusyChange]);

  useEffect(() => {
    const capture = createSpeechCapture({
      onStateChange: setState,
      onTranscript: (update) => transcriptRef.current(update.text, update.final),
      onError: setError,
    });
    controller.current = capture;
    return () => {
      capture.dispose();
      controller.current = null;
    };
  }, [createSpeechCapture]);

  async function toggle() {
    setError("");
    if (state === "listening" || state === "requesting") {
      await controller.current?.stop();
      return;
    }
    onDictationStart?.();
    await controller.current?.start();
  }

  const listening = state === "listening" || state === "requesting" || state === "processing";
  const unavailable = state === "unavailable";

  return (
    <div className="voice-controls stack-tight">
      <div className="row">
        <button
          type="button"
          className={`button ${listening ? "secondary" : ""}`}
          disabled={disabled || unavailable}
          onClick={() => void toggle()}
          aria-pressed={listening}
        >
          {state === "listening"
            ? "Stop listening"
            : state === "requesting"
              ? "Requesting mic…"
              : state === "processing"
                ? "Processing…"
                : unavailable
                  ? "Voice unavailable"
                  : "Dictate answer"}
        </button>
        <span className="badge" aria-live="polite">
          Mic: {state}
        </span>
      </div>
      <p className="notice small">
        Browser speech recognition may send audio to the OS or browser vendor. Edit the transcript
        in the text box before submitting. Text entry is always available.
      </p>
      {error && (
        <p role="status" className="notice">
          {error}
        </p>
      )}
    </div>
  );
}
