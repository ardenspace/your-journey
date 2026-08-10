import type { DB } from "./database";

/**
 * B1: the 3-table schema. Every statement is idempotent (IF NOT EXISTS)
 * so migrate() can run on every app start.
 *
 * Semantics pinned by src/db/__tests__/schema.test.ts:
 * - diaries uses soft delete: on delete, title/content are blanked
 *   immediately (privacy) and deleted_at is set; all queries and counts
 *   must filter `deleted_at IS NULL`. Tombstones exist for Phase 2 sync.
 * - instants are UTC ISO 8601 strings; calendar days are local-timezone.
 * - settings values: question_mode 'on'|'off'; question_state and
 *   last_style are JSON strings (corrupted JSON resets to defaults,
 *   handled at the repository layer).
 */
export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS diaries (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT NOT NULL,
    question_id TEXT,
    background_color TEXT,
    notebook_design TEXT,
    font_family TEXT,
    font_size INTEGER,
    font_color TEXT,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS capsules (
    id TEXT PRIMARY KEY,
    diary_id TEXT REFERENCES diaries(id),
    open_date TEXT,
    opened_at TEXT,
    notification_id TEXT,
    created_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_diaries_created_at
     ON diaries (created_at DESC)`,
];

export async function migrate(db: DB): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await db.run(statement);
  }
}
