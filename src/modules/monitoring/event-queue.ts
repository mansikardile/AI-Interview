import { monitoringEventSchema, type MonitoringEvent } from "@/contracts";

export type QueueSnapshot = { pending: number; message: string; blocked: boolean; dropped: number };
export interface EventStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export const pendingStorageKey = (sessionId: string) =>
  `interviewiq:pending-monitoring:${sessionId}`;

export function readPendingEvents(storage: EventStorage, sessionId: string): MonitoringEvent[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(pendingStorageKey(sessionId)) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 250).flatMap((item) => {
      const result = monitoringEventSchema.safeParse(item);
      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
}

export class MonitoringEventQueue {
  private events: MonitoringEvent[] = [];
  private known = new Set<string>();
  private listeners = new Set<() => void>();
  private snapshot: QueueSnapshot = {
    pending: 0,
    blocked: false,
    message: "No observations waiting to send.",
    dropped: 0,
  };
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<boolean> | null = null;
  private abort: AbortController | null = null;
  private attempts = 0;
  private closed = false;
  private generation = 0;
  private storage: EventStorage | null = null;
  private allowed: { focus: boolean; camera: boolean; audio: boolean } | null = null;
  constructor(
    private readonly sessionId: string,
    private send: (events: MonitoringEvent[], signal: AbortSignal) => Promise<void>,
  ) {}
  setTransport(send: (events: MonitoringEvent[], signal: AbortSignal) => Promise<void>) {
    this.send = send;
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(partial: Partial<QueueSnapshot> = {}) {
    this.snapshot = { ...this.snapshot, ...partial, pending: this.events.length };
    this.listeners.forEach((listener) => listener());
  }
  restore(storage: EventStorage) {
    this.storage = storage;
    this.closed = false;
    this.generation++;
    this.enqueue(readPendingEvents(storage, this.sessionId));
  }
  private persist() {
    try {
      if (this.events.length)
        this.storage?.setItem(pendingStorageKey(this.sessionId), JSON.stringify(this.events));
      else this.storage?.removeItem(pendingStorageKey(this.sessionId));
    } catch {
      this.update({
        message:
          "Browser storage is unavailable. Keep this page open or export pending observations.",
      });
    }
  }
  enqueue(events: MonitoringEvent[]) {
    if (this.closed) return;
    let dropped = this.snapshot.dropped;
    for (const event of events) {
      if (this.allowed && !this.allowed[event.source]) continue;
      if (this.known.has(event.id)) continue;
      if (this.events.length >= 250 || this.known.size >= 1000) {
        dropped++;
        continue;
      }
      const validated = monitoringEventSchema.parse(event);
      this.known.add(event.id);
      this.events.push(validated);
    }
    this.persist();
    this.update({ dropped });
    if (this.events.length && !this.snapshot.blocked && !this.timer) this.schedule(100);
  }
  private schedule(delay: number) {
    if (this.closed) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, delay);
  }
  private async deliver(): Promise<boolean> {
    const generation = this.generation;
    while (this.events.length && !this.closed) {
      const batch = this.events.slice(0, 50);
      const abort = new AbortController();
      this.abort = abort;
      const timeout = setTimeout(() => abort.abort(), 6000);
      try {
        await this.send(batch, abort.signal);
        if (generation !== this.generation || this.closed) return false;
        const accepted = new Set(batch.map((event) => event.id));
        this.events = this.events.filter((event) => !accepted.has(event.id));
        this.attempts = 0;
        this.persist();
        this.update({
          blocked: false,
          message: this.events.length ? "Sending observations…" : "All observations saved.",
        });
      } catch (error) {
        if (this.closed || generation !== this.generation) return false;
        this.attempts++;
        const retryable = !(
          error instanceof Error &&
          "retryable" in error &&
          error.retryable === false
        );
        const blocked = !retryable || this.attempts >= 6;
        this.update({
          blocked,
          message: blocked
            ? "Delivery paused. Pending metadata can be exported; your interview can continue."
            : "Connection interrupted. Retrying observation delivery…",
        });
        this.persist();
        if (!blocked) this.schedule(Math.min(30000, 500 * 2 ** this.attempts));
        return false;
      } finally {
        clearTimeout(timeout);
        if (this.abort === abort) this.abort = null;
      }
    }
    return this.events.length === 0;
  }
  flush(): Promise<boolean> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.closed || this.snapshot.blocked) return Promise.resolve(this.events.length === 0);
    if (this.inFlight) return this.inFlight;
    const task = this.deliver().finally(() => {
      if (this.inFlight === task) this.inFlight = null;
    });
    this.inFlight = task;
    return this.inFlight;
  }
  retry() {
    this.attempts = 0;
    this.update({ blocked: false });
    return this.flush();
  }
  discardSources(allowed: { focus: boolean; camera: boolean; audio: boolean }) {
    this.allowed = allowed;
    this.events = this.events.filter((event) => allowed[event.source]);
    this.persist();
    this.update();
  }
  pendingEvents() {
    return structuredClone(this.events);
  }
  dispose() {
    this.closed = true;
    this.generation++;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.abort?.abort();
    this.inFlight = null;
    this.persist();
  }
}
