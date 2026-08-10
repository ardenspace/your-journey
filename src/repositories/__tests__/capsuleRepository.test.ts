import { createTestDb } from "../../../tests/support/testDb";
import { migrate } from "../../db/schema";
import type { DB } from "../../db/database";
import { DEFAULT_STYLE } from "../../domain/types";
import { createDiary } from "../diaryRepository";
import {
  deleteCapsuleForDiary,
  getCapsuleForDiary,
  listCapsules,
  markOpened,
  sealDiary,
  setNotificationId,
} from "../capsuleRepository";

async function setupDb(): Promise<DB> {
  const db = createTestDb();
  await migrate(db);
  return db;
}

async function addDiary(db: DB, id: string, now: string): Promise<void> {
  await createDiary(db, { content: "봉인될 하루", style: DEFAULT_STYLE }, {
    id,
    now,
  });
}

describe("capsuleRepository", () => {
  describe("sealDiary / getCapsuleForDiary", () => {
    it("seals a diary and reads the capsule back", async () => {
      const db = await setupDb();
      await addDiary(db, "d1", "2026-08-10T01:00:00.000Z");

      const sealed = await sealDiary(db, "d1", "2026-09-10", {
        id: "c1",
        now: "2026-08-10T01:00:00.000Z",
      });

      expect(sealed).toEqual({
        id: "c1",
        diaryId: "d1",
        openDate: "2026-09-10",
        openedAt: null,
        notificationId: null,
        createdAt: "2026-08-10T01:00:00.000Z",
      });

      const fetched = await getCapsuleForDiary(db, "d1");
      expect(fetched).toEqual(sealed);
    });

    it("starts with openedAt and notificationId null", async () => {
      const db = await setupDb();
      await addDiary(db, "d1", "2026-08-10T01:00:00.000Z");
      await sealDiary(db, "d1", "2027-01-01", {
        id: "c1",
        now: "2026-08-10T01:00:00.000Z",
      });

      const capsule = await getCapsuleForDiary(db, "d1");
      expect(capsule!.openedAt).toBeNull();
      expect(capsule!.notificationId).toBeNull();
    });

    it("returns null for a diary without a capsule", async () => {
      const db = await setupDb();
      await addDiary(db, "d1", "2026-08-10T01:00:00.000Z");
      expect(await getCapsuleForDiary(db, "d1")).toBeNull();
    });

    it("returns null for an unknown diary id", async () => {
      const db = await setupDb();
      expect(await getCapsuleForDiary(db, "nope")).toBeNull();
    });
  });

  describe("listCapsules", () => {
    it("lists capsules ascending by open_date", async () => {
      const db = await setupDb();
      await addDiary(db, "d1", "2026-08-01T09:00:00.000Z");
      await addDiary(db, "d2", "2026-08-02T09:00:00.000Z");
      await addDiary(db, "d3", "2026-08-03T09:00:00.000Z");

      // Insert out of open_date order on purpose.
      await sealDiary(db, "d1", "2027-08-01", {
        id: "c1",
        now: "2026-08-01T09:00:00.000Z",
      });
      await sealDiary(db, "d2", "2026-09-02", {
        id: "c2",
        now: "2026-08-02T09:00:00.000Z",
      });
      await sealDiary(db, "d3", "2026-11-03", {
        id: "c3",
        now: "2026-08-03T09:00:00.000Z",
      });

      const capsules = await listCapsules(db);
      expect(capsules.map((c) => c.id)).toEqual(["c2", "c3", "c1"]);
      expect(capsules.map((c) => c.openDate)).toEqual([
        "2026-09-02",
        "2026-11-03",
        "2027-08-01",
      ]);
    });

    it("returns an empty list on a fresh db", async () => {
      const db = await setupDb();
      expect(await listCapsules(db)).toEqual([]);
    });
  });

  describe("markOpened", () => {
    it("persists the opened instant", async () => {
      const db = await setupDb();
      await addDiary(db, "d1", "2026-08-10T01:00:00.000Z");
      await sealDiary(db, "d1", "2026-09-10", {
        id: "c1",
        now: "2026-08-10T01:00:00.000Z",
      });

      await markOpened(db, "c1", "2026-09-10T00:30:00.000Z");

      const capsule = await getCapsuleForDiary(db, "d1");
      expect(capsule!.openedAt).toBe("2026-09-10T00:30:00.000Z");
    });
  });

  describe("setNotificationId", () => {
    it("persists the notification handle", async () => {
      const db = await setupDb();
      await addDiary(db, "d1", "2026-08-10T01:00:00.000Z");
      await sealDiary(db, "d1", "2026-09-10", {
        id: "c1",
        now: "2026-08-10T01:00:00.000Z",
      });

      await setNotificationId(db, "c1", "notif-42");

      const capsule = await getCapsuleForDiary(db, "d1");
      expect(capsule!.notificationId).toBe("notif-42");
    });
  });

  describe("deleteCapsuleForDiary", () => {
    it("removes the capsule row for the diary", async () => {
      const db = await setupDb();
      await addDiary(db, "d1", "2026-08-10T01:00:00.000Z");
      await addDiary(db, "d2", "2026-08-11T01:00:00.000Z");
      await sealDiary(db, "d1", "2026-09-10", {
        id: "c1",
        now: "2026-08-10T01:00:00.000Z",
      });
      await sealDiary(db, "d2", "2026-09-11", {
        id: "c2",
        now: "2026-08-11T01:00:00.000Z",
      });

      await deleteCapsuleForDiary(db, "d1");

      expect(await getCapsuleForDiary(db, "d1")).toBeNull();
      expect((await listCapsules(db)).map((c) => c.id)).toEqual(["c2"]);
    });

    it("is a silent no-op when the diary has no capsule", async () => {
      const db = await setupDb();
      await addDiary(db, "d1", "2026-08-10T01:00:00.000Z");
      await expect(deleteCapsuleForDiary(db, "d1")).resolves.toBeUndefined();
    });
  });
});
