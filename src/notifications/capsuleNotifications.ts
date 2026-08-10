/**
 * Capsule notifications (B3): the OS boundary for time-capsule reminders.
 *
 * This is the ONLY file in the app that imports expo-notifications — every
 * screen and repository goes through this seam.
 *
 * B3 rules enforced here:
 * - 원칙 1: the notification NEVER carries diary content or title. Payload is
 *   the fixed strings below plus `{ diaryId, type: 'capsule' }` — nothing else.
 * - 봉인은 알림에 의존하지 않는다: permission denial and scheduler errors
 *   degrade silently to `null` (the capsule still seals and can be opened
 *   from the list; the caller stores `notification_id = NULL`).
 * - Approximate delivery is fine — DATE trigger, no SCHEDULE_EXACT_ALARM.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { openInstant } from "../domain/capsuleRules";

const CAPSULE_CHANNEL_ID = "capsule";
const CAPSULE_CHANNEL_NAME = "타임캡슐";

const NOTIFICATION_TITLE = "당신의 여정";
const NOTIFICATION_BODY =
  "봉인해 두신 이야기가 열렸어요. 그날의 마음을 다시 만나 보세요.";

// Foreground behavior: show the banner even while the app is open (B3).
// No badge — the app never nags with unread counts (원칙 3).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * True iff notification permission is (or becomes) granted. On Android also
 * ensures the `capsule` channel exists before anything is scheduled on it.
 */
async function ensurePermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) {
    return false;
  }
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CAPSULE_CHANNEL_ID, {
      name: CAPSULE_CHANNEL_NAME,
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  return true;
}

/**
 * Schedule the capsule-opened notification for `openDate` at local 9am
 * (via `openInstant` — the single source of the 9am rule).
 *
 * Returns the scheduler's notification id (store it as `notification_id`),
 * or `null` when permission is denied or scheduling fails — sealing proceeds
 * without a notification in that case.
 */
export async function scheduleCapsuleNotification(
  diaryId: string,
  openDate: string
): Promise<string | null> {
  try {
    if (!(await ensurePermission())) {
      return null;
    }
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: NOTIFICATION_TITLE,
        body: NOTIFICATION_BODY,
        data: { diaryId, type: "capsule" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: openInstant(openDate),
        channelId: CAPSULE_CHANNEL_ID,
      },
    });
  } catch {
    // Silent degradation: the capsule can still be opened from the list.
    return null;
  }
}

/**
 * Cancel a previously scheduled capsule notification. `null` means no
 * notification was ever scheduled (permission was denied) — skip silently.
 * Cancellation errors are swallowed: deletion must never fail on this step.
 */
export async function cancelCapsuleNotification(
  notificationId: string | null
): Promise<void> {
  if (notificationId === null) {
    return;
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Swallow: an already-fired or unknown id is not a failure.
  }
}
