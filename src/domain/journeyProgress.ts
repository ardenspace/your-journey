/**
 * Journey progress (B5): diary count → milestone progress.
 * Pure module — no React, no DB. `count` is the number of saved
 * (non-deleted) diaries, sealed ones included, passed in as an argument.
 */

/** Fixed milestone ladder (기록 수 기준). */
export const MILESTONES: readonly number[] = [
  1, 3, 7, 14, 30, 60, 100, 150, 210, 280, 365,
];

export interface JourneyProgress {
  /** milestones reached (count >= milestone) */
  reached: number;
  /** next milestone value, or null past the last */
  next: number | null;
  /** progress within the current segment, 0..1 (fixed at 1 past the last) */
  fraction: number;
}

export function journeyProgress(count: number): JourneyProgress {
  let reached = 0;
  for (const milestone of MILESTONES) {
    if (count >= milestone) reached += 1;
  }

  if (reached >= MILESTONES.length) {
    return { reached, next: null, fraction: 1 };
  }

  const next = MILESTONES[reached] as number;
  const prev = reached === 0 ? 0 : (MILESTONES[reached - 1] as number);
  return { reached, next, fraction: (count - prev) / (next - prev) };
}
