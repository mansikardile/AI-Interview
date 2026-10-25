import type { InterviewSession } from "@/contracts";

export interface SessionRepository {
  readonly storage: "memory" | "postgres";
  create(session: InterviewSession, ownerHash: string): Promise<void>;
  getOwned(id: string, ownerHash: string): Promise<InterviewSession | null>;
  compareAndSwap(
    session: InterviewSession,
    ownerHash: string,
    expectedRevision: number,
  ): Promise<boolean>;
}

export class MemorySessionRepository implements SessionRepository {
  readonly storage = "memory" as const;
  private readonly records = new Map<string, { ownerHash: string; session: InterviewSession }>();

  async create(session: InterviewSession, ownerHash: string) {
    if (this.records.has(session.id)) throw new Error("Session ID collision");
    this.records.set(session.id, { ownerHash, session: structuredClone(session) });
  }

  async getOwned(id: string, ownerHash: string) {
    const record = this.records.get(id);
    return record?.ownerHash === ownerHash ? structuredClone(record.session) : null;
  }

  async compareAndSwap(session: InterviewSession, ownerHash: string, expectedRevision: number) {
    const record = this.records.get(session.id);
    if (!record || record.ownerHash !== ownerHash || record.session.revision !== expectedRevision)
      return false;
    this.records.set(session.id, { ownerHash, session: structuredClone(session) });
    return true;
  }
}
