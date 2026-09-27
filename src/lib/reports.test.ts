import { describe, expect, it } from "vitest";
import { averageLoggedDays, dateKeyInTimeZone, goalForDate, movingAverage7, weightTrend } from "./reports";

describe("reports", () => {
  it("does not treat missing days as zero", () => { const result = averageLoggedDays([{ date: "1", calories: 2000, protein: 160, carbs: 200, fat: 70 }, { date: "2", calories: 2400, protein: 180, carbs: 250, fat: 75 }], 7); expect(result.averages?.calories).toBe(2200); expect(result.daysLogged).toBe(2); expect(result.coverage).toBe(29); });
  it("only exposes moving average with seven points", () => { const points = Array.from({ length: 7 }, (_, i) => ({ date: `2026-09-${i + 1}`, weightKg: 90 + i })); expect(movingAverage7(points)[5].movingAverage).toBeNull(); expect(movingAverage7(points)[6].movingAverage).toBe(93); });
  it("calculates weight change and average", () => expect(weightTrend([{ date: "2026-01-02", weightKg: 91 }, { date: "2026-01-01", weightKg: 92 }])?.change).toBe(-1));
  it("selects the historically active goal", () => { const first = { validFrom: new Date("2026-01-01"), validUntil: new Date("2026-02-01"), calories: 2400, protein: 180, fat: 75 }; const second = { ...first, validFrom: new Date("2026-02-02"), validUntil: null, calories: 2250 }; expect(goalForDate([first, second], new Date("2026-01-20"))?.calories).toBe(2400); });
  it("groups timestamps in the user timezone", () => expect(dateKeyInTimeZone(new Date("2026-09-28T02:00:00Z"), "America/Argentina/San_Juan")).toBe("2026-09-27"));
});
