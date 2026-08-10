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
