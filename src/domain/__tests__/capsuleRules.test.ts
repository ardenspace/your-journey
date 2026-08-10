/**
 * B5: capsule rules (contract-pinning tests).
 *
 * Expected API (to be implemented in src/domain/capsuleRules.ts):
 *   type CapsulePreset = "1m" | "3m" | "6m" | "1y"
 *   resolveOpenDate(sealedAt: Date, preset: CapsulePreset): string
 *     — local calendar day `YYYY-MM-DD` of sealedAt + preset period,
 *       clamped to the last day of the month when the day doesn't exist.
 *       (This is what gets stored in capsules.open_date; custom calendar
 *       picks store their `YYYY-MM-DD` directly.)
 *   openInstant(openDate: string): Date
 *     — that local calendar day at 09:00:00.000 local time (the opening
 *       instant for both preset and custom dates).
 *   isValidCustomOpenDate(candidate: string, today: string): boolean
 *     — both local `YYYY-MM-DD`; valid iff candidate is tomorrow or later,
 *       no upper bound.
 *   isOpenable(openDate: string, openedAt: string | null, now: Date): boolean
 *     — true iff now >= openInstant(openDate) AND openedAt is null.
 *
 * No function calls `new Date()` internally — time always arrives as an
 * argument. The module does not exist yet: these tests must fail with
 * "cannot find module '../capsuleRules'".
 */
import {
  isOpenable,
  isValidCustomOpenDate,
  openInstant,
  resolveOpenDate,
} from "../capsuleRules";

describe("resolveOpenDate (B5 캡슐 규칙 — 프리셋)", () => {
  const sealedAt = new Date(2026, 7, 10, 14, 30, 12, 345); // 2026-08-10 local

  it("adds 1 month", () => {
    expect(resolveOpenDate(sealedAt, "1m")).toBe("2026-09-10");
  });

  it("adds 3 months", () => {
    expect(resolveOpenDate(sealedAt, "3m")).toBe("2026-11-10");
  });

  it("adds 6 months (crossing the year boundary)", () => {
    expect(resolveOpenDate(sealedAt, "6m")).toBe("2027-02-10");
  });

  it("adds 1 year", () => {
    expect(resolveOpenDate(sealedAt, "1y")).toBe("2027-08-10");
  });

  it("clamps to the last day of the month: Jan 31 + 1m → Feb 28", () => {
    expect(resolveOpenDate(new Date(2027, 0, 31, 10, 0), "1m")).toBe(
      "2027-02-28"
    );
  });

  it("clamps to Feb 29 in a leap year: Jan 31 2028 + 1m → Feb 29", () => {
    expect(resolveOpenDate(new Date(2028, 0, 31, 10, 0), "1m")).toBe(
      "2028-02-29"
    );
  });

  it("clamps 31 → 30 for short months: May 31 + 1m → Jun 30", () => {
    expect(resolveOpenDate(new Date(2026, 4, 31, 10, 0), "1m")).toBe(
      "2026-06-30"
    );
  });

  it("clamps across presets: Aug 31 + 6m → Feb 28", () => {
    expect(resolveOpenDate(new Date(2026, 7, 31, 10, 0), "6m")).toBe(
      "2027-02-28"
    );
  });

  it("clamps Feb 29 + 1y → Feb 28 of the non-leap year", () => {
    expect(resolveOpenDate(new Date(2028, 1, 29, 10, 0), "1y")).toBe(
      "2029-02-28"
    );
  });

  it("depends only on the sealing day, not the time of day", () => {
    expect(resolveOpenDate(new Date(2026, 7, 10, 0, 0, 1), "1m")).toBe(
      resolveOpenDate(new Date(2026, 7, 10, 23, 59, 59), "1m")
    );
  });
});

describe("openInstant (B5 — 개봉 시각은 로컬 오전 9시 고정)", () => {
  it("returns the local date at exactly 09:00:00.000", () => {
    expect(openInstant("2027-02-28").getTime()).toBe(
      new Date(2027, 1, 28, 9, 0, 0, 0).getTime()
    );
  });

  it("applies to custom calendar dates too", () => {
    expect(openInstant("2026-12-25").getTime()).toBe(
      new Date(2026, 11, 25, 9, 0, 0, 0).getTime()
    );
  });

  it("preset open dates open at local 09:00 of the resolved day", () => {
    const openDate = resolveOpenDate(new Date(2027, 0, 31, 22, 15), "1m");
    expect(openInstant(openDate).getTime()).toBe(
      new Date(2027, 1, 28, 9, 0, 0, 0).getTime()
    );
  });
});

describe("isValidCustomOpenDate (B5 — 캘린더 선택은 내일 이후만)", () => {
  const today = "2026-08-10";

  it("tomorrow is valid", () => {
    expect(isValidCustomOpenDate("2026-08-11", today)).toBe(true);
  });

  it("today is invalid", () => {
    expect(isValidCustomOpenDate("2026-08-10", today)).toBe(false);
  });

  it("past dates are invalid", () => {
    expect(isValidCustomOpenDate("2026-08-09", today)).toBe(false);
    expect(isValidCustomOpenDate("2020-01-01", today)).toBe(false);
  });

  it("far future is valid — no upper bound (원칙 2)", () => {
    expect(isValidCustomOpenDate("2030-01-01", today)).toBe(true);
    expect(isValidCustomOpenDate("2126-08-10", today)).toBe(true);
  });
});

describe("isOpenable (B5 — 개봉 가능 = 개봉일 도달 && 아직 안 열었음)", () => {
  const openDate = "2026-09-10";

  it("false before the open instant (1ms before local 9am on the open day)", () => {
    expect(isOpenable(openDate, null, new Date(2026, 8, 10, 8, 59, 59, 999))).toBe(
      false
    );
  });

  it("false on days before the open date", () => {
    expect(isOpenable(openDate, null, new Date(2026, 8, 9, 12, 0))).toBe(false);
  });

  it("true at exactly local 9am on the open date when never opened", () => {
    expect(isOpenable(openDate, null, new Date(2026, 8, 10, 9, 0, 0, 0))).toBe(
      true
    );
  });

  it("true any time after the open instant when never opened", () => {
    expect(isOpenable(openDate, null, new Date(2030, 0, 1, 0, 0))).toBe(true);
  });

  it("false once opened — 재봉인 불가, opened stays open forever", () => {
    const openedAt = new Date(2026, 8, 10, 9, 5).toISOString();
    expect(isOpenable(openDate, openedAt, new Date(2026, 8, 10, 10, 0))).toBe(
      false
    );
    expect(isOpenable(openDate, openedAt, new Date(2030, 0, 1))).toBe(false);
  });
});
