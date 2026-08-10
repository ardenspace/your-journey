import { createTestDb } from "../../../tests/support/testDb";
import { migrate } from "../../db/schema";
import type { DB } from "../../db/database";
import { DEFAULT_STYLE, type DiaryStyle } from "../../domain/types";
import {
  countDiaries,
  createDiary,
  getDiary,
  listDiaries,
  softDeleteDiary,
  updateDiary,
} from "../diaryRepository";

const CUSTOM_STYLE: DiaryStyle = {
  backgroundColor: "#FDF3E7",
  notebookDesign: "grid",
  fontFamily: "system",
  fontSize: 24,
  fontColor: "#3A3A3A",
};

async function setupDb(): Promise<DB> {
  const db = createTestDb();
  await migrate(db);
  return db;
}

describe("diaryRepository", () => {
  describe("createDiary / getDiary", () => {
    it("round-trips a full diary including style and questionId", async () => {
      const db = await setupDb();
      const created = await createDiary(
        db,
        {
          title: "봄날",
          content: "오늘은 산책을 했다.",
          questionId: "ch1-q1",
          style: CUSTOM_STYLE,
        },
        { id: "d1", now: "2026-08-10T01:00:00.000Z" },
      );

      expect(created).toEqual({
        id: "d1",
        title: "봄날",
        content: "오늘은 산책을 했다.",
        questionId: "ch1-q1",
        style: CUSTOM_STYLE,
        createdAt: "2026-08-10T01:00:00.000Z",
        updatedAt: "2026-08-10T01:00:00.000Z",
      });

      const fetched = await getDiary(db, "d1");
      expect(fetched).toEqual(created);
    });

    it("stores optional title and questionId as null", async () => {
      const db = await setupDb();
      await createDiary(
        db,
        { content: "제목 없는 하루", style: DEFAULT_STYLE },
        { id: "d1", now: "2026-08-10T01:00:00.000Z" },
      );

      const fetched = await getDiary(db, "d1");
      expect(fetched).not.toBeNull();
      expect(fetched!.title).toBeNull();
      expect(fetched!.questionId).toBeNull();
      expect(fetched!.style).toEqual(DEFAULT_STYLE);
    });

    it("returns null for an unknown id", async () => {
      const db = await setupDb();
      expect(await getDiary(db, "nope")).toBeNull();
    });
  });

  describe("listDiaries / countDiaries", () => {
    it("lists newest-first by created_at and counts all live rows", async () => {
      const db = await setupDb();
      await createDiary(
        db,
        { content: "첫째", style: DEFAULT_STYLE },
        { id: "d1", now: "2026-08-01T09:00:00.000Z" },
      );
      await createDiary(
        db,
        { content: "셋째", style: DEFAULT_STYLE },
        { id: "d3", now: "2026-08-03T09:00:00.000Z" },
      );
      await createDiary(
        db,
        { content: "둘째", style: DEFAULT_STYLE },
        { id: "d2", now: "2026-08-02T09:00:00.000Z" },
      );

      const list = await listDiaries(db);
      expect(list.map((d) => d.id)).toEqual(["d3", "d2", "d1"]);
      expect(await countDiaries(db)).toBe(3);
    });

    it("returns empty list and zero count on a fresh db", async () => {
      const db = await setupDb();
      expect(await listDiaries(db)).toEqual([]);
      expect(await countDiaries(db)).toBe(0);
    });
  });

  describe("updateDiary", () => {
    it("updates title/content/style and updated_at, preserving created_at and question_id", async () => {
      const db = await setupDb();
      await createDiary(
        db,
        {
          title: "원래 제목",
          content: "원래 내용",
          questionId: "ch1-q2",
          style: DEFAULT_STYLE,
        },
        { id: "d1", now: "2026-08-01T09:00:00.000Z" },
      );

      await updateDiary(
        db,
        "d1",
        { title: "고친 제목", content: "고친 내용", style: CUSTOM_STYLE },
        "2026-08-05T10:00:00.000Z",
      );

      const after = await getDiary(db, "d1");
      expect(after).toEqual({
        id: "d1",
        title: "고친 제목",
        content: "고친 내용",
        questionId: "ch1-q2",
        style: CUSTOM_STYLE,
        createdAt: "2026-08-01T09:00:00.000Z",
        updatedAt: "2026-08-05T10:00:00.000Z",
      });
    });

    it("leaves omitted fields unchanged", async () => {
      const db = await setupDb();
      await createDiary(
        db,
        {
          title: "제목",
          content: "내용",
          questionId: "ch1-q3",
          style: CUSTOM_STYLE,
        },
        { id: "d1", now: "2026-08-01T09:00:00.000Z" },
      );

      await updateDiary(
        db,
        "d1",
        { content: "새 내용" },
        "2026-08-02T09:00:00.000Z",
      );

      const after = await getDiary(db, "d1");
      expect(after!.title).toBe("제목");
      expect(after!.content).toBe("새 내용");
      expect(after!.style).toEqual(CUSTOM_STYLE);
      expect(after!.questionId).toBe("ch1-q3");
      expect(after!.updatedAt).toBe("2026-08-02T09:00:00.000Z");
    });
  });

  describe("softDeleteDiary", () => {
    it("hides the diary from getDiary, listDiaries, and countDiaries", async () => {
      const db = await setupDb();
      await createDiary(
        db,
        { title: "비밀", content: "지워질 내용", style: DEFAULT_STYLE },
        { id: "d1", now: "2026-08-01T09:00:00.000Z" },
      );
      await createDiary(
        db,
        { content: "남는 일기", style: DEFAULT_STYLE },
        { id: "d2", now: "2026-08-02T09:00:00.000Z" },
      );

      await softDeleteDiary(db, "d1", "2026-08-03T09:00:00.000Z");

      expect(await getDiary(db, "d1")).toBeNull();
      expect((await listDiaries(db)).map((d) => d.id)).toEqual(["d2"]);
      expect(await countDiaries(db)).toBe(1);
    });

    it("keeps a tombstone row with content erased (privacy) and deleted_at set", async () => {
      const db = await setupDb();
      await createDiary(
        db,
        { title: "비밀", content: "지워질 내용", style: DEFAULT_STYLE },
        { id: "d1", now: "2026-08-01T09:00:00.000Z" },
      );

      await softDeleteDiary(db, "d1", "2026-08-03T09:00:00.000Z");

      const raw = await db.get<{
        id: string;
        title: string | null;
        content: string;
        deleted_at: string | null;
      }>("SELECT id, title, content, deleted_at FROM diaries WHERE id = ?", [
        "d1",
      ]);
      expect(raw).not.toBeNull();
      expect(raw!.title).toBeNull();
      expect(raw!.content).toBe("");
      expect(raw!.deleted_at).toBe("2026-08-03T09:00:00.000Z");
    });
  });
});
