import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL in .env.local before migrating.");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const sql = await readFile(path.resolve("infra/migrations/001_sessions.sql"), "utf8");
    await pool.query(sql);
    console.log("InterviewIQ session schema is ready (migration is idempotent).");
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error("Migration failed. Check DATABASE_URL and PostgreSQL; no credentials are logged.");
  process.exitCode = 1;
});
