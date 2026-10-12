import { describe, expect, it } from "vitest";
import { previewClosePeriods } from "./closePeriodPreview";

const PERIODS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
const ACTUALS = [
  { period: "2026-01", category: "personnel" },
  { period: "2026-02", category: "personnel" },
  { period: "2026-02", category: "revenue" },
  { period: "2026-03", category: "revenue" },
];

describe("previewClosePeriods", () => {
  it("closing forward lists each newly closed period with what is recorded", () => {
    const preview = previewClosePeriods(PERIODS, ["2026-01"], "2026-04", ACTUALS);
    expect(preview.nextClosedPeriods).toEqual(["2026-01", "2026-02", "2026-03", "2026-04"]);
    expect(preview.closing).toEqual([
      { period: "2026-02", hasCost: true, hasRevenue: true },
      { period: "2026-03", hasCost: false, hasRevenue: true },
      { period: "2026-04", hasCost: false, hasRevenue: false },
    ]);
    expect(preview.reopening).toEqual([]);
    expect(preview.closingWithoutActuals).toEqual(["2026-04"]);
    expect(preview.unchanged).toBe(false);
  });

  it("picking an earlier period reopens everything after it", () => {
    const preview = previewClosePeriods(PERIODS, ["2026-01", "2026-02", "2026-03"], "2026-01", ACTUALS);
    expect(preview.nextClosedPeriods).toEqual(["2026-01"]);
    expect(preview.closing).toEqual([]);
    expect(preview.reopening).toEqual(["2026-02", "2026-03"]);
    expect(preview.closingWithoutActuals).toEqual([]);
  });

  it("null target reopens every closed period", () => {
    const preview = previewClosePeriods(PERIODS, ["2026-01", "2026-02"], null, ACTUALS);
    expect(preview.nextClosedPeriods).toEqual([]);
    expect(preview.reopening).toEqual(["2026-01", "2026-02"]);
  });

  it("picking the current boundary is unchanged", () => {
    expect(previewClosePeriods(PERIODS, ["2026-01", "2026-02"], "2026-02", ACTUALS).unchanged).toBe(true);
    expect(previewClosePeriods(PERIODS, [], null, ACTUALS).unchanged).toBe(true);
  });

  it("closing from nothing with no actuals at all flags every period", () => {
    const preview = previewClosePeriods(PERIODS, [], "2026-02", []);
    expect(preview.closingWithoutActuals).toEqual(["2026-01", "2026-02"]);
  });

  it("rejects a period outside the project, naming it and the valid range", () => {
    expect(() => previewClosePeriods(PERIODS, [], "2027-01", ACTUALS)).toThrow(
      'Period "2027-01" is not one of this project\'s periods (2026-01–2026-06)',
    );
  });
});
