import { createTestDb } from "../../../tests/support/testDb";
import { migrate } from "../../db/schema";
import type { DB } from "../../db/database";
import { DEFAULT_STYLE, type DiaryStyle } from "../../domain/types";
import {
  initialQuestionState,
  type QuestionState,
} from "../../domain/questionEngine";
import {
  getLastStyle,
  getQuestionState,
  getSetting,
  isQuestionMode,
  saveLastStyle,
  saveQuestionState,
  setQuestionMode,
  setSetting,
} from "../settingsRepository";

async function setupDb(): Promise<DB> {
  const db = createTestDb();
  await migrate(db);
  return db;
}

describe("settingsRepository", () => {
  describe("getSetting / setSetting", () => {
    it("returns null for an unset key", async () => {
      const db = await setupDb();
      expect(await getSetting(db, "nope")).toBeNull();
    });

    it("round-trips a value", async () => {
      const db = await setupDb();
      await setSetting(db, "k", "v1");
      expect(await getSetting(db, "k")).toBe("v1");
    });

    it("upserts: setting the same key again overwrites", async () => {
      const db = await setupDb();
      await setSetting(db, "k", "v1");
      await setSetting(db, "k", "v2");
      expect(await getSetting(db, "k")).toBe("v2");
    });
  });

  describe("question mode", () => {
    it("defaults to on when unset", async () => {
      const db = await setupDb();
      expect(await isQuestionMode(db)).toBe(true);
    });

    it("toggles off and back on", async () => {
      const db = await setupDb();
      await setQuestionMode(db, false);
      expect(await isQuestionMode(db)).toBe(false);
      await setQuestionMode(db, true);
      expect(await isQuestionMode(db)).toBe(true);
    });
  });

  describe("question state", () => {
    it("returns initialQuestionState when unset", async () => {
      const db = await setupDb();
      expect(await getQuestionState(db)).toEqual(initialQuestionState);
    });

    it("round-trips a saved state", async () => {
      const db = await setupDb();
      const state: QuestionState = {
        cursor: 3,
        shownDate: "2026-08-10",
        shownCount: 2,
        answeredCurrent: true,
      };
      await saveQuestionState(db, state);
      expect(await getQuestionState(db)).toEqual(state);
    });

    it("silently resets corrupted JSON to initialQuestionState without throwing", async () => {
      const db = await setupDb();
      await setSetting(db, "question_state", "{oops");
      await expect(getQuestionState(db)).resolves.toEqual(
        initialQuestionState,
      );
    });
  });

  describe("last style", () => {
    it("returns DEFAULT_STYLE when unset", async () => {
      const db = await setupDb();
      expect(await getLastStyle(db)).toEqual(DEFAULT_STYLE);
    });

    it("round-trips a saved style", async () => {
      const db = await setupDb();
      const style: DiaryStyle = {
        backgroundColor: "#FDF3E7",
        notebookDesign: "grid",
        fontFamily: "system",
        fontSize: 24,
        fontColor: "#3A3A3A",
      };
      await saveLastStyle(db, style);
      expect(await getLastStyle(db)).toEqual(style);
    });

    it("silently resets corrupted JSON to DEFAULT_STYLE without throwing", async () => {
      const db = await setupDb();
      await setSetting(db, "last_style", "{oops");
      await expect(getLastStyle(db)).resolves.toEqual(DEFAULT_STYLE);
    });
  });
});
