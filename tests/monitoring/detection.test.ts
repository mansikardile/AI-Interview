import { describe, expect, it } from "vitest";
import {
  SustainedCondition,
  VoiceActivityTracker,
  imageQuality,
  mediaErrorMessage,
} from "@/modules/monitoring/detection";

describe("monitoring signal interpretation", () => {
  it("emits once per sustained condition, resets on recovery, and rejects timer gaps", () => {
    const condition = new SustainedCondition<"none">(3000);
    expect(condition.sample("none", 0)).toBeNull();
    for (let at = 250; at < 3000; at += 250) expect(condition.sample("none", at)).toBeNull();
    expect(condition.sample("none", 3000)).toBe(3000);
    expect(condition.sample("none", 3250)).toBeNull();
    condition.sample(null, 3500);
    expect(condition.sample("none", 4000)).toBeNull();
    expect(condition.sample("none", 20000)).toBeNull();
  });
  it("does not turn dark, bright or blank frames into no-face evidence", () => {
    const pixels = (value: number) =>
      new Uint8ClampedArray(Array.from({ length: 100 }, () => [value, value, value, 255]).flat());
    expect(imageQuality(pixels(0))).toBe("dark");
    expect(imageQuality(pixels(255))).toBe("bright");
    expect(imageQuality(pixels(100))).toBe("flat");
    expect(imageQuality(new Uint8ClampedArray([...pixels(40), ...pixels(180)]))).toBe("good");
  });
  it("requires sustained speech and records long silence once, separately from activity", () => {
    const tracker = new VoiceActivityTracker();
    expect(tracker.sample(0.9, 0)).toBeNull();
    expect(tracker.sample(0.9, 300)).toEqual({ type: "speech_activity", durationMs: 300 });
    expect(tracker.sample(0.9, 600)).toBeNull();
    for (let at = 1000; at < 11000; at += 500) expect(tracker.sample(0.1, at)).toBeNull();
    expect(tracker.sample(0.1, 11000)).toEqual({ type: "silence", durationMs: 10000 });
    expect(tracker.sample(0.1, 11500)).toBeNull();
    tracker.reset();
    expect(tracker.sample(0.1, 12000)).toBeNull();
  });
  it("uses hysteresis and resets on invalid data rather than inventing silence", () => {
    const tracker = new VoiceActivityTracker();
    tracker.sample(0.8, 0);
    expect(tracker.sample(0.5, 400)).toEqual({ type: "speech_activity", durationMs: 400 });
    expect(tracker.sample(Number.NaN, 500)).toBeNull();
    expect(tracker.sample(0.5, 600)).toBeNull();
  });
  it("reports permission and device failures neutrally", () => {
    expect(mediaErrorMessage(new DOMException("denied", "NotAllowedError"))).toContain(
      "Permission",
    );
    expect(mediaErrorMessage(new DOMException("missing", "NotFoundError"))).toContain(
      "No compatible",
    );
    expect(mediaErrorMessage(new DOMException("busy", "NotReadableError"))).toContain("busy");
  });
});
