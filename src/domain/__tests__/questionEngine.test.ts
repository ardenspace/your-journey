/**
 * B5: question progression (contract-pinning tests).
 *
 * Expected API (to be implemented in src/domain/questionEngine.ts):
 *   resolveToday(state: QuestionState, today: string, bankLength: number): QuestionState
 *     — `today` is a local `YYYY-MM-DD` string (from localDateString);
 *       called only when the question card is actually shown (question
 *       mode on, app opened). Never calls `new Date()` internally.
 *       `bankLength` bounds the cursor: an exhausted state (cursor >=
 *       bankLength) never advances further, so questions appended to the
 *       bank later are picked up from the front (B4: 장 추가는 배열 끝에).
 *   currentQuestion(bank: Question[], state: QuestionState): Question | null
 *   markAnswered(state: QuestionState): QuestionState
 *
 * Only `QuestionState` / `initialQuestionState` exist today — the three
 * functions are not exported yet, so these tests must fail with
 * "... is not a function", not assertion errors.
 */
import type { Question } from "../types";
import {
  currentQuestion,
  initialQuestionState,
  markAnswered,
  QuestionState,
  resolveToday,
} from "../questionEngine";

const bank: Question[] = [
  { id: "ch1-q1", chapter: 1, order: 1, text: "질문 1" },
  { id: "ch1-q2", chapter: 1, order: 2, text: "질문 2" },
  { id: "ch1-q3", chapter: 1, order: 3, text: "질문 3" },
];

describe("resolveToday (B5 질문 진행)", () => {
  it("first-ever day: cursor 0, shownDate=today, shownCount 1", () => {
    const s = resolveToday(initialQuestionState, "2026-08-10", bank.length);
    expect(s).toEqual({
      cursor: 0,
      shownDate: "2026-08-10",
      shownCount: 1,
      answeredCurrent: false,
    });
  });

  it("same-day re-resolve returns an identical state", () => {
    const s1 = resolveToday(initialQuestionState, "2026-08-10", bank.length);
    const s2 = resolveToday(s1, "2026-08-10", bank.length);
    expect(s2).toEqual(s1);
  });

  it("same-day re-resolve after markAnswered keeps the answered state (card stays that day)", () => {
    const shown = resolveToday(initialQuestionState, "2026-08-10", bank.length);
    const answered = markAnswered(shown);
    const reResolved = resolveToday(answered, "2026-08-10", bank.length);
    expect(reResolved).toEqual(answered);
    expect(reResolved.cursor).toBe(0);
    expect(reResolved.answeredCurrent).toBe(true);
  });

  it("new day after markAnswered advances: cursor+1, shownCount 1, answeredCurrent false", () => {
    const shown = resolveToday(initialQuestionState, "2026-08-10", bank.length);
    const answered = markAnswered(shown);
    const nextDay = resolveToday(answered, "2026-08-11", bank.length);
    expect(nextDay).toEqual({
      cursor: 1,
      shownDate: "2026-08-11",
      shownCount: 1,
      answeredCurrent: false,
    });
  });

  it("unanswered question persists for 3 shown-days, then the next new day advances", () => {
    const day1 = resolveToday(initialQuestionState, "2026-08-10", bank.length);
    expect(day1.cursor).toBe(0);
    expect(day1.shownCount).toBe(1);

    const day2 = resolveToday(day1, "2026-08-11", bank.length);
    expect(day2.cursor).toBe(0);
    expect(day2.shownCount).toBe(2);

    const day3 = resolveToday(day2, "2026-08-12", bank.length);
    expect(day3.cursor).toBe(0);
    expect(day3.shownCount).toBe(3);

    const day4 = resolveToday(day3, "2026-08-13", bank.length);
    expect(day4).toEqual({
      cursor: 1,
      shownDate: "2026-08-13",
      shownCount: 1,
      answeredCurrent: false,
    });
  });

  it("days the app wasn't opened don't count: day1 shown, next resolve on day5 → shownCount 2, same cursor", () => {
    const day1 = resolveToday(initialQuestionState, "2026-08-10", bank.length);
    const day5 = resolveToday(day1, "2026-08-14", bank.length);
    expect(day5).toEqual({
      cursor: 0,
      shownDate: "2026-08-14",
      shownCount: 2,
      answeredCurrent: false,
    });
  });

  it("advancing past the last question lands on a clean exhausted state (shownDate null, shownCount 0)", () => {
    const lastAnswered: QuestionState = {
      cursor: bank.length - 1,
      shownDate: "2026-08-10",
      shownCount: 1,
      answeredCurrent: true,
    };
    const exhausted = resolveToday(lastAnswered, "2026-08-11", bank.length);
    expect(exhausted).toEqual({
      cursor: bank.length,
      shownDate: null,
      shownCount: 0,
      answeredCurrent: false,
    });
    expect(currentQuestion(bank, exhausted)).toBeNull();
  });

  it("exhausted bank: the cursor never drifts further, however many days pass", () => {
    const exhausted: QuestionState = {
      cursor: bank.length,
      shownDate: null,
      shownCount: 0,
      answeredCurrent: false,
    };
    const day1 = resolveToday(exhausted, "2026-08-10", bank.length);
    const day2 = resolveToday(day1, "2026-08-11", bank.length);
    const day3 = resolveToday(day2, "2026-08-15", bank.length);
    expect(day3).toEqual(exhausted);
  });

  it("legacy drifted state (cursor beyond bank) also stops advancing", () => {
    const drifted: QuestionState = {
      cursor: bank.length + 4,
      shownDate: "2026-08-01",
      shownCount: 3,
      answeredCurrent: false,
    };
    expect(resolveToday(drifted, "2026-08-10", bank.length)).toEqual(drifted);
  });

  it("questions appended after exhaustion resume from the first new one with a fresh shown-day count", () => {
    const exhausted: QuestionState = {
      cursor: bank.length,
      shownDate: null,
      shownCount: 0,
      answeredCurrent: false,
    };
    // 흘러간 날들은 상태를 바꾸지 않는다.
    const stillExhausted = resolveToday(exhausted, "2026-08-10", bank.length);
    // 2장이 뱅크 끝에 붙어 길이가 늘어난 다음 날:
    const grownLength = bank.length + 2;
    const resumed = resolveToday(stillExhausted, "2026-08-11", grownLength);
    expect(resumed).toEqual({
      cursor: bank.length,
      shownDate: "2026-08-11",
      shownCount: 1,
      answeredCurrent: false,
    });
  });

  it("is pure: does not mutate its input and is deterministic for the same args", () => {
    const input: QuestionState = {
      cursor: 0,
      shownDate: "2026-08-10",
      shownCount: 1,
      answeredCurrent: false,
    };
    const frozen = Object.freeze({ ...input });
    const a = resolveToday(frozen, "2026-08-11", bank.length);
    const b = resolveToday(frozen, "2026-08-11", bank.length);
    expect(frozen).toEqual(input);
    expect(a).toEqual(b);
  });
});

describe("currentQuestion (B5)", () => {
  it("returns the bank entry at the cursor", () => {
    const s = resolveToday(initialQuestionState, "2026-08-10", bank.length);
    expect(currentQuestion(bank, s)).toEqual(bank[0]);
  });

  it("returns null when the cursor is beyond the bank length (뱅크 소진)", () => {
    const exhausted: QuestionState = {
      cursor: bank.length,
      shownDate: "2026-08-10",
      shownCount: 1,
      answeredCurrent: false,
    };
    expect(currentQuestion(bank, exhausted)).toBeNull();
    expect(
      currentQuestion(bank, { ...exhausted, cursor: bank.length + 5 })
    ).toBeNull();
  });
});

describe("markAnswered (B5)", () => {
  it("sets answeredCurrent true without advancing the cursor", () => {
    const shown = resolveToday(initialQuestionState, "2026-08-10", bank.length);
    const answered = markAnswered(shown);
    expect(answered).toEqual({ ...shown, answeredCurrent: true });
    expect(answered.cursor).toBe(shown.cursor);
    expect(answered.shownCount).toBe(shown.shownCount);
  });

  it("does not mutate its input", () => {
    const shown = resolveToday(initialQuestionState, "2026-08-10", bank.length);
    const before = { ...shown };
    markAnswered(Object.freeze(shown));
    expect(shown).toEqual(before);
  });
});
