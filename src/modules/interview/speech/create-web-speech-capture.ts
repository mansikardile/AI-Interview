import type {
  SpeechCaptureController,
  SpeechCaptureOptions,
  SpeechCaptureState,
} from "@/contracts/media";

type RecognitionCtor = new () => SpeechRecognitionLike;

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onresult: ((ev: {
    resultIndex: number;
    results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
  }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isWebSpeechCaptureAvailable(): boolean {
  return getRecognitionCtor() !== null;
}

/** Browser Web Speech adapter implementing the A/C SpeechCaptureController port. */
export function createWebSpeechCapture(options: SpeechCaptureOptions): SpeechCaptureController {
  const Ctor = getRecognitionCtor();
  let recognition: SpeechRecognitionLike | null = null;
  let disposed = false;
  let intentionalStop = false;
  let finalBuffer = "";

  function setState(state: SpeechCaptureState) {
    if (!disposed) options.onStateChange(state);
  }

  if (!Ctor) {
    setState("unavailable");
    return {
      async start() {
        setState("unavailable");
        options.onError("Speech recognition is not available in this browser. Type your answer.");
      },
      async stop() {},
      dispose() {
        disposed = true;
      },
    };
  }

  return {
    async start() {
      if (disposed) return;
      intentionalStop = false;
      finalBuffer = "";
      setState("requesting");
      try {
        recognition?.abort();
      } catch {
        /* ignore */
      }
      recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => setState("listening");
      recognition.onerror = (ev) => {
        if (disposed) return;
        if (ev.error === "aborted" || ev.error === "no-speech") return;
        if (ev.error === "not-allowed") {
          setState("unavailable");
          options.onError("Microphone permission denied. Continue with typed answers.");
          return;
        }
        options.onError(`Speech recognition error: ${ev.error}`);
        setState("idle");
      };
      recognition.onresult = (ev) => {
        if (disposed) return;
        let interim = "";
        for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
          const piece = ev.results[i]![0]!.transcript;
          if (ev.results[i]!.isFinal) {
            finalBuffer = `${finalBuffer} ${piece}`.trim();
            options.onTranscript({
              text: finalBuffer,
              final: true,
              capturedAt: new Date().toISOString(),
            });
          } else {
            interim += piece;
          }
        }
        if (interim) {
          options.onTranscript({
            text: `${finalBuffer} ${interim}`.trim(),
            final: false,
            capturedAt: new Date().toISOString(),
          });
        }
      };
      recognition.onend = () => {
        if (disposed) return;
        if (!intentionalStop) {
          // Browser ended early — surface idle so UI can restart.
          setState("idle");
          return;
        }
        setState("processing");
        if (finalBuffer) {
          options.onTranscript({
            text: finalBuffer,
            final: true,
            capturedAt: new Date().toISOString(),
          });
        }
        setState("idle");
      };

      try {
        recognition.start();
      } catch {
        setState("unavailable");
        options.onError("Could not start speech recognition. Type your answer instead.");
      }
    },

    async stop() {
      intentionalStop = true;
      setState("processing");
      try {
        recognition?.stop();
      } catch {
        setState("idle");
      }
    },

    dispose() {
      disposed = true;
      intentionalStop = true;
      try {
        recognition?.abort();
      } catch {
        /* ignore */
      }
      recognition = null;
    },
  };
}
