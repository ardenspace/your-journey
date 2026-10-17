import { createTestDb } from "../../../tests/support/testDb";
import {
  LATEST_VERSION,
  MIGRATIONS,
  V0_SCHEMA_STATEMENTS,
  migrate,
  type Migration,
} from "../schema";
import type { DB } from "../database";
import { DEFAULT_STYLE, type DiaryStyle } from "../../domain/types";
import {
  countDiaries,
  createDiary,
  getDiary,
  listDiaries,
  softDeleteDiary,
} from "../../repositories/diaryRepository";
import {
  getCapsuleForDiary,
  listCapsules,
  markOpened,
  sealDiary,
  setNotificationId,
} from "../../repositories/capsuleRepository";
import {
  getLastStyle,
  getQuestionState,
  isQuestionMode,
  saveLastStyle,
  saveQuestionState,
  setQuestionMode,
} from "../../repositories/settingsRepository";

const MIGRATION_TIME = "2026-10-17T09:00:00.000Z";
const now = () => MIGRATION_TIME;

/** A talpi v1 install: the frozen v0 tables, user_version 0. */
async function createV0Db(): Promise<DB> {
  const db = createTestDb();
  for (const statement of V0_SCHEMA_STATEMENTS) {
    await db.run(statement);
  }
  return db;
}

async function userVersion(db: DB): Promise<number> {
  const row = await db.get<{ user_version: number }>("PRAGMA user_version");
  return row!.user_version;
}

async function foreignKeys(db: DB): Promise<number> {
  const row = await db.get<{ foreign_keys: number }>("PRAGMA foreign_keys");
  return row!.foreign_keys;
}

/** Every table's rows, ordered, plus the schema SQL — a full DB snapshot. */
async function snapshot(db: DB) {
  return {
    userVersion: await userVersion(db),
    schema: await db.all(
      "SELECT type, name, tbl_name, sql FROM sqlite_master ORDER BY name"
    ),
    diaries: await db.all("SELECT * FROM diaries ORDER BY id"),
    capsules: await db.all("SELECT * FROM capsules ORDER BY id"),
    settings: await db.all("SELECT * FROM settings ORDER BY key"),
  };
}

const PINK: DiaryStyle = {
  backgroundColor: "#FDECEF",
  notebookDesign: "grid",
  fontFamily: "system",
  fontSize: 24,
  fontColor: "#2B2B2B",
};

describe("migrate: empty DB", () => {
  it("reaches the latest version through the same migration list", async () => {
    const db = createTestDb();
    expect(await userVersion(db)).toBe(0);
    await migrate(db);
    expect(await userVersion(db)).toBe(LATEST_VERSION);
    expect(MIGRATIONS.map((m) => m.version)).toEqual(
      [...MIGRATIONS.map((m) => m.version)].sort((a, b) => a - b)
    );
    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    );
    expect(tables.map((t) => t.name)).toEqual(["capsules", "diaries", "settings"]);
  });
});

describe("migrate: talpi v1 (user_version 0) upgrade", () => {
  /** Valid v1 data written through the real repositories. */
  async function seedValidV0(db: DB): Promise<void> {
    await createDiary(
      db,
      { title: "평범한 하루", content: "산책을 했다", style: DEFAULT_STYLE },
      { id: "d-normal", now: "2026-08-01T01:00:00.000Z" }
    );
    await createDiary(
      db,
      { content: "질문에 답한 날", questionId: "q-003", style: PINK },
      { id: "d-sealed", now: "2026-08-02T01:00:00.000Z" }
    );
    await sealDiary(db, "d-sealed", "2027-08-02", {
      id: "c-sealed",
      now: "2026-08-02T01:00:00.000Z",
    });
    await setNotificationId(db, "c-sealed", "notif-1");
    await createDiary(
      db,
      { title: "열린 캡슐", content: "작년의 나에게", style: DEFAULT_STYLE },
      { id: "d-opened", now: "2026-08-03T01:00:00.000Z" }
    );
    await sealDiary(db, "d-opened", "2026-08-10", {
      id: "c-opened",
      now: "2026-08-03T01:00:00.000Z",
    });
    await markOpened(db, "c-opened", "2026-08-10T02:00:00.000Z");
    await createDiary(
      db,
      { title: "지운 일기", content: "비밀", style: DEFAULT_STYLE },
      { id: "d-tomb", now: "2026-08-04T01:00:00.000Z" }
    );
    await softDeleteDiary(db, "d-tomb", "2026-08-05T01:00:00.000Z");

    await setQuestionMode(db, false);
    await saveQuestionState(db, {
      cursor: 3,
      shownDate: "2026-08-04",
      shownCount: 2,
      answeredCurrent: true,
    });
    await saveLastStyle(db, PINK);
  }

  async function reads(db: DB) {
    return {
      list: await listDiaries(db),
      count: await countDiaries(db),
      normal: await getDiary(db, "d-normal"),
      tomb: await getDiary(db, "d-tomb"),
      capsules: await listCapsules(db),
      sealed: await getCapsuleForDiary(db, "d-sealed"),
      opened: await getCapsuleForDiary(db, "d-opened"),
      questionMode: await isQuestionMode(db),
      questionState: await getQuestionState(db),
      lastStyle: await getLastStyle(db),
    };
  }

  it("preserves every row and value and repository reads", async () => {
    const db = await createV0Db();
    await seedValidV0(db);
    const before = await snapshot(db);
    const readsBefore = await reads(db);

    await migrate(db, { now });

    const after = await snapshot(db);
    expect(after.userVersion).toBe(LATEST_VERSION);
    expect(after.diaries).toEqual(before.diaries);
    expect(after.capsules).toEqual(before.capsules);
    expect(after.settings).toEqual(before.settings);
    expect(before.diaries).toHaveLength(4);
    expect(before.capsules).toHaveLength(2);
    expect(before.settings).toHaveLength(3);
    expect(await reads(db)).toEqual(readsBefore);
  });

  it("produces the same schema as a fresh install", async () => {
    const upgraded = await createV0Db();
    await seedValidV0(upgraded);
    await migrate(upgraded, { now });
    const fresh = createTestDb();
    await migrate(fresh, { now });
    expect((await snapshot(upgraded)).schema).toEqual(
      (await snapshot(fresh)).schema
    );
  });

  it("is a no-op when run again at the latest version", async () => {
    const db = await createV0Db();
    await seedValidV0(db);
    await migrate(db, { now });
    const first = await snapshot(db);

    await migrate(db, { now: () => "2030-01-01T00:00:00.000Z" });
    expect(await snapshot(db)).toEqual(first);
  });
});

describe("migrate: legacy repair (dec-0007)", () => {
  async function seedViolations(db: DB): Promise<void> {
    const insertDiary = (row: (string | number | null)[]) =>
      db.run(
        `INSERT INTO diaries
           (id, title, content, question_id, background_color, notebook_design,
            font_family, font_size, font_color, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        row
      );
    const T1 = "2026-08-01T00:00:00.000Z";
    const T2 = "2026-08-02T00:00:00.000Z";
    // style columns all NULL
    await insertDiary(["d-style", "t", "c", null, null, null, null, null, null, T1, T1, null]);
    // one style column NULL, the rest custom and kept
    await insertDiary(["d-partial", null, "c", null, "#FDECEF", "grid", "system", null, "#2B2B2B", T1, T1, null]);
    // created_at NULL → updated_at
    await insertDiary(["d-no-created", null, "c", null, "#FFFDF7", "lined", "system", 20, "#3A3A3A", null, T2, null]);
    // updated_at NULL → created_at
    await insertDiary(["d-no-updated", null, "c", null, "#FFFDF7", "lined", "system", 20, "#3A3A3A", T1, null, null]);
    // both NULL → migration time
    await insertDiary(["d-no-times", null, "c", null, "#FFFDF7", "lined", "system", 20, "#3A3A3A", null, null, null]);
    // tombstone with NULL style is repaired, never removed
    await insertDiary(["d-tomb", null, "", null, null, null, null, null, null, T1, T2, T2]);
    // capsule targets
    for (const id of ["d-dup", "d-tie", "d-open-null", "d-cap-created"]) {
      await insertDiary([id, null, "c", null, "#FFFDF7", "lined", "system", 20, "#3A3A3A", T1, T1, null]);
    }

    const insertCapsule = (row: (string | null)[]) =>
      db.run(
        `INSERT INTO capsules
           (id, diary_id, open_date, opened_at, notification_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        row
      );
    // duplicates: earliest created_at wins
    await insertCapsule(["c-dup-late", "d-dup", "2027-01-02", null, "n-late", "2026-08-03T00:00:00.000Z"]);
    await insertCapsule(["c-dup-early", "d-dup", "2027-01-01", null, "n-early", "2026-08-02T00:00:00.000Z"]);
    // tie on created_at: lowest id wins
    await insertCapsule(["c-tie-b", "d-tie", "2027-01-01", null, null, T2]);
    await insertCapsule(["c-tie-a", "d-tie", "2027-01-02", null, null, T2]);
    // NULL open_date → deleted, diary stays a normal diary
    await insertCapsule(["c-open-null", "d-open-null", null, null, null, T2]);
    // NULL diary_id → deleted
    await insertCapsule(["c-no-diary", null, "2027-01-01", null, null, T2]);
    // dangling diary_id → deleted (v1 never enforced the FK on device)
    await db.run("PRAGMA foreign_keys = OFF");
    await insertCapsule(["c-dangling", "d-missing", "2027-01-01", null, null, T2]);
    await db.run("PRAGMA foreign_keys = ON");
    // capsules.created_at NULL → migration time
    await insertCapsule(["c-no-created", "d-cap-created", "2027-01-01", null, "n-1", null]);

    await db.run("INSERT INTO settings (key, value) VALUES ('question_mode', 'on')");
    await db.run("INSERT INTO settings (key, value) VALUES ('last_style', NULL)");
  }

  it("repairs every violation, succeeds, and deletes no diary", async () => {
    const db = await createV0Db();
    await seedViolations(db);
    const diaryIdsBefore = (
      await db.all<{ id: string }>("SELECT id FROM diaries ORDER BY id")
    ).map((r) => r.id);

    await expect(migrate(db, { now })).resolves.toBeUndefined();
    expect(await userVersion(db)).toBe(LATEST_VERSION);

    const diaries = await db.all<Record<string, unknown>>(
      "SELECT * FROM diaries ORDER BY id"
    );
    expect(diaries.map((d) => d.id)).toEqual(diaryIdsBefore);
    const byId = new Map(diaries.map((d) => [d.id, d]));
    const defaultColumns = {
      background_color: DEFAULT_STYLE.backgroundColor,
      notebook_design: DEFAULT_STYLE.notebookDesign,
      font_family: DEFAULT_STYLE.fontFamily,
      font_size: DEFAULT_STYLE.fontSize,
      font_color: DEFAULT_STYLE.fontColor,
    };
    // Conventions "기본 스타일" literal values, pinned independently.
    expect(defaultColumns).toEqual({
      background_color: "#FFFDF7",
      notebook_design: "lined",
      font_family: "system",
      font_size: 20,
      font_color: "#3A3A3A",
    });

    expect(byId.get("d-style")).toMatchObject({
      ...defaultColumns,
      title: "t",
      content: "c",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
    });
    expect(byId.get("d-partial")).toMatchObject({
      background_color: "#FDECEF",
      notebook_design: "grid",
      font_family: "system",
      font_size: 20,
      font_color: "#2B2B2B",
    });
    expect(byId.get("d-no-created")).toMatchObject({
      created_at: "2026-08-02T00:00:00.000Z",
      updated_at: "2026-08-02T00:00:00.000Z",
    });
    expect(byId.get("d-no-updated")).toMatchObject({
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
    });
    expect(byId.get("d-no-times")).toMatchObject({
      created_at: MIGRATION_TIME,
      updated_at: MIGRATION_TIME,
    });
    expect(byId.get("d-tomb")).toMatchObject({
      ...defaultColumns,
      title: null,
      content: "",
      deleted_at: "2026-08-02T00:00:00.000Z",
    });

    const capsules = await db.all("SELECT * FROM capsules ORDER BY id");
    expect(capsules).toEqual([
      {
        id: "c-dup-early",
        diary_id: "d-dup",
        open_date: "2027-01-01",
        opened_at: null,
        notification_id: "n-early",
        created_at: "2026-08-02T00:00:00.000Z",
      },
      {
        id: "c-no-created",
        diary_id: "d-cap-created",
        open_date: "2027-01-01",
        opened_at: null,
        notification_id: "n-1",
        created_at: MIGRATION_TIME,
      },
      {
        id: "c-tie-a",
        diary_id: "d-tie",
        open_date: "2027-01-02",
        opened_at: null,
        notification_id: null,
        created_at: "2026-08-02T00:00:00.000Z",
      },
    ]);

    // d-open-null lost its capsule and reads back as a normal diary.
    expect(await getCapsuleForDiary(db, "d-open-null")).toBeNull();
    expect(await getDiary(db, "d-open-null")).not.toBeNull();

    const settings = await db.all("SELECT * FROM settings ORDER BY key");
    expect(settings).toEqual([{ key: "question_mode", value: "on" }]);
    // the dropped setting falls back to the repository default
    expect(await getLastStyle(db)).toEqual(DEFAULT_STYLE);
  });
});

describe("migrate: transaction and foreign_keys", () => {
  /** Records every SQL statement sent through the B2 interface. */
  function recording(db: DB): { db: DB; log: string[] } {
    const log: string[] = [];
    const norm = (sql: string) => sql.replace(/\s+/g, " ").trim();
    return {
      log,
      db: {
        run: (sql, params) => {
          log.push(norm(sql));
          return db.run(sql, params);
        },
        all: (sql, params) => {
          log.push(norm(sql));
          return db.all(sql, params);
        },
        get: (sql, params) => {
          log.push(norm(sql));
          return db.get(sql, params);
        },
      },
    };
  }

  it.each([
    ["ON", 1],
    ["OFF", 0],
  ])(
    "turns foreign_keys OFF before BEGIN, checks before COMMIT, restores %s",
    async (initial, expected) => {
      const base = await createV0Db();
      await base.run(`PRAGMA foreign_keys = ${initial}`);
      const { db, log } = recording(base);

      await migrate(db, { now });

      const off = log.indexOf("PRAGMA foreign_keys = OFF");
      const begin = log.indexOf("BEGIN");
      const check = log.indexOf("PRAGMA foreign_key_check");
      const commit = log.indexOf("COMMIT");
      expect(off).toBeGreaterThanOrEqual(0);
      expect(off).toBeLessThan(begin);
      expect(begin).toBeLessThan(check);
      expect(check).toBeLessThan(commit);
      expect(log[log.length - 1]).toBe(`PRAGMA foreign_keys = ${initial}`);
      expect(await foreignKeys(base)).toBe(expected);
    }
  );

  it("rolls back a migration that leaves a foreign key violation", async () => {
    const db = await createV0Db();
    await db.run("INSERT INTO settings (key, value) VALUES ('k', 'v')");
    const before = await snapshot(db);
    const dangling: Migration = {
      version: 1,
      up: async (tx) => {
        await tx.run(
          "INSERT INTO capsules (id, diary_id, open_date) VALUES ('c', 'nope', '2027-01-01')"
        );
      },
    };

    await expect(migrate(db, { migrations: [dangling], now })).rejects.toThrow(
      /foreign_key_check/
    );
    expect(await snapshot(db)).toEqual(before);
    expect(await foreignKeys(db)).toBe(1);
  });

  it.each([
    ["ON", 1],
    ["OFF", 0],
  ])(
    "rolls back a migration that throws mid-rebuild (foreign_keys %s)",
    async (initial, expected) => {
      const db = await createV0Db();
      await createDiary(
        db,
        { content: "남아야 하는 일기", style: DEFAULT_STYLE },
        { id: "d1", now: "2026-08-01T00:00:00.000Z" }
      );
      await sealDiary(db, "d1", "2027-01-01", {
        id: "c1",
        now: "2026-08-01T00:00:00.000Z",
      });
      await db.run("INSERT INTO settings (key, value) VALUES ('k', 'v')");
      await db.run(`PRAGMA foreign_keys = ${initial}`);
      const before = await snapshot(db);

      // Run the real v1 rebuild until the old tables are dropped, then fail.
      const failing: Migration = {
        version: 1,
        up: async (tx, at) => {
          const broken: DB = {
            ...tx,
            run: async (sql, params) => {
              if (/^ALTER TABLE/.test(sql.trim())) {
                throw new Error("boom");
              }
              return tx.run(sql, params);
            },
          };
          await MIGRATIONS[0].up(broken, at);
        },
      };

      await expect(migrate(db, { migrations: [failing], now })).rejects.toThrow(
        "boom"
      );
      expect(await snapshot(db)).toEqual(before);
      expect(await foreignKeys(db)).toBe(expected);

      // the next start retries and succeeds with the original data
      await migrate(db, { now });
      expect(await userVersion(db)).toBe(LATEST_VERSION);
      expect(await getDiary(db, "d1")).not.toBeNull();
      expect(await getCapsuleForDiary(db, "d1")).not.toBeNull();
    }
  );

  it("only runs migrations above the stored user_version", async () => {
    const db = createTestDb();
    const applied: number[] = [];
    const list: Migration[] = [1, 2, 3].map((version) => ({
      version,
      up: async () => {
        applied.push(version);
      },
    }));
    await db.run("PRAGMA user_version = 2");

    await migrate(db, { migrations: list, now });
    expect(applied).toEqual([3]);
    expect(await userVersion(db)).toBe(3);
  });
});
