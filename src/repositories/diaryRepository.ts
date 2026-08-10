import type { DB } from "../db/database";
import type { Diary, DiaryStyle, NewDiaryInput } from "../domain/types";

/**
 * Diary persistence over the B2 `DB` interface.
 * - Time and ids are always passed in by the caller — never generated here.
 * - Soft delete (B1): title→NULL, content→'' (privacy erase), deleted_at set;
 *   the row remains as a tombstone for Phase 2 sync. Every read/count
 *   filters `deleted_at IS NULL`.
 */

interface DiaryRow {
  id: string;
  title: string | null;
  content: string;
  question_id: string | null;
  background_color: string;
  notebook_design: DiaryStyle["notebookDesign"];
  font_family: string;
  font_size: number;
  font_color: string;
  created_at: string;
  updated_at: string;
}

const DIARY_COLUMNS =
  "id, title, content, question_id, background_color, notebook_design, " +
  "font_family, font_size, font_color, created_at, updated_at";

function rowToDiary(row: DiaryRow): Diary {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    questionId: row.question_id,
    style: {
      backgroundColor: row.background_color,
      notebookDesign: row.notebook_design,
      fontFamily: row.font_family,
      fontSize: row.font_size,
      fontColor: row.font_color,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createDiary(
  db: DB,
  input: NewDiaryInput,
  meta: { id: string; now: string },
): Promise<Diary> {
  const { style } = input;
  await db.run(
    `INSERT INTO diaries (${DIARY_COLUMNS}, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      meta.id,
      input.title ?? null,
      input.content,
      input.questionId ?? null,
      style.backgroundColor,
      style.notebookDesign,
      style.fontFamily,
      style.fontSize,
      style.fontColor,
      meta.now,
      meta.now,
    ],
  );
  return {
    id: meta.id,
    title: input.title ?? null,
    content: input.content,
    questionId: input.questionId ?? null,
    style,
    createdAt: meta.now,
    updatedAt: meta.now,
  };
}

/** Returns null for unknown ids and for soft-deleted rows. */
export async function getDiary(db: DB, id: string): Promise<Diary | null> {
  const row = await db.get<DiaryRow>(
    `SELECT ${DIARY_COLUMNS} FROM diaries
     WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  return row === null ? null : rowToDiary(row);
}

/** Live diaries, newest first (created_at DESC). */
export async function listDiaries(db: DB): Promise<Diary[]> {
  const rows = await db.all<DiaryRow>(
    `SELECT ${DIARY_COLUMNS} FROM diaries
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`,
  );
  return rows.map(rowToDiary);
}

/** Count of live diaries (journey progress counts these). */
export async function countDiaries(db: DB): Promise<number> {
  const row = await db.get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM diaries WHERE deleted_at IS NULL",
  );
  return row?.n ?? 0;
}

/**
 * Updates title/content/style; omitted fields stay unchanged
 * (`title: null` clears the title). created_at and question_id are
 * never touched (Requirement 8); updated_at is set to `now`.
 */
export async function updateDiary(
  db: DB,
  id: string,
  patch: { title?: string | null; content?: string; style?: DiaryStyle },
  now: string,
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (patch.title !== undefined) {
    sets.push("title = ?");
    params.push(patch.title);
  }
  if (patch.content !== undefined) {
    sets.push("content = ?");
    params.push(patch.content);
  }
  if (patch.style !== undefined) {
    sets.push(
      "background_color = ?",
      "notebook_design = ?",
      "font_family = ?",
      "font_size = ?",
      "font_color = ?",
    );
    params.push(
      patch.style.backgroundColor,
      patch.style.notebookDesign,
      patch.style.fontFamily,
      patch.style.fontSize,
      patch.style.fontColor,
    );
  }
  sets.push("updated_at = ?");
  params.push(now, id);

  await db.run(
    `UPDATE diaries SET ${sets.join(", ")}
     WHERE id = ? AND deleted_at IS NULL`,
    params,
  );
}

/**
 * B1 soft delete: erases title/content immediately (privacy) and marks
 * the tombstone with deleted_at. The row itself remains for Phase 2 sync.
 */
export async function softDeleteDiary(
  db: DB,
  id: string,
  now: string,
): Promise<void> {
  await db.run(
    `UPDATE diaries
     SET title = NULL, content = '', deleted_at = ?, updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
    [now, now, id],
  );
}
