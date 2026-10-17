import type { DB } from "./database";
import { DEFAULT_STYLE } from "../domain/types";

/**
 * B1: the 3-table schema, reached through `PRAGMA user_version`-ordered
 * migrations (dec-0006). migrate() runs on every app start and is a no-op
 * once user_version equals LATEST_VERSION.
 *
 * - user_version 0 = an empty DB or a talpi v1 install (V0_SCHEMA_STATEMENTS).
 *   Both take the same path: migration 1 first creates any missing v0 tables,
 *   then rebuilds every table into the constrained final shape.
 * - Constraint changes use SQLite's table-rebuild procedure: foreign_keys OFF
 *   outside the transaction, BEGIN, create `<table>_new`, copy, DROP, RENAME,
 *   `PRAGMA foreign_key_check` must be empty, COMMIT, restore foreign_keys.
 *   One transaction per migration; user_version is bumped inside it, so a
 *   failure rolls back to the original tables, rows and user_version.
 * - Final constraints (dec-0005): every diaries/capsules/settings column is
 *   NOT NULL except diaries.title (tombstones), question_id, deleted_at and
 *   capsules.opened_at, notification_id. capsules.diary_id is UNIQUE across
 *   all diaries, tombstones included (at most one capsule per diary).
 * - Rows that violate those constraints are repaired, never aborted on, and
 *   no diaries row is deleted (dec-0007; see migrateV1).
 *
 * Semantics pinned by src/db/__tests__/schema.test.ts and migration.test.ts:
 * - diaries uses soft delete: on delete, title/content are blanked
 *   immediately (privacy) and deleted_at is set; all queries and counts
 *   must filter `deleted_at IS NULL`. Tombstones exist for Phase 2 sync.
 * - instants are UTC ISO 8601 strings; calendar days are local-timezone.
 * - settings values: question_mode 'on'|'off'; question_state and
 *   last_style are JSON strings (corrupted JSON resets to defaults,
 *   handled at the repository layer).
 */

/**
 * Frozen talpi v1 schema (user_version 0). Never edit: installed DBs have
 * exactly these tables. Migration 1 creates them on an empty DB so new
 * installs and upgrades share one path; tests build v0 fixtures from them.
 */
export const V0_SCHEMA_STATEMENTS: readonly string[] = [
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

type Table = "diaries" | "capsules" | "settings";

/**
 * The final schema, defined once. Each builder takes the table name to
 * create so the rebuild can create `<table>_new` and rename it afterwards.
 * capsules always references `diaries`, which is the rebuilt table once the
 * rename completes.
 */
const FINAL_TABLES: Record<Table, (name: string) => string> = {
  diaries: (name) => `CREATE TABLE ${name} (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT NOT NULL,
    question_id TEXT,
    background_color TEXT NOT NULL,
    notebook_design TEXT NOT NULL,
    font_family TEXT NOT NULL,
    font_size INTEGER NOT NULL,
    font_color TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  )`,
  capsules: (name) => `CREATE TABLE ${name} (
    id TEXT PRIMARY KEY,
    diary_id TEXT NOT NULL UNIQUE REFERENCES diaries(id),
    open_date TEXT NOT NULL,
    opened_at TEXT,
    notification_id TEXT,
    created_at TEXT NOT NULL
  )`,
  settings: (name) => `CREATE TABLE ${name} (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
};

const FINAL_INDEXES: readonly string[] = [
  `CREATE INDEX IF NOT EXISTS idx_diaries_created_at
     ON diaries (created_at DESC)`,
];

export interface Migration {
  /** user_version after this migration commits. Strictly increasing. */
  version: number;
  /** Runs inside the migration's transaction. `now` is the migration time. */
  up(db: DB, now: string): Promise<void>;
}

/**
 * v0 → v1: create missing v0 tables, then rebuild all three tables with the
 * dec-0005 constraints, repairing violating rows per dec-0007:
 * - diaries style NULL → DEFAULT_STYLE; created_at NULL → updated_at, else
 *   now; updated_at NULL → created_at, else now. No diaries row is dropped.
 * - capsules with NULL/dangling diary_id or NULL open_date are dropped;
 *   created_at NULL → now; of the remaining duplicates per diary_id the
 *   earliest created_at (tie: lowest id) is kept. Notifications of dropped
 *   capsules are left alone.
 * - settings with NULL value are dropped (repositories fall back to defaults).
 */
async function migrateV1(db: DB, now: string): Promise<void> {
  for (const statement of V0_SCHEMA_STATEMENTS) {
    await db.run(statement);
  }

  for (const table of ["diaries", "capsules", "settings"] as const) {
    await db.run(FINAL_TABLES[table](`${table}_new`));
  }

  await db.run(
    `INSERT INTO diaries_new
       (id, title, content, question_id, background_color, notebook_design,
        font_family, font_size, font_color, created_at, updated_at, deleted_at)
     SELECT id, title, content, question_id,
            COALESCE(background_color, ?),
            COALESCE(notebook_design, ?),
            COALESCE(font_family, ?),
            COALESCE(font_size, ?),
            COALESCE(font_color, ?),
            COALESCE(created_at, updated_at, ?),
            COALESCE(updated_at, created_at, ?),
            deleted_at
       FROM diaries`,
    [
      DEFAULT_STYLE.backgroundColor,
      DEFAULT_STYLE.notebookDesign,
      DEFAULT_STYLE.fontFamily,
      DEFAULT_STYLE.fontSize,
      DEFAULT_STYLE.fontColor,
      now,
      now,
    ]
  );

  await db.run(
    `INSERT INTO capsules_new
       (id, diary_id, open_date, opened_at, notification_id, created_at)
     SELECT id, diary_id, open_date, opened_at, notification_id, created_at
       FROM (
         SELECT c.id, c.diary_id, c.open_date, c.opened_at, c.notification_id,
                COALESCE(c.created_at, ?) AS created_at,
                ROW_NUMBER() OVER (
                  PARTITION BY c.diary_id
                  ORDER BY COALESCE(c.created_at, ?), c.id
                ) AS rn
           FROM capsules c
          WHERE c.open_date IS NOT NULL
            AND c.diary_id IN (SELECT id FROM diaries)
       )
      WHERE rn = 1`,
    [now, now]
  );

  await db.run(
    `INSERT INTO settings_new (key, value)
     SELECT key, value FROM settings WHERE value IS NOT NULL`
  );

  // Children first; foreign_keys is OFF so no implicit cascade runs.
  for (const table of ["capsules", "diaries", "settings"] as const) {
    await db.run(`DROP TABLE ${table}`);
  }
  for (const table of ["diaries", "capsules", "settings"] as const) {
    await db.run(`ALTER TABLE ${table}_new RENAME TO ${table}`);
  }
  for (const statement of FINAL_INDEXES) {
    await db.run(statement);
  }
}

export const MIGRATIONS: readonly Migration[] = [{ version: 1, up: migrateV1 }];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

async function userVersion(db: DB): Promise<number> {
  const row = await db.get<{ user_version: number }>("PRAGMA user_version");
  return row?.user_version ?? 0;
}

/**
 * Runs one migration in its own transaction with foreign_keys explicitly
 * OFF (the adapters differ: better-sqlite3 defaults ON, expo-sqlite OFF),
 * then restores the previous foreign_keys value whatever the outcome.
 */
async function applyMigration(
  db: DB,
  migration: Migration,
  now: string
): Promise<void> {
  const fk = await db.get<{ foreign_keys: number }>("PRAGMA foreign_keys");
  const previousForeignKeys = fk?.foreign_keys === 1 ? "ON" : "OFF";

  await db.run("PRAGMA foreign_keys = OFF");
  try {
    await db.run("BEGIN");
    try {
      await migration.up(db, now);
      const violations = await db.all("PRAGMA foreign_key_check");
      if (violations.length > 0) {
        throw new Error(
          `migration ${migration.version}: foreign_key_check failed`
        );
      }
      await db.run(`PRAGMA user_version = ${migration.version}`);
      await db.run("COMMIT");
    } catch (error) {
      try {
        await db.run("ROLLBACK");
      } catch {
        // SQLite may already have rolled back; keep the original error.
      }
      throw error;
    }
  } finally {
    await db.run(`PRAGMA foreign_keys = ${previousForeignKeys}`);
  }
}

/**
 * Brings the DB to LATEST_VERSION. Runs on every app start (DbProvider);
 * a failure leaves the DB as it was and rejects. `migrations` and `now`
 * are injectable for tests only.
 */
export async function migrate(
  db: DB,
  options: { migrations?: readonly Migration[]; now?: () => string } = {}
): Promise<void> {
  const migrations = options.migrations ?? MIGRATIONS;
  const now = options.now ?? (() => new Date().toISOString());

  let version = await userVersion(db);
  for (const migration of migrations) {
    if (!Number.isInteger(migration.version)) {
      throw new Error(`migration version must be an integer: ${migration.version}`);
    }
    if (migration.version <= version) {
      continue;
    }
    await applyMigration(db, migration, now());
    version = migration.version;
  }
}
