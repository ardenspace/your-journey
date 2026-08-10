/**
 * B5: journey progress (contract-pinning tests).
 *
 * Expected API (to be implemented in src/domain/journeyProgress.ts):
 *   MILESTONES: readonly number[]  // [1,3,7,14,30,60,100,150,210,280,365]
 *   journeyProgress(count: number): {
 *     reached: number;        // milestones reached (count >= milestone)
 *     next: number | null;    // next milestone value, null past the last
 *     fraction: number;       // progress within the current segment, 0..1
 *   }
 *
 * `count` is the number of saved (non-deleted) diaries, sealed ones
 * included — passed in as an argument; the module never touches the DB.
 * The module does not exist yet: these tests must fail with
 * "cannot find module '../journeyProgress'".
 */
import { journeyProgress, MILESTONES } from "../journeyProgress";

describe("MILESTONES (B5 여정 진행도)", () => {
  it("is exactly the fixed milestone ladder", () => {
    expect([...MILESTONES]).toEqual([
      1, 3, 7, 14, 30, 60, 100, 150, 210, 280, 365,
    ]);
  });
});

describe("journeyProgress (B5)", () => {
  it("count 0 → nothing reached, next 1, fraction 0", () => {
    expect(journeyProgress(0)).toEqual({ reached: 0, next: 1, fraction: 0 });
  });

  it("count 1 → first milestone reached exactly, next 3, fraction 0", () => {
    expect(journeyProgress(1)).toEqual({ reached: 1, next: 3, fraction: 0 });
  });

  it("count 2 → halfway between 1 and 3", () => {
    expect(journeyProgress(2)).toEqual({ reached: 1, next: 3, fraction: 0.5 });
  });

  it("count 5 → reached 2 (1, 3), next 7, fraction 0.5", () => {
    expect(journeyProgress(5)).toEqual({ reached: 2, next: 7, fraction: 0.5 });
  });

  it("exact milestone (7) → reached 3, next 14, fraction 0", () => {
    expect(journeyProgress(7)).toEqual({ reached: 3, next: 14, fraction: 0 });
  });

  it("at the last milestone (365) → all reached, next null, fraction 1", () => {
    expect(journeyProgress(365)).toEqual({
      reached: MILESTONES.length,
      next: null,
      fraction: 1,
    });
  });

  it("beyond the last milestone → fraction stays fixed at 1 (진행율 1 고정)", () => {
    expect(journeyProgress(400)).toEqual({
      reached: MILESTONES.length,
      next: null,
      fraction: 1,
    });
    expect(journeyProgress(10000)).toEqual({
      reached: MILESTONES.length,
      next: null,
      fraction: 1,
    });
  });

  it("is deterministic for the same argument", () => {
    expect(journeyProgress(42)).toEqual(journeyProgress(42));
  });
});
