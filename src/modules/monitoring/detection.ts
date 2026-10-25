// Pure state machines: no devices, network, or React. Time is monotonic milliseconds.
export class SustainedCondition<T extends string> {
  private value: T | null = null;
  private since = 0;
  private last = 0;
  private emitted = false;
  constructor(
    private readonly graceMs: number,
    private readonly maxGapMs = 1500,
  ) {}
  sample(value: T | null, now: number): number | null {
    if (value === null) {
      this.reset();
      return null;
    }
    if (value !== this.value || now - this.last > this.maxGapMs || now < this.last) {
      this.value = value;
      this.since = now;
      this.emitted = false;
    }
    this.last = now;
    if (!this.emitted && now - this.since >= this.graceMs) {
      this.emitted = true;
      return Math.min(86400000, Math.round(now - this.since));
    }
    return null;
  }
  reset() {
    this.value = null;
    this.emitted = false;
    this.last = 0;
  }
}

export class VoiceActivityTracker {
  private speech = new SustainedCondition<"speech">(300, 1500);
  private silence = new SustainedCondition<"silence">(10000, 1500);
  private speaking = false;
  sample(
    probability: number,
    now: number,
  ): { type: "speech_activity" | "silence"; durationMs: number } | null {
    if (!Number.isFinite(probability)) {
      this.reset();
      return null;
    }
    if (probability >= 0.7) this.speaking = true;
    else if (probability < 0.35) this.speaking = false;
    const duration = this.speaking
      ? this.speech.sample("speech", now)
      : this.silence.sample("silence", now);
    if (this.speaking) this.silence.reset();
    else this.speech.reset();
    return duration === null
      ? null
      : { type: this.speaking ? "speech_activity" : "silence", durationMs: duration };
  }
  reset() {
    this.speech.reset();
    this.silence.reset();
    this.speaking = false;
  }
}

export function imageQuality(pixels: Uint8ClampedArray): "good" | "dark" | "bright" | "flat" {
  let sum = 0,
    squares = 0;
  const count = pixels.length / 4;
  if (!count) return "flat";
  for (let index = 0; index < pixels.length; index += 4) {
    const luma = 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
    sum += luma;
    squares += luma * luma;
  }
  const mean = sum / count;
  if (mean < 25) return "dark";
  if (mean > 235) return "bright";
  return squares / count - mean * mean < 40 ? "flat" : "good";
}

export function mediaErrorMessage(error: unknown): string {
  switch (error instanceof Error ? error.name : "") {
    case "NotAllowedError":
      return "Permission was not granted. You can continue with typed answers or allow access in browser settings.";
    case "NotFoundError":
      return "No compatible device was found. Connect a device and retry.";
    case "NotReadableError":
      return "The device is busy or unavailable. Close other apps using it and retry.";
    case "SecurityError":
      return "Device access requires HTTPS or localhost and browser permission.";
    default:
      return "The device or local model could not start. Check model assets and browser support, then retry.";
  }
}
