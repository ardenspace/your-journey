/**
 * B4: question bank validity (contract-pinning tests).
 *
 * Pins the human-owned content boundary: the bank shape the code reads.
 * `QUESTION_BANK` does not exist yet — these tests must fail with
 * "cannot find module '../questions'" until the next step creates it.
 */
import type { Question } from "../../domain/types";
import { QUESTION_BANK } from "../questions";

describe("QUESTION_BANK (B4)", () => {
  it("contains exactly 10 questions (v1: chapter 1, 가벼운 오늘)", () => {
    expect(QUESTION_BANK).toHaveLength(10);
  });

  it("every question belongs to chapter 1", () => {
    for (const q of QUESTION_BANK) {
      expect(q.chapter).toBe(1);
    }
  });

  it("every id follows ch<chapter>-q<order> and matches its own fields", () => {
    for (const q of QUESTION_BANK) {
      expect(q.id).toBe(`ch${q.chapter}-q${q.order}`);
      expect(q.id).toMatch(/^ch[1-9]\d*-q[1-9]\d*$/);
    }
  });

  it("array order strictly matches `order` 1..10 (배열 순서 = 제시 순서)", () => {
    QUESTION_BANK.forEach((q: Question, i: number) => {
      expect(q.order).toBe(i + 1);
    });
  });

  it("ids are unique", () => {
    const ids = QUESTION_BANK.map((q: Question) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every text is non-empty (not whitespace-only)", () => {
    for (const q of QUESTION_BANK) {
      expect(q.text.trim().length).toBeGreaterThan(0);
    }
  });
});
