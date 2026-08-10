import { localDateString } from "../dates";

describe("localDateString", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    expect(localDateString(new Date(2026, 7, 10, 23, 59))).toBe("2026-08-10");
  });

  it("uses the local calendar day, not UTC", () => {
    // Just after local midnight — local day must win regardless of timezone
    expect(localDateString(new Date(2026, 0, 1, 0, 0, 1))).toBe("2026-01-01");
  });

  it("zero-pads month and day", () => {
    expect(localDateString(new Date(2026, 2, 5, 12, 0))).toBe("2026-03-05");
  });

  it("handles end-of-year boundary", () => {
    expect(localDateString(new Date(2025, 11, 31, 23, 59, 59))).toBe(
      "2025-12-31"
    );
  });
});
