import { describe, expect, it } from "vitest";
import { dayCount, isDateKey, moveReportAnchor, resolveReportPeriod, shiftDate, type ReportPeriod } from "./report-period";

describe("calendar date keys", () => {
  it.each(["2024-02-29", "2000-02-29", "2026-12-31", "2026-01-01"])("accepts valid date %s", (date) => {
    expect(isDateKey(date)).toBe(true);
  });

  it.each(["", "2026-2-01", "2026-02-29", "1900-02-29", "2026-04-31", "2026-00-01", "2026-13-01", "2026-01-00", "2026-09-27T00:00:00Z", " 2026-09-27"])("rejects invalid date %s without normalizing it", (date) => {
    expect(isDateKey(date)).toBe(false);
    expect(() => shiftDate(date, 1)).toThrow(RangeError);
    expect(() => resolveReportPeriod("month", date, "2026-09-27")).toThrow(RangeError);
  });

  it("counts inclusively and advances through leap days and year boundaries", () => {
    expect(dayCount("2024-02-01", "2024-02-29")).toBe(29);
    expect(dayCount("2026-09-27", "2026-09-27")).toBe(1);
    expect(shiftDate("2024-02-28", 1)).toBe("2024-02-29");
    expect(shiftDate("2024-02-29", 1)).toBe("2024-03-01");
    expect(shiftDate("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("rejects malformed, reversed, or fractional operations", () => {
    expect(() => dayCount("", "2026-09-27")).toThrow(RangeError);
    expect(() => dayCount("2026-09-27", "2026-09-26")).toThrow(RangeError);
    expect(() => shiftDate("2026-09-27", 0.5)).toThrow(RangeError);
    expect(() => shiftDate("2026-09-27", Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => resolveReportPeriod("week", "2026-09-27", "")).toThrow(RangeError);
  });
});

describe("report calendar periods", () => {
  it("uses Monday through Sunday and treats Sunday as the same week", () => {
    const expected = { start: "2026-09-21", end: "2026-09-27", calendarEnd: "2026-09-27", previousStart: "2026-09-14", previousEnd: "2026-09-20", isPartial: false };
    expect(resolveReportPeriod("week", "2026-09-21", "2026-10-01")).toEqual(expected);
    expect(resolveReportPeriod("week", "2026-09-27", "2026-10-01")).toEqual(expected);
    expect(resolveReportPeriod("week", "2026-09-28", "2026-10-10").start).toBe("2026-09-28");
  });

  it("limits a current week to today and compares matching weekdays", () => {
    expect(resolveReportPeriod("week", "2026-09-23", "2026-09-23")).toEqual({
      start: "2026-09-21", end: "2026-09-23", calendarEnd: "2026-09-27", previousStart: "2026-09-14", previousEnd: "2026-09-16", isPartial: true,
    });
  });

  it("compares just Monday on the first day of the current week", () => {
    const period = resolveReportPeriod("week", "2026-09-28", "2026-09-28");
    expect(period.start).toBe(period.end);
    expect(period.previousStart).toBe("2026-09-21");
    expect(period.previousEnd).toBe("2026-09-21");
    expect(period.isPartial).toBe(true);
  });

  it("uses a complete leap February and all of January for its comparison", () => {
    expect(resolveReportPeriod("month", "2024-02-15", "2024-03-15")).toEqual({
      start: "2024-02-01", end: "2024-02-29", calendarEnd: "2024-02-29", previousStart: "2024-01-01", previousEnd: "2024-01-31", isPartial: false,
    });
  });

  it("compares complete months, not an equal rolling number of days", () => {
    const march = resolveReportPeriod("month", "2026-03-20", "2026-04-02");
    expect(dayCount(march.start, march.end)).toBe(31);
    expect(march.previousStart).toBe("2026-02-01");
    expect(march.previousEnd).toBe("2026-02-28");
    const april = resolveReportPeriod("month", "2026-04-01", "2026-05-01");
    expect(dayCount(april.start, april.end)).toBe(30);
    expect(dayCount(april.previousStart, april.previousEnd)).toBe(31);
  });

  it("compares elapsed days of a partial month without including future days", () => {
    expect(resolveReportPeriod("month", "2026-09-03", "2026-09-12")).toEqual({
      start: "2026-09-01", end: "2026-09-12", calendarEnd: "2026-09-30", previousStart: "2026-08-01", previousEnd: "2026-08-12", isPartial: true,
    });
  });

  it("caps a partial comparison at the end of a shorter previous month", () => {
    const period = resolveReportPeriod("month", "2026-03-30", "2026-03-30");
    expect(period.end).toBe("2026-03-30");
    expect(period.previousEnd).toBe("2026-02-28");
    expect(period.isPartial).toBe(true);
  });

  it("treats the final day of the current month as a complete month", () => {
    const period = resolveReportPeriod("month", "2026-04-01", "2026-04-30");
    expect(period.end).toBe("2026-04-30");
    expect(period.previousEnd).toBe("2026-03-31");
    expect(period.isPartial).toBe(false);
  });

  it("crosses December/January for month and week comparisons", () => {
    const month = resolveReportPeriod("month", "2026-01-12", "2026-02-12");
    expect(month.previousStart).toBe("2025-12-01");
    expect(month.previousEnd).toBe("2025-12-31");
    const week = resolveReportPeriod("week", "2026-01-01", "2026-02-12");
    expect(week.start).toBe("2025-12-29");
    expect(week.end).toBe("2026-01-04");
  });

  it.each<ReportPeriod>(["week", "month", "7d", "30d", "90d"])("clamps a future anchor to today for %s", (mode) => {
    expect(resolveReportPeriod(mode, "2027-01-01", "2026-09-23")).toEqual(resolveReportPeriod(mode, "2026-09-23", "2026-09-23"));
  });

  it("uses the supplied local date key even when UTC has already reached tomorrow", () => {
    // The caller has converted 2026-09-28T02:30Z to Argentina's local day 2026-09-27.
    const local = resolveReportPeriod("week", "2026-09-27", "2026-09-27");
    expect(local.end).toBe("2026-09-27");
    expect(local.start).toBe("2026-09-21");
    expect(local.isPartial).toBe(false);
  });
});

describe("rolling ranges and report navigation", () => {
  it.each<[ReportPeriod, number]>([["7d", 7], ["30d", 30], ["90d", 90]])("keeps %s and its previous period equally long and adjacent", (mode, days) => {
    const period = resolveReportPeriod(mode, "2026-09-27", "2026-09-27");
    expect(dayCount(period.start, period.end)).toBe(days);
    expect(dayCount(period.previousStart, period.previousEnd)).toBe(days);
    expect(shiftDate(period.previousEnd, 1)).toBe(period.start);
    expect(period.calendarEnd).toBe(period.end);
    expect(period.isPartial).toBe(false);
    expect(moveReportAnchor(mode, "2026-09-27", -1)).toBe(shiftDate("2026-09-27", -days));
    expect(moveReportAnchor(mode, "2026-09-27", 1)).toBe(shiftDate("2026-09-27", days));
  });

  it("moves to the first day of a neighboring month without overflow", () => {
    expect(moveReportAnchor("month", "2024-03-31", -1)).toBe("2024-02-01");
    expect(moveReportAnchor("month", "2026-12-31", 1)).toBe("2027-01-01");
    expect(moveReportAnchor("month", "2026-01-31", -1)).toBe("2025-12-01");
  });

  it("moves to the Monday of a neighboring week", () => {
    expect(moveReportAnchor("week", "2026-09-27", -1)).toBe("2026-09-14");
    expect(moveReportAnchor("week", "2026-09-27", 1)).toBe("2026-09-28");
  });

  it("rejects invalid anchors when navigating", () => {
    expect(() => moveReportAnchor("month", "2026-02-30", 1)).toThrow(RangeError);
    expect(() => moveReportAnchor("week", "", -1)).toThrow(RangeError);
  });
});
