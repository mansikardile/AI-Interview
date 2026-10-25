import { afterEach, describe, expect, it, vi } from "vitest";
import { createWebSpeechCapture } from "@/modules/interview/speech/create-web-speech-capture";

class Recognition {
  static instances: Recognition[] = [];
  continuous = false;
  interimResults = false;
  lang = "";
  onstart: ((ev: Event) => void) | null = null;
  onend: ((ev: Event) => void) | null = null;
  onerror: ((ev: { error: string }) => void) | null = null;
  onresult:
    | ((ev: {
        resultIndex: number;
        results: { isFinal: boolean; 0: { transcript: string } }[];
      }) => void)
    | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  constructor() {
    Recognition.instances.push(this);
  }
}
afterEach(() => {
  vi.unstubAllGlobals();
  Recognition.instances = [];
});
describe("speech adapter lifecycle", () => {
  const setup = () => {
    vi.stubGlobal("window", { SpeechRecognition: Recognition });
    const callbacks = { onStateChange: vi.fn(), onTranscript: vi.fn(), onError: vi.fn() };
    return { capture: createWebSpeechCapture(callbacks), ...callbacks };
  };
  it("ignores stale recognition callbacks and releases capture on disposal", async () => {
    const { capture, onStateChange, onTranscript } = setup();
    await capture.start();
    const old = Recognition.instances[0];
    await capture.start();
    const current = Recognition.instances[1];
    expect(old.abort).toHaveBeenCalled();
    current.onstart?.(new Event("start"));
    old.onend?.(new Event("end"));
    expect(onStateChange).toHaveBeenLastCalledWith("listening");
    capture.dispose();
    current.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "late" } }] });
    expect(current.abort).toHaveBeenCalled();
    expect(onTranscript).not.toHaveBeenCalled();
  });
  it("stop before start remains idle rather than processing forever", async () => {
    const { capture, onStateChange } = setup();
    await capture.stop();
    expect(onStateChange).toHaveBeenLastCalledWith("idle");
    capture.dispose();
  });
  it("surfaces permission denial without inventing a transcript", async () => {
    const { capture, onStateChange, onTranscript, onError } = setup();
    await capture.start();
    Recognition.instances[0].onerror?.({ error: "not-allowed" });
    expect(onStateChange).toHaveBeenLastCalledWith("unavailable");
    expect(onError).toHaveBeenCalled();
    expect(onTranscript).not.toHaveBeenCalled();
    capture.dispose();
  });
});
