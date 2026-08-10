import Database from "better-sqlite3";
import type { DB } from "../../src/db/database";

/**
 * Test adapter for the B2 `DB` interface, backed by better-sqlite3
 * :memory: (expo-sqlite cannot run under jest). Must stay
 * behavior-compatible with the expo-sqlite adapter in
 * src/db/database.ts — the contract suite in
 * src/db/__tests__/database.contract.test.ts pins the shared semantics.
 */
export function createTestDb(): DB {
  const db = new Database(":memory:");
  return {
    async run(sql: string, params: unknown[] = []): Promise<void> {
      db.prepare(sql).run(...params);
    },
    async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return db.prepare(sql).all(...params) as T[];
    },
    async get<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      const row = db.prepare(sql).get(...params) as T | undefined;
      return row ?? null;
    },
  };
}
