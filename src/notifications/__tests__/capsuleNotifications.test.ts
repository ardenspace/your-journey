/**
 * B3 contract tests: local notification payload (OS boundary).
 *
 * `src/notifications/capsuleNotifications.ts` is the only file that imports
 * expo-notifications. Jest cannot load the native module, so the boundary is
 * mocked and the tests pin the exact arguments crossing it — the payload the
 * OS receives is the contract.
 *
 * 원칙 1: 알림에는 일기 내용이 절대 실리지 않는다 — content 는 고정 문구와
 * `{ diaryId, type }` 뿐임을 완전 일치로 고정한다.
 */

jest.mock("expo-notifications", () => ({
  __esModule: true,
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  AndroidImportance: { HIGH: 6 },
  SchedulableTriggerInputTypes: { DATE: "date" },
}));

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { openInstant } from "../../domain/capsuleRules";
import {
  cancelCapsuleNotification,
  scheduleCapsuleNotification,
} from "../capsuleNotifications";

const N = jest.mocked(Notifications);

function permission(granted: boolean): Notifications.NotificationPermissionsStatus {
  return { granted } as Notifications.NotificationPermissionsStatus;
}

beforeEach(() => {
  // setNotificationHandler is intentionally NOT reset: it is called once at
  // module load and its recorded call is itself part of the contract (test 6).
  N.getPermissionsAsync.mockReset();
  N.requestPermissionsAsync.mockReset();
  N.scheduleNotificationAsync.mockReset();
  N.setNotificationChannelAsync.mockReset().mockResolvedValue(null);
  N.cancelScheduledNotificationAsync.mockReset().mockResolvedValue(undefined);
  jest.replaceProperty(Platform, "OS", "android");
});

describe("scheduleCapsuleNotification (B3: payload)", () => {
  test("granted permission: schedules the exact fixed payload at openInstant(openDate) on channel 'capsule' and returns the scheduler's id", async () => {
    N.getPermissionsAsync.mockResolvedValue(permission(true));
    N.scheduleNotificationAsync.mockResolvedValue("notif-42");

    const result = await scheduleCapsuleNotification("diary-1", "2026-09-10");

    expect(result).toBe("notif-42");
    expect(N.scheduleNotificationAsync).toHaveBeenCalledTimes(1);

    const request = N.scheduleNotificationAsync.mock.calls[0]![0];
    // 원칙 1: content is EXACTLY this — no diary content, no diary title.
    expect(request.content).toEqual({
      title: "당신의 여정",
      body: "봉인해 두신 이야기가 열렸어요. 그날의 마음을 다시 만나 보세요.",
      data: { diaryId: "diary-1", type: "capsule" },
    });

    const trigger = request.trigger as Notifications.DateTriggerInput;
    expect(trigger.type).toBe(Notifications.SchedulableTriggerInputTypes.DATE);
    expect(trigger.channelId).toBe("capsule");
    const date = trigger.date as Date;
    expect(date.getTime()).toBe(openInstant("2026-09-10").getTime());
    // openInstant = the open day at 9am LOCAL time.
    expect(date.getTime()).toBe(new Date(2026, 8, 10, 9, 0, 0, 0).getTime());
  });

  test("data carries ONLY diaryId and type — nothing else ever rides along", async () => {
    N.getPermissionsAsync.mockResolvedValue(permission(true));
    N.scheduleNotificationAsync.mockResolvedValue("notif-1");

    await scheduleCapsuleNotification("diary-77", "2027-01-05");

    const request = N.scheduleNotificationAsync.mock.calls[0]![0];
    expect(Object.keys(request.content.data ?? {}).sort()).toEqual([
      "diaryId",
      "type",
    ]);
    expect(request.content.data).toEqual({ diaryId: "diary-77", type: "capsule" });
  });

  test("permission denied (existing not granted, request denied): returns null without scheduling", async () => {
    N.getPermissionsAsync.mockResolvedValue(permission(false));
    N.requestPermissionsAsync.mockResolvedValue(permission(false));

    const result = await scheduleCapsuleNotification("diary-1", "2026-09-10");

    expect(result).toBeNull();
    expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(N.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  test("existing not granted but request granted: schedules normally", async () => {
    N.getPermissionsAsync.mockResolvedValue(permission(false));
    N.requestPermissionsAsync.mockResolvedValue(permission(true));
    N.scheduleNotificationAsync.mockResolvedValue("notif-9");

    const result = await scheduleCapsuleNotification("diary-2", "2026-12-25");

    expect(result).toBe("notif-9");
    expect(N.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  test("scheduler error: returns null silently (봉인은 알림에 의존하지 않는다)", async () => {
    N.getPermissionsAsync.mockResolvedValue(permission(true));
    N.scheduleNotificationAsync.mockRejectedValue(new Error("os boundary failure"));

    await expect(
      scheduleCapsuleNotification("diary-1", "2026-09-10")
    ).resolves.toBeNull();
  });

  test("Android: ensures channel 'capsule' / '타임캡슐' / importance HIGH before scheduling", async () => {
    N.getPermissionsAsync.mockResolvedValue(permission(true));
    N.scheduleNotificationAsync.mockResolvedValue("notif-3");

    await scheduleCapsuleNotification("diary-1", "2026-09-10");

    expect(N.setNotificationChannelAsync).toHaveBeenCalledWith("capsule", {
      name: "타임캡슐",
      importance: Notifications.AndroidImportance.HIGH,
    });
    const channelOrder = N.setNotificationChannelAsync.mock.invocationCallOrder[0]!;
    const scheduleOrder = N.scheduleNotificationAsync.mock.invocationCallOrder[0]!;
    expect(channelOrder).toBeLessThan(scheduleOrder);
  });

  test("non-Android platform: no channel setup, schedules fine", async () => {
    jest.replaceProperty(Platform, "OS", "ios");
    N.getPermissionsAsync.mockResolvedValue(permission(true));
    N.scheduleNotificationAsync.mockResolvedValue("notif-5");

    const result = await scheduleCapsuleNotification("diary-1", "2026-09-10");

    expect(result).toBe("notif-5");
    expect(N.setNotificationChannelAsync).not.toHaveBeenCalled();
  });
});

describe("cancelCapsuleNotification (B3: cancel)", () => {
  test("null id (권한 거부로 예약이 없던 경우): no-op, no cancel call", async () => {
    await cancelCapsuleNotification(null);
    expect(N.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });

  test("non-null id: cancels exactly that scheduled notification", async () => {
    await cancelCapsuleNotification("notif-42");
    expect(N.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(N.cancelScheduledNotificationAsync).toHaveBeenCalledWith("notif-42");
  });

  test("cancel errors are swallowed silently", async () => {
    N.cancelScheduledNotificationAsync.mockRejectedValue(new Error("gone"));
    await expect(cancelCapsuleNotification("notif-42")).resolves.toBeUndefined();
  });
});

describe("foreground handler (B3: 포그라운드에서도 배너)", () => {
  test("module registers a notification handler whose behavior shows banner/alert in foreground and never sets a badge", async () => {
    expect(N.setNotificationHandler).toHaveBeenCalledTimes(1);

    const handler = N.setNotificationHandler.mock.calls[0]![0];
    expect(handler).not.toBeNull();
    const behavior = await handler!.handleNotification(
      {} as Notifications.Notification
    );

    expect(behavior.shouldShowBanner).toBe(true);
    expect(behavior.shouldShowAlert).toBe(true);
    expect(behavior.shouldShowList).toBe(true);
    expect(behavior.shouldSetBadge).toBe(false);
  });
});
