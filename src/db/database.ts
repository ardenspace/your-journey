import {
  openDatabaseAsync,
  type SQLiteBindValue,
  type SQLiteDatabase,
} from "expo-sqlite";

/**
 * B2: the only DB surface domain/repository code may depend on.
 * Two implementations exist: expo-sqlite (app, below) and
 * better-sqlite3 in-memory (tests, `tests/support/testDb.ts`).
 * Never import expo-sqlite outside this file.
 */
export interface DB {
  run(sql: string, params?: unknown[]): Promise<void>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | null>;
}

const DB_NAME = "your-journey.db";

function asBindParams(params: unknown[]): SQLiteBindValue[] {
  return params as SQLiteBindValue[];
}

class ExpoSqliteDb implements DB {
  constructor(private readonly db: SQLiteDatabase) {}

  async run(sql: string, params: unknown[] = []): Promise<void> {
    await this.db.runAsync(sql, asBindParams(params));
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.getAllAsync<T>(sql, asBindParams(params));
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    return this.db.getFirstAsync<T>(sql, asBindParams(params));
  }
}

/** Opens the app database (expo-sqlite). App-only — never called from tests. */
export async function openAppDb(): Promise<DB> {
  const db = await openDatabaseAsync(DB_NAME);
  return new ExpoSqliteDb(db);
}
