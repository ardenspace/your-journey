import { createTestDb } from "../../../tests/support/testDb";
import type { DB } from "../database";

describe("DB interface contract (B2)", () => {
  let db: DB;

  beforeEach(async () => {
    db = createTestDb();
    await db.run(
      "CREATE TABLE things (id TEXT PRIMARY KEY, label TEXT, score INTEGER)"
    );
  });

  describe("run", () => {
    it("executes DDL and DML, resolving to void", async () => {
      await expect(
        db.run("INSERT INTO things (id, label, score) VALUES (?, ?, ?)", [
          "a",
          "hello",
          1,
        ])
      ).resolves.toBeUndefined();
    });

    it("binds params positionally, including null", async () => {
      await db.run("INSERT INTO things (id, label, score) VALUES (?, ?, ?)", [
        "a",
        null,
        7,
      ]);
      const row = await db.get<{ label: string | null; score: number }>(
        "SELECT label, score FROM things WHERE id = ?",
        ["a"]
      );
      expect(row).toEqual({ label: null, score: 7 });
    });

    it("works without params", async () => {
      await expect(
        db.run("INSERT INTO things (id, label, score) VALUES ('x', 'y', 0)")
      ).resolves.toBeUndefined();
    });

    it("rejects on invalid SQL", async () => {
      await expect(db.run("INSERT INTO no_such_table VALUES (1)")).rejects.toThrow();
    });
  });

  describe("all", () => {
    beforeEach(async () => {
      await db.run("INSERT INTO things (id, label, score) VALUES (?, ?, ?)", [
        "a",
        "first",
        1,
      ]);
      await db.run("INSERT INTO things (id, label, score) VALUES (?, ?, ?)", [
        "b",
        "second",
        2,
      ]);
    });

    it("returns all matching rows as typed objects", async () => {
      const rows = await db.all<{ id: string; label: string; score: number }>(
        "SELECT id, label, score FROM things ORDER BY score"
      );
      expect(rows).toEqual([
        { id: "a", label: "first", score: 1 },
        { id: "b", label: "second", score: 2 },
      ]);
    });

    it("returns an empty array when nothing matches", async () => {
      const rows = await db.all("SELECT * FROM things WHERE id = ?", ["zzz"]);
      expect(rows).toEqual([]);
    });

    it("binds params in WHERE clauses", async () => {
      const rows = await db.all<{ id: string }>(
        "SELECT id FROM things WHERE score > ?",
        [1]
      );
      expect(rows).toEqual([{ id: "b" }]);
    });
  });

  describe("get", () => {
    it("returns the first row when rows exist", async () => {
      await db.run("INSERT INTO things (id, label, score) VALUES (?, ?, ?)", [
        "a",
        "only",
        5,
      ]);
      const row = await db.get<{ id: string; label: string }>(
        "SELECT id, label FROM things WHERE id = ?",
        ["a"]
      );
      expect(row).toEqual({ id: "a", label: "only" });
    });

    it("returns null (not undefined) when no row matches", async () => {
      const row = await db.get("SELECT * FROM things WHERE id = ?", ["nope"]);
      expect(row).toBeNull();
    });

    it("returns only the first row of a multi-row result", async () => {
      await db.run("INSERT INTO things (id, label, score) VALUES ('a', 'x', 1)");
      await db.run("INSERT INTO things (id, label, score) VALUES ('b', 'y', 2)");
      const row = await db.get<{ id: string }>(
        "SELECT id FROM things ORDER BY score DESC"
      );
      expect(row).toEqual({ id: "b" });
    });
  });
});
