import type { DB } from "../db/database";
import { DEFAULT_STYLE, type DiaryStyle } from "../domain/types";
import {
  initialQuestionState,
  type QuestionState,
} from "../domain/questionEngine";

/**
 * Settings persistence over the B2 `DB` interface (B1 `settings` table).
 * Keys and value shapes are defined in spec B1:
 * - `question_mode`: 'on' | 'off' — default on when unset
 * - `question_state`: JSON QuestionState
 * - `last_style`: JSON DiaryStyle
 *
 * Corrupted/unparseable JSON silently resets to the default (B1) — the
 * getter returns the default without throwing and without surfacing
 * anything to the user. No self-heal write happens on read; the next
 * save simply overwrites the corrupted value.
 */

const QUESTION_MODE_KEY = "question_mode";
const QUESTION_STATE_KEY = "question_state";
const LAST_STYLE_KEY = "last_style";

export async function getSetting(db: DB, key: string): Promise<string | null> {
  const row = await db.get<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [key],
  );
  return row === null ? null : row.value;
}

export async function setSetting(
  db: DB,
  key: string,
  value: string,
): Promise<void> {
  await db.run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

/** Silent-reset JSON read: unset or unparseable → `fallback` (B1). */
async function getJsonSetting<T>(
  db: DB,
  key: string,
  fallback: T,
): Promise<T> {
  const raw = await getSetting(db, key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Question mode defaults to on when the key has never been written. */
export async function isQuestionMode(db: DB): Promise<boolean> {
  const value = await getSetting(db, QUESTION_MODE_KEY);
  return value !== "off";
}

export async function setQuestionMode(db: DB, on: boolean): Promise<void> {
  await setSetting(db, QUESTION_MODE_KEY, on ? "on" : "off");
}

export async function getQuestionState(db: DB): Promise<QuestionState> {
  return getJsonSetting(db, QUESTION_STATE_KEY, initialQuestionState);
}

export async function saveQuestionState(
  db: DB,
  state: QuestionState,
): Promise<void> {
  await setSetting(db, QUESTION_STATE_KEY, JSON.stringify(state));
}

export async function getLastStyle(db: DB): Promise<DiaryStyle> {
  return getJsonSetting(db, LAST_STYLE_KEY, DEFAULT_STYLE);
}

export async function saveLastStyle(
  db: DB,
  style: DiaryStyle,
): Promise<void> {
  await setSetting(db, LAST_STYLE_KEY, JSON.stringify(style));
}
