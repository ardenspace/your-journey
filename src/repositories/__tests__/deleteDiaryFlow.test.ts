import { createTestDb } from "../../../tests/support/testDb";
import type { DB } from "../../db/database";
import { migrate } from "../../db/schema";
import { DEFAULT_STYLE } from "../../domain/types";
import { cancelCapsuleNotification } from "../../notifications/capsuleNotifications";
import { getCapsuleForDiary, sealDiary, setNotificationId } from "../capsuleRepository";
import { deleteDiaryFlow } from "../deleteDiaryFlow";
import { createDiary, getDiary } from "../diaryRepository";

// The OS boundary is mocked out — the flow must be testable with the test DB
// alone, and the factory keeps jest from loading expo-notifications.
jest.mock("../../notifications/capsuleNotifications", () => ({
  cancelCapsuleNotification: jest.fn(async () => undefined),
}));

const cancelMock = cancelCapsuleNotification as jest.Mock;

const NOW = "2026-08-10T09:00:00.000Z";

async function setupDb(): Promise<DB> {
  const db = createTestDb();
  await migrate(db);
  await createDiary(
    db,
    { title: "여름", content: "지워질 하루", style: DEFAULT_STYLE },
    { id: "d1", now: "2026-08-01T01:00:00.000Z" },
  );
  return db;
}

async function readRawDiaryRow(db: DB) {
  return db.get<{
    title: string | null;
    content: string;
    deleted_at: string | null;
  }>("SELECT title, content, deleted_at FROM diaries WHERE id = ?", ["d1"]);
}

describe("deleteDiaryFlow", () => {
  beforeEach(() => {
    cancelMock.mockClear();
  });

  it("sealed diary with a scheduled notification: cancels, removes the capsule, tombstones the diary", async () => {
    const db = await setupDb();
    await sealDiary(db, "d1", "2026-09-10", { id: "c1", now: NOW });
    await setNotificationId(db, "c1", "notif-1");

    const ok = await deleteDiaryFlow(db, "d1", NOW);

    expect(ok).toBe(true);
    expect(cancelMock).toHaveBeenCalledTimes(1);
    expect(cancelMock).toHaveBeenCalledWith("notif-1");
    expect(await getCapsuleForDiary(db, "d1")).toBeNull();
    // User-visible: completely gone.
    expect(await getDiary(db, "d1")).toBeNull();
    // B1 tombstone: row remains, content erased immediately, deleted_at set.
    const row = await readRawDiaryRow(db);
    expect(row).toEqual({ title: null, content: "", deleted_at: NOW });
  });

  it("normal diary without a capsule: no cancel call, diary tombstoned", async () => {
    const db = await setupDb();

    const ok = await deleteDiaryFlow(db, "d1", NOW);

    expect(ok).toBe(true);
    expect(cancelMock).not.toHaveBeenCalled();
    expect(await getDiary(db, "d1")).toBeNull();
    const row = await readRawDiaryRow(db);
    expect(row?.deleted_at).toBe(NOW);
  });

  it("capsule with notification_id NULL (permission denied at sealing): skips cancel, still deletes", async () => {
    const db = await setupDb();
    await sealDiary(db, "d1", "2026-09-10", { id: "c1", now: NOW });

    const ok = await deleteDiaryFlow(db, "d1", NOW);

    expect(ok).toBe(true);
    expect(cancelMock).not.toHaveBeenCalled();
    expect(await getCapsuleForDiary(db, "d1")).toBeNull();
    expect(await getDiary(db, "d1")).toBeNull();
  });

  it("failed diary tombstone: returns false, diary stays fully alive, earlier steps not undone", async () => {
    const db = await setupDb();
    await sealDiary(db, "d1", "2026-09-10", { id: "c1", now: NOW });
    await setNotificationId(db, "c1", "notif-1");

    const failingDb: DB = {
      ...db,
      async run(sql, params) {
        if (sql.includes("UPDATE diaries")) {
          throw new Error("disk full");
        }
        return db.run(sql, params);
      },
    };

    const ok = await deleteDiaryFlow(failingDb, "d1", NOW);

    expect(ok).toBe(false);
    // Earlier steps stand (partial failure allowed, no rollback).
    expect(cancelMock).toHaveBeenCalledWith("notif-1");
    expect(await getCapsuleForDiary(db, "d1")).toBeNull();
    // The diary itself is untouched — no half-vanished state.
    expect(await getDiary(db, "d1")).not.toBeNull();
    const row = await readRawDiaryRow(db);
    expect(row).toEqual({
      title: "여름",
      content: "지워질 하루",
      deleted_at: null,
    });
  });
});
