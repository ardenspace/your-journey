/**
 * Capsule rules (B5): open-date resolution and openability.
 * Pure module — no React, no DB. `new Date()` is never called for the
 * current time; "now" always arrives as an argument. Date construction
 * from explicit components is fine.
 *
 * `open_date` is stored as a local calendar day `YYYY-MM-DD`; the opening
 * instant (local 9am) is derived via `openInstant`. The open date is
 * computed once at sealing time, so later rule changes never retroactively
 * affect already-sealed capsules.
 */

export type CapsulePreset = "1m" | "3m" | "6m" | "1y";

const PRESET_MONTHS: Record<CapsulePreset, number> = {
  "1m": 1,
  "3m": 3,
  "6m": 6,
  "1y": 12,
};

function parseCalendarDay(date: string): {
  year: number;
  month: number;
  day: number;
} {
  const [y, m, d] = date.split("-").map(Number);
  return { year: y ?? 0, month: m ?? 1, day: d ?? 1 };
}

function formatCalendarDay(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Local calendar day (`YYYY-MM-DD`) of sealedAt + the preset period.
 * Depends only on the sealing day, not the time of day. When the target
 * day doesn't exist (e.g. Jan 31 + 1m), clamp to the last day of the
 * target month.
 */
export function resolveOpenDate(sealedAt: Date, preset: CapsulePreset): string {
  const totalMonths = sealedAt.getMonth() + PRESET_MONTHS[preset];
  const year = sealedAt.getFullYear() + Math.floor(totalMonths / 12);
  const monthIndex = totalMonths % 12;
  // Day 0 of the next month = last day of the target month.
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const day = Math.min(sealedAt.getDate(), lastDay);
  return formatCalendarDay(year, monthIndex + 1, day);
}

/**
 * The opening instant for an open date: that local calendar day at
 * exactly 09:00:00.000 local time (presets and custom picks alike).
 */
export function openInstant(openDate: string): Date {
  const { year, month, day } = parseCalendarDay(openDate);
  return new Date(year, month - 1, day, 9, 0, 0, 0);
}

/**
 * A custom calendar pick is valid iff it is tomorrow or later
 * (both local `YYYY-MM-DD`). No upper bound (원칙 2).
 */
export function isValidCustomOpenDate(candidate: string, today: string): boolean {
  return candidate > today;
}

/**
 * Openable = the open instant has arrived AND the capsule was never opened.
 * Once opened it stays open forever (재봉인 불가).
 */
export function isOpenable(
  openDate: string,
  openedAt: string | null,
  now: Date
): boolean {
  return openedAt === null && now.getTime() >= openInstant(openDate).getTime();
}
