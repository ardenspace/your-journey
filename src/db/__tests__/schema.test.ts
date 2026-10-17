import { createTestDb } from "../../../tests/support/testDb";
import { LATEST_VERSION, migrate } from "../schema";
import type { DB } from "../database";

interface ColumnInfo {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

async function columnNames(db: DB, table: string): Promise<string[]> {
  const cols = await db.all<ColumnInfo>(`PRAGMA table_info(${table})`);
  return cols.map((c) => c.name);
}

describe("schema (B1)", () => {
  let db: DB;

  beforeEach(async () => {
    db = createTestDb();
    await migrate(db);
  });

  it("creates the diaries table with all B1 columns including deleted_at", async () => {
    const names = await columnNames(db, "diaries");
    expect(names).toEqual(
      expect.arrayContaining([
        "id",
        "title",
        "content",
        "question_id",
        "background_color",
        "notebook_design",
        "font_family",
        "font_size",
        "font_color",
        "created_at",
        "updated_at",
        "deleted_at",
      ])
    );
  });

  it("diaries: id is PK, content NOT NULL, title/question_id/deleted_at nullable", async () => {
    const cols = await db.all<ColumnInfo>("PRAGMA table_info(diaries)");
    const byName = new Map(cols.map((c) => [c.name, c]));
    expect(byName.get("id")?.pk).toBe(1);
    expect(byName.get("content")?.notnull).toBe(1);
    expect(byName.get("title")?.notnull).toBe(0);
    expect(byName.get("question_id")?.notnull).toBe(0);
    expect(byName.get("deleted_at")?.notnull).toBe(0);
  });

  it("creates the capsules table with all B1 columns", async () => {
    const names = await columnNames(db, "capsules");
    expect(names).toEqual(
      expect.arrayContaining([
        "id",
        "diary_id",
        "open_date",
        "opened_at",
        "notification_id",
        "created_at",
      ])
    );
    const cols = await db.all<ColumnInfo>("PRAGMA table_info(capsules)");
    const byName = new Map(cols.map((c) => [c.name, c]));
    expect(byName.get("id")?.pk).toBe(1);
    expect(byName.get("opened_at")?.notnull).toBe(0);
    expect(byName.get("notification_id")?.notnull).toBe(0);
  });

  it("creates the settings key/value table", async () => {
    const names = await columnNames(db, "settings");
    expect(names).toEqual(expect.arrayContaining(["key", "value"]));
    const cols = await db.all<ColumnInfo>("PRAGMA table_info(settings)");
    const byName = new Map(cols.map((c) => [c.name, c]));
    expect(byName.get("key")?.pk).toBe(1);
  });

  it("creates idx_diaries_created_at on diaries(created_at)", async () => {
    const indexes = await db.all<{ name: string }>(
      "PRAGMA index_list(diaries)"
    );
    expect(indexes.map((i) => i.name)).toContain("idx_diaries_created_at");
    const cols = await db.all<{ name: string }>(
      "PRAGMA index_info(idx_diaries_created_at)"
    );
    expect(cols.map((c) => c.name)).toEqual(["created_at"]);
  });

  it("is idempotent: migrate can run twice without error", async () => {
    await expect(migrate(db)).resolves.not.toThrow();
    // data written before the second run survives
    await db.run(
      "INSERT INTO settings (key, value) VALUES (?, ?)",
      ["question_mode", "on"]
    );
    await migrate(db);
    const row = await db.get<{ value: string }>(
      "SELECT value FROM settings WHERE key = ?",
      ["question_mode"]
    );
    expect(row?.value).toBe("on");
  });

  it("ends at the latest user_version", async () => {
    const row = await db.get<{ user_version: number }>("PRAGMA user_version");
    expect(row?.user_version).toBe(LATEST_VERSION);
    expect(LATEST_VERSION).toBeGreaterThanOrEqual(1);
  });

  describe("constraints (dec-0005)", () => {
    const NOT_NULL: Record<string, string[]> = {
      diaries: [
        "content",
        "background_color",
        "notebook_design",
        "font_family",
        "font_size",
        "font_color",
        "created_at",
        "updated_at",
      ],
      capsules: ["diary_id", "open_date", "created_at"],
      settings: ["value"],
    };
    const NULLABLE: Record<string, string[]> = {
      diaries: ["title", "question_id", "deleted_at"],
      capsules: ["opened_at", "notification_id"],
      settings: [],
    };

    it.each(Object.keys(NOT_NULL))(
      "%s: exactly the dec-0005 columns are NOT NULL",
      async (table) => {
        const cols = await db.all<ColumnInfo>(`PRAGMA table_info(${table})`);
        const notNull = cols
          .filter((c) => c.notnull === 1)
          .map((c) => c.name)
          .sort();
        expect(notNull).toEqual([...NOT_NULL[table]].sort());
        const byName = new Map(cols.map((c) => [c.name, c]));
        for (const name of NULLABLE[table]) {
          expect(byName.get(name)?.notnull).toBe(0);
        }
      }
    );

    it("capsules.diary_id is UNIQUE and still references diaries(id)", async () => {
      const indexes = await db.all<{ name: string; unique: number }>(
        "PRAGMA index_list(capsules)"
      );
      const uniqueCols: string[][] = [];
      for (const index of indexes.filter((i) => i.unique === 1)) {
        const cols = await db.all<{ name: string }>(
          `PRAGMA index_info(${index.name})`
        );
        uniqueCols.push(cols.map((c) => c.name));
      }
      expect(uniqueCols).toContainEqual(["diary_id"]);

      const fks = await db.all<{ table: string; from: string; to: string }>(
        "PRAGMA foreign_key_list(capsules)"
      );
      expect(fks).toEqual([
        expect.objectContaining({ table: "diaries", from: "diary_id", to: "id" }),
      ]);
    });

    const insertDiary = (id: string, deletedAt: string | null = null) =>
      db.run(
        `INSERT INTO diaries
           (id, title, content, question_id, background_color, notebook_design,
            font_family, font_size, font_color, created_at, updated_at, deleted_at)
         VALUES (?, '제목', '내용', NULL, '#FFFDF7', 'lined', 'system', 20,
                 '#3A3A3A', '2026-08-10T00:00:00.000Z',
                 '2026-08-10T00:00:00.000Z', ?)`,
        [id, deletedAt]
      );
    const insertCapsule = (id: string, diaryId: string) =>
      db.run(
        `INSERT INTO capsules
           (id, diary_id, open_date, opened_at, notification_id, created_at)
         VALUES (?, ?, '2026-09-10', NULL, NULL, '2026-08-10T00:00:00.000Z')`,
        [id, diaryId]
      );

    it("rejects a second capsule for the same diary", async () => {
      await insertDiary("d1");
      await insertCapsule("c1", "d1");
      await expect(insertCapsule("c2", "d1")).rejects.toThrow(/UNIQUE/);
      const rows = await db.all<{ id: string }>("SELECT id FROM capsules");
      expect(rows).toEqual([{ id: "c1" }]);
    });

    it("rejects a second capsule even when the diary is a tombstone", async () => {
      await insertDiary("d1", "2026-08-11T00:00:00.000Z");
      await insertCapsule("c1", "d1");
      await expect(insertCapsule("c2", "d1")).rejects.toThrow(/UNIQUE/);
    });

    it("rejects NULL in NOT NULL columns", async () => {
      await expect(
        db.run(
          `INSERT INTO diaries (id, content, created_at, updated_at)
           VALUES ('d1', '', '2026-08-10T00:00:00.000Z', '2026-08-10T00:00:00.000Z')`
        )
      ).rejects.toThrow(/NOT NULL/);
      await expect(
        db.run("INSERT INTO settings (key, value) VALUES ('k', NULL)")
      ).rejects.toThrow(/NOT NULL/);
    });
  });

  describe("soft-delete semantics", () => {
    const insertDiary = (id: string, deletedAt: string | null) =>
      db.run(
        `INSERT INTO diaries
           (id, title, content, question_id, background_color, notebook_design,
            font_family, font_size, font_color, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          "제목",
          "내용",
          null,
          "#FFFDF7",
          "lined",
          "system",
          20,
          "#3A3A3A",
          "2026-08-10T00:00:00.000Z",
          "2026-08-10T00:00:00.000Z",
          deletedAt,
        ]
      );

    it("supports tombstones: deleted rows persist but are excluded by deleted_at IS NULL", async () => {
      await insertDiary("d1", null);
      await insertDiary("d2", "2026-08-10T01:00:00.000Z");

      const live = await db.all<{ id: string }>(
        "SELECT id FROM diaries WHERE deleted_at IS NULL"
      );
      expect(live.map((r) => r.id)).toEqual(["d1"]);

      const all = await db.all<{ id: string }>("SELECT id FROM diaries");
      expect(all).toHaveLength(2);
    });

    it("allows soft-delete update: blank title/content + set deleted_at", async () => {
      await insertDiary("d1", null);
      await db.run(
        "UPDATE diaries SET title = ?, content = ?, deleted_at = ? WHERE id = ?",
        [null, "", "2026-08-10T02:00:00.000Z", "d1"]
      );
      const row = await db.get<{
        title: string | null;
        content: string;
        deleted_at: string | null;
      }>("SELECT title, content, deleted_at FROM diaries WHERE id = ?", ["d1"]);
      expect(row).not.toBeNull();
      expect(row?.title).toBeNull();
      expect(row?.content).toBe("");
      expect(row?.deleted_at).toBe("2026-08-10T02:00:00.000Z");
    });
  });

  describe("settings value shapes (B1)", () => {
    it("stores question_state / last_style as JSON strings that round-trip", async () => {
      const questionState = {
        cursor: 0,
        shownDate: "2026-08-10",
        shownCount: 1,
        answeredCurrent: false,
      };
      const lastStyle = {
        backgroundColor: "#FFFDF7",
        notebookDesign: "lined",
        fontFamily: "system",
        fontSize: 20,
        fontColor: "#3A3A3A",
      };
      await db.run("INSERT INTO settings (key, value) VALUES (?, ?)", [
        "question_state",
        JSON.stringify(questionState),
      ]);
      await db.run("INSERT INTO settings (key, value) VALUES (?, ?)", [
        "last_style",
        JSON.stringify(lastStyle),
      ]);

      const qs = await db.get<{ value: string }>(
        "SELECT value FROM settings WHERE key = ?",
        ["question_state"]
      );
      const ls = await db.get<{ value: string }>(
        "SELECT value FROM settings WHERE key = ?",
        ["last_style"]
      );
      expect(JSON.parse(qs!.value)).toEqual(questionState);
      expect(JSON.parse(ls!.value)).toEqual(lastStyle);
    });
  });
});
