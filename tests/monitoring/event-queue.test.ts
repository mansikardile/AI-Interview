import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MonitoringEventQueue,
  pendingStorageKey,
  readPendingEvents,
} from "@/modules/monitoring/event-queue";
import type { MonitoringEvent } from "@/contracts";

function event(): MonitoringEvent {
  return {
    id: crypto.randomUUID(),
    source: "focus",
    type: "page_hidden",
    occurredAt: new Date().toISOString(),
  };
}
function storageFixture() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

describe("bounded, retry-safe observation delivery", () => {
  let queues: MonitoringEventQueue[];
  beforeEach(() => {
    vi.useFakeTimers();
    queues = [];
  });
  afterEach(() => {
    queues.forEach((queue) => queue.dispose());
    vi.useRealTimers();
  });
  function queue(send: (events: MonitoringEvent[], signal: AbortSignal) => Promise<void>) {
    const value = new MonitoringEventQueue("test", send);
    queues.push(value);
    return value;
  }

  it("batches at 50 and deduplicates IDs including replayed observations", async () => {
    const send = vi.fn(async () => {});
    const q = queue(send);
    const events = Array.from({ length: 75 }, event);
    q.enqueue([...events, events[0]]);
    await q.flush();
    expect(send.mock.calls).toHaveLength(2);
    expect(q.getSnapshot().pending).toBe(0);
    q.enqueue([events[0]]);
    await q.flush();
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("retries the original IDs after a transient failure and persists pending metadata", async () => {
    const storage = storageFixture();
    const send = vi
      .fn<(events: MonitoringEvent[], signal: AbortSignal) => Promise<void>>()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValue(undefined);
    const q = queue(send);
    q.restore(storage);
    const item = event();
    q.enqueue([item]);
    expect(await q.flush()).toBe(false);
    expect(readPendingEvents(storage, "test")).toEqual([item]);
    expect(await q.retry()).toBe(true);
    expect(send.mock.calls[1][0][0].id).toBe(item.id);
    expect(storage.getItem(pendingStorageKey("test"))).toBeNull();
  });
  it("caps pending metadata and pauses on permanent errors", async () => {
    const error = Object.assign(new Error("Session complete"), { retryable: false });
    const send = vi.fn(async () => {
      throw error;
    });
    const q = queue(send);
    q.enqueue(Array.from({ length: 260 }, event));
    await q.flush();
    expect(q.getSnapshot()).toMatchObject({ pending: 250, dropped: 10, blocked: true });
    await vi.advanceTimersByTimeAsync(60000);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("drops unsent revoked-source events and validates restored metadata", () => {
    const storage = storageFixture();
    storage.setItem(pendingStorageKey("test"), JSON.stringify([event(), { rawVideo: "invalid" }]));
    expect(readPendingEvents(storage, "test")).toHaveLength(1);
    const q = queue(async () => {});
    q.restore(storage);
    q.discardSources({ focus: false, audio: false, camera: false });
    expect(q.getSnapshot().pending).toBe(0);
  });
  it("never restores observations for sources whose consent was revoked before mount", () => {
    const storage = storageFixture();
    storage.setItem(pendingStorageKey("test"), JSON.stringify([event()]));
    const q = queue(async () => {});
    q.discardSources({ focus: false, camera: false, audio: false });
    q.restore(storage);
    expect(q.getSnapshot().pending).toBe(0);
    expect(storage.getItem(pendingStorageKey("test"))).toBeNull();
  });
  it("restores after navigation and keeps in-flight batches idempotent", async () => {
    const storage = storageFixture();
    const first = queue(async () => {
      throw new TypeError("offline");
    });
    first.restore(storage);
    const item = event();
    first.enqueue([item]);
    await first.flush();
    first.dispose();
    const send = vi.fn(async () => {});
    const next = queue(send);
    next.restore(storage);
    await next.flush();
    expect(send).toHaveBeenCalledWith([item], expect.any(AbortSignal));
  });
  it("aborts pending delivery on disposal and ignores its late failure after remount", async () => {
    let reject!: (error: Error) => void;
    const send = vi
      .fn<(events: MonitoringEvent[], signal: AbortSignal) => Promise<void>>()
      .mockImplementationOnce(
        () =>
          new Promise((_, fail) => {
            reject = fail;
          }),
      )
      .mockResolvedValue(undefined);
    const q = queue(send);
    const storage = storageFixture();
    q.restore(storage);
    q.enqueue([event()]);
    const previous = q.flush();
    const signal = send.mock.calls[0][1];
    q.dispose();
    expect(signal.aborted).toBe(true);
    q.restore(storage);
    reject(new Error("late abort"));
    await previous;
    expect(await q.flush()).toBe(true);
    expect(q.getSnapshot().blocked).toBe(false);
  });
});
