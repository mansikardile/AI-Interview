import type { MonitoringDependencies, FaceAnalyzer, VoiceAnalyzer } from "../types";
import { imageQuality } from "../detection";

export async function createFaceAnalyzer(): Promise<FaceAnalyzer> {
  const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks("/monitoring/vendor/vision");
  const detector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "/monitoring/models/blaze_face_short_range-v1.tflite",
      delegate: "CPU",
    },
    runningMode: "VIDEO",
    minDetectionConfidence: 0.65,
    minSuppressionThreshold: 0.3,
  });
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 48;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    detector.close();
    throw new Error("Canvas unavailable");
  }
  return {
    inspect(source, timestamp) {
      context.drawImage(source, 0, 0, 64, 48);
      const quality = imageQuality(context.getImageData(0, 0, 64, 48).data);
      // Unreliable frames are never converted into no-face observations.
      return {
        quality,
        faces:
          quality === "good" ? detector.detectForVideo(source, timestamp).detections.length : 0,
      };
    },
    close() {
      detector.close();
      canvas.width = canvas.height = 0;
    },
  };
}

export async function createVoiceAnalyzer(
  stream: MediaStream,
  onFrame: (probability: number, rms: number) => void,
): Promise<VoiceAnalyzer> {
  const { MicVAD } = await import("@ricky0123/vad-web");
  let vad: Awaited<ReturnType<typeof MicVAD.new>> | null = null;
  let context: AudioContext | null = null;
  let starting: Promise<void> | null = null;
  let destroying: Promise<void> | null = null;
  let closed = false;
  const options = {
    model: "v5" as const,
    startOnLoad: true,
    baseAssetPath: "/monitoring/vendor/vad/",
    onnxWASMBasePath: "/monitoring/vendor/ort/",
    ortConfig(ort: typeof import("onnxruntime-web/wasm")) {
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
    },
    getStream: async () => stream,
    pauseStream: async () => {}, // The controller owns the stream and releases it on stop.
    resumeStream: async () => stream,
    onFrameProcessed(probabilities: { isSpeech: number }, frame: Float32Array) {
      const rms = Math.sqrt(frame.reduce((sum, value) => sum + value * value, 0) / frame.length);
      onFrame(probabilities.isSpeech, rms);
    },
    // Never retain speech buffers, record them, or transmit them.
    onSpeechEnd: () => {},
  };
  return {
    start() {
      if (closed) return Promise.resolve();
      if (!starting)
        starting = (async () => {
          context = new AudioContext();
          await context.resume();
          vad = await MicVAD.new({ ...options, audioContext: context });
        })();
      return starting;
    },
    destroy() {
      closed = true;
      if (!destroying)
        destroying = (async () => {
          try {
            await starting;
          } catch {
            /* Release our context even if upstream initialization failed. */
          }
          try {
            if (vad) await vad.destroy();
          } finally {
            if (context && context.state !== "closed") await context.close();
          }
        })();
      return destroying;
    },
  };
}

export const browserDependencies: MonitoringDependencies = {
  getMedia: (constraints) => {
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      return Promise.reject(new DOMException("Secure device access unavailable", "SecurityError"));
    }
    return navigator.mediaDevices.getUserMedia(constraints);
  },
  loadFace: createFaceAnalyzer,
  loadVoice: createVoiceAnalyzer,
  now: () => performance.now(),
  timestamp: () => new Date().toISOString(),
  id: () => crypto.randomUUID(),
  hidden: () => document.hidden,
  appSpeaking: () => typeof speechSynthesis !== "undefined" && speechSynthesis.speaking,
};
