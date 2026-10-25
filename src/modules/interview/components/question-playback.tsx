"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Spoken question playback (A06).
 * While TTS is playing, `onPlayingChange(true)` so C's VAD can ignore app speech (MON-004).
 * Does not open a microphone stream.
 */
export function QuestionPlayback({
  text,
  questionId,
  onPlayingChange,
  disabled = false,
}: {
  text: string;
  questionId: string;
  onPlayingChange?: (playing: boolean) => void;
  disabled?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const supported = useSyncExternalStore(
    subscribe,
    () => "speechSynthesis" in window,
    () => true,
  );
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);

  function stopAll() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    utterance.current = null;
    setPlaying(false);
    setPaused(false);
    onPlayingChange?.(false);
  }

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      utterance.current = null;
      onPlayingChange?.(false);
    };
  }, [questionId, onPlayingChange]);

  function play() {
    if (disabled || !supported || typeof window === "undefined") return;
    if (paused && utterance.current) {
      window.speechSynthesis.resume();
      setPaused(false);
      setPlaying(true);
      onPlayingChange?.(true);
      return;
    }
    window.speechSynthesis.cancel();
    const next = new SpeechSynthesisUtterance(text);
    next.volume = muted ? 0 : 1;
    next.onend = () => {
      if (utterance.current !== next) return;
      setPlaying(false);
      setPaused(false);
      utterance.current = null;
      onPlayingChange?.(false);
    };
    next.onerror = () => {
      if (utterance.current !== next) return;
      setPlaying(false);
      setPaused(false);
      utterance.current = null;
      onPlayingChange?.(false);
    };
    utterance.current = next;
    window.speechSynthesis.speak(next);
    setPlaying(true);
    setPaused(false);
    onPlayingChange?.(true);
  }

  function pause() {
    if (!playing || typeof window === "undefined") return;
    window.speechSynthesis.pause();
    setPaused(true);
    setPlaying(false);
    // Still "app TTS session" until cancelled — keep flag true so VAD stays quiet.
    onPlayingChange?.(true);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    if (utterance.current) utterance.current.volume = next ? 0 : 1;
  }

  if (!supported) {
    return (
      <p className="small muted">
        Spoken questions are not supported in this browser. Read the text.
      </p>
    );
  }

  return (
    <div className="row voice-controls" aria-label="Spoken question controls">
      <button
        type="button"
        className="button secondary"
        onClick={playing && !paused ? pause : play}
        disabled={disabled}
      >
        {playing && !paused ? "Pause question" : paused ? "Resume question" : "Play question"}
      </button>
      <button
        type="button"
        className="button secondary"
        onClick={stopAll}
        disabled={!playing && !paused}
      >
        Stop
      </button>
      <button type="button" className="button secondary" onClick={toggleMute} aria-pressed={muted}>
        {muted ? "Unmute" : "Mute"}
      </button>
      {playing && (
        <span className="badge" aria-live="polite">
          App TTS playing · monitoring should ignore this audio
        </span>
      )}
    </div>
  );
}
