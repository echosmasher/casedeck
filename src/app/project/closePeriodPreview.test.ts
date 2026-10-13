import { describe, expect, it } from "vitest";
import { previewClosePeriods as preview_ } from "./closePeriodPreview";
import type { Project } from "@/engine/model";

const PERIODS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
const flat = Object.fromEntries(PERIODS.map((p) => [p, 1000]));
const PROJECT: Project = {
  id: "t",
  name: "t",
  type: "internal",
  status: "active",
  currency: "NOK",
  periodization: "monthly",
  startPeriod: "2026-01",
  endPeriod: "2026-06",
  loadedCostMultiplier: 1,
  pricingModel: null,
  costs: [
    { id: "a", category: "personnel", label: "People", valuesPerPeriod: flat, confidence: "committed" },
    { id: "b", category: "travel", label: "Travel", valuesPerPeriod: flat, confidence: "committed" },
  ],
  stakeholders: [],
  dependencies: [],
  closedPeriods: [],
} as unknown as Project;
const previewClosePeriods = (closed: string[], target: string | null, actuals: { period: string; category: string }[]) =>
  preview_({ ...PROJECT, closedPeriods: closed }, PERIODS, target, actuals);
const ACTUALS = [
  { period: "2026-01", category: "personnel" },
  { period: "2026-02", category: "personnel" },
  { period: "2026-02", category: "revenue" },
  { period: "2026-03", category: "revenue" },
];

describe("previewClosePeriods", () => {
  it("closing forward lists each newly closed period with what is recorded", () => {
    const preview = previewClosePeriods(["2026-01"], "2026-04", ACTUALS);
    expect(preview.nextClosedPeriods).toEqual(["2026-01", "2026-02", "2026-03", "2026-04"]);
    expect(preview.closing).toEqual([
      { period: "2026-02", hasCost: true, hasRevenue: true, missingCategories: ["travel"] },
      { period: "2026-03", hasCost: false, hasRevenue: true, missingCategories: [] },
      { period: "2026-04", hasCost: false, hasRevenue: false, missingCategories: [] },
    ]);
    expect(preview.reopening).toEqual([]);
    // 2026-03 has revenue but no cost: its cost still counts as zero, so it is flagged too.
    expect(preview.closingWithoutCost).toEqual(["2026-03", "2026-04"]);
    expect(preview.unchanged).toBe(false);
  });

  it("picking an earlier period reopens everything after it", () => {
    const preview = previewClosePeriods(["2026-01", "2026-02", "2026-03"], "2026-01", ACTUALS);
    expect(preview.nextClosedPeriods).toEqual(["2026-01"]);
    expect(preview.closing).toEqual([]);
    expect(preview.reopening).toEqual(["2026-02", "2026-03"]);
    expect(preview.closingWithoutCost).toEqual([]);
  });

  it("null target reopens every closed period", () => {
    const preview = previewClosePeriods(["2026-01", "2026-02"], null, ACTUALS);
    expect(preview.nextClosedPeriods).toEqual([]);
    expect(preview.reopening).toEqual(["2026-01", "2026-02"]);
  });

  it("picking the current boundary is unchanged", () => {
    expect(previewClosePeriods(["2026-01", "2026-02"], "2026-02", ACTUALS).unchanged).toBe(true);
    expect(previewClosePeriods([], null, ACTUALS).unchanged).toBe(true);
  });

  it("closing from nothing with no actuals at all flags every period", () => {
    const preview = previewClosePeriods([], "2026-02", []);
    expect(preview.closingWithoutCost).toEqual(["2026-01", "2026-02"]);
  });

  it("rejects a period outside the project, naming it and the valid range", () => {
    expect(() => previewClosePeriods([], "2027-01", ACTUALS)).toThrow(
      'Period "2027-01" is not one of this project\'s periods (2026-01–2026-06)',
    );
  });
});
