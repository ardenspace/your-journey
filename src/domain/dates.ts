/**
 * Local-timezone calendar date as `YYYY-MM-DD`.
 *
 * All "is this today?" decisions in the app must go through this function
 * (convention: instants are stored as UTC ISO 8601, but calendar-day
 * judgments use the device's local timezone).
 */
export function localDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Korean display date "YYYY년 M월 D일" for a stored UTC ISO instant,
 * rendered in the device's local timezone (no zero padding — "8월 5일").
 * List/detail screens must format diary dates through this.
 */
export function formatKoreanDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
