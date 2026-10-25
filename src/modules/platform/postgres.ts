import { Pool } from "pg";
import { sessionSchema, type InterviewSession } from "@/contracts";
import type { SessionRepository } from "./repository";

export class PostgresSessionRepository implements SessionRepository {
  readonly storage = "postgres" as const;
  constructor(private readonly pool: Pool) {}

  async create(session: InterviewSession, ownerHash: string) {
    await this.pool.query(
      "INSERT INTO interview_sessions (id, owner_hash, revision, state) VALUES ($1, $2, $3, $4::jsonb)",
      [session.id, ownerHash, session.revision, JSON.stringify(session)],
    );
  }

  async getOwned(id: string, ownerHash: string) {
    const result = await this.pool.query(
      "SELECT state FROM interview_sessions WHERE id=$1 AND owner_hash=$2",
      [id, ownerHash],
    );
    return result.rows.length ? sessionSchema.parse(result.rows[0].state) : null;
  }

  async compareAndSwap(session: InterviewSession, ownerHash: string, expectedRevision: number) {
    const result = await this.pool.query(
      "UPDATE interview_sessions SET state=$1::jsonb, revision=$2, updated_at=now() WHERE id=$3 AND owner_hash=$4 AND revision=$5",
      [JSON.stringify(session), session.revision, session.id, ownerHash, expectedRevision],
    );
    return result.rowCount === 1;
  }
}
