import type { DB } from "../db/database";
import { cancelCapsuleNotification } from "../notifications/capsuleNotifications";
import { deleteCapsuleForDiary, getCapsuleForDiary } from "./capsuleRepository";
import { softDeleteDiary } from "./diaryRepository";

/**
 * Delete flow (Requirement 8 / B3): 알림 취소 → 캡슐 행 → 일기 톰스톤.
 *
 * No transaction — partial failure is allowed by design and a failed later
 * step never undoes an earlier one:
 * - notification lookup/cancel failures are swallowed (an already-fired or
 *   unknown id is not a failure; `notification_id = NULL` skips the call);
 * - a failed capsule-row delete is swallowed too (a leftover row is cleaned
 *   up by a later delete attempt — spec B3);
 * - only the diary tombstone decides the outcome: `false` means the diary
 *   is still fully alive and the caller should ask the user to try again
 *   ("잠시 후 다시 한번 눌러 주세요") — it must never half-vanish.
 *
 * Soft delete semantics (B1): the user sees a complete deletion — title and
 * content are erased immediately and the diary never reappears anywhere.
 */
export async function deleteDiaryFlow(
  db: DB,
  diaryId: string,
  now: string,
): Promise<boolean> {
  // (1) Cancel the scheduled notification, if one was ever scheduled.
  try {
    const capsule = await getCapsuleForDiary(db, diaryId);
    if (capsule !== null && capsule.notificationId !== null) {
      await cancelCapsuleNotification(capsule.notificationId);
    }
  } catch {
    // Swallow: deletion never fails on the notification step.
  }

  // (2) Remove the capsule row (silent no-op for normal diaries).
  try {
    await deleteCapsuleForDiary(db, diaryId);
  } catch {
    // Swallow: a leftover capsule row is acceptable partial failure.
  }

  // (3) Tombstone the diary — the only step whose failure surfaces.
  try {
    await softDeleteDiary(db, diaryId, now);
    return true;
  } catch {
    return false;
  }
}
