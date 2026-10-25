"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Spoken question playback (A06).
 * While TTS is playing, `onPlayingChange(true)` so C's VAD can ignore app speech (MON-004).
 * Does not open a microphone stream.
 */
export function QuestionPlayback({
  text,
  questionId,
  onPlayingChange,
}: {
  text: string;
  questionId: string;
  onPlayingChange?: (playing: boolean) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
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
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setUnsupported(true);
      return;
    }
    stopAll();
    return () => stopAll();
    // Reset when the active question changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  function play() {
    if (unsupported || typeof window === "undefined") return;
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
      setPlaying(false);
      setPaused(false);
      utterance.current = null;
      onPlayingChange?.(false);
    };
    next.onerror = () => {
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

  if (unsupported) {
    return (
      <p className="small muted">Spoken questions are not supported in this browser. Read the text.</p>
    );
  }

  return (
    <div className="row voice-controls" aria-label="Spoken question controls">
      <button type="button" className="button secondary" onClick={playing && !paused ? pause : play}>
        {playing && !paused ? "Pause question" : paused ? "Resume question" : "Play question"}
      </button>
      <button type="button" className="button secondary" onClick={stopAll} disabled={!playing && !paused}>
        Stop
      </button>
      <button
        type="button"
        className="button secondary"
        onClick={toggleMute}
        aria-pressed={muted}
      >
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
