import type { DB } from "../db/database";
import type { Capsule } from "../domain/types";

/**
 * Capsule persistence over the B2 `DB` interface (B1 `capsules` table).
 * - Time and ids are always passed in by the caller — never generated here.
 * - `open_date` is a local calendar day `YYYY-MM-DD` computed once at
 *   sealing time (src/domain/capsuleRules.ts); instants are UTC ISO 8601.
 * - `notification_id` is the device-local OS handle; NULL when permission
 *   was denied or scheduling failed (sealing never depends on it).
 * - Deletion order lives in the delete flow (알림 취소 → 캡슐 → 일기);
 *   this module only provides the row removal.
 */

interface CapsuleRow {
  id: string;
  diary_id: string;
  open_date: string;
  opened_at: string | null;
  notification_id: string | null;
  created_at: string;
}

const CAPSULE_COLUMNS =
  "id, diary_id, open_date, opened_at, notification_id, created_at";

function rowToCapsule(row: CapsuleRow): Capsule {
  return {
    id: row.id,
    diaryId: row.diary_id,
    openDate: row.open_date,
    openedAt: row.opened_at,
    notificationId: row.notification_id,
    createdAt: row.created_at,
  };
}

/** Seals a diary: inserts a capsule row with openedAt/notificationId NULL. */
export async function sealDiary(
  db: DB,
  diaryId: string,
  openDate: string,
  meta: { id: string; now: string },
): Promise<Capsule> {
  await db.run(
    `INSERT INTO capsules (${CAPSULE_COLUMNS})
     VALUES (?, ?, ?, NULL, NULL, ?)`,
    [meta.id, diaryId, openDate, meta.now],
  );
  return {
    id: meta.id,
    diaryId,
    openDate,
    openedAt: null,
    notificationId: null,
    createdAt: meta.now,
  };
}

/** Returns null when the diary has no capsule (a normal diary). */
export async function getCapsuleForDiary(
  db: DB,
  diaryId: string,
): Promise<Capsule | null> {
  const row = await db.get<CapsuleRow>(
    `SELECT ${CAPSULE_COLUMNS} FROM capsules WHERE diary_id = ?`,
    [diaryId],
  );
  return row === null ? null : rowToCapsule(row);
}

/** All capsules, soonest opening first (open_date ASC). */
export async function listCapsules(db: DB): Promise<Capsule[]> {
  const rows = await db.all<CapsuleRow>(
    `SELECT ${CAPSULE_COLUMNS} FROM capsules ORDER BY open_date ASC`,
  );
  return rows.map(rowToCapsule);
}

/** Records the explicit opening instant — once opened, forever open. */
export async function markOpened(
  db: DB,
  capsuleId: string,
  now: string,
): Promise<void> {
  await db.run("UPDATE capsules SET opened_at = ? WHERE id = ?", [
    now,
    capsuleId,
  ]);
}

/** Stores the OS notification handle after scheduling succeeds. */
export async function setNotificationId(
  db: DB,
  capsuleId: string,
  notificationId: string,
): Promise<void> {
  await db.run("UPDATE capsules SET notification_id = ? WHERE id = ?", [
    notificationId,
    capsuleId,
  ]);
}

/**
 * Removes the capsule row for a diary (delete flow, Phase 4).
 * Silent no-op when the diary has no capsule.
 */
export async function deleteCapsuleForDiary(
  db: DB,
  diaryId: string,
): Promise<void> {
  await db.run("DELETE FROM capsules WHERE diary_id = ?", [diaryId]);
}
