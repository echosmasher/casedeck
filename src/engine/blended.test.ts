import { describe, expect, it } from "vitest";
import { computeBlendedTotals } from "./blended";
import { computeProjectScenarios } from "./scenarios";
import type { ActualEntry, ConfidenceBands, Project } from "./model";
import project001 from "../../demo/projects/001-intranet-relaunch.json";
import project003 from "../../demo/projects/003-erp-data-migration.json";

const bands: ConfidenceBands = {
  committed: { bandPct: 0 },
  estimated: { bandPct: 10 },
  rough: { bandPct: 30 },
};

// Same fixture as variance.test.ts: hand-transcribed from demo/actuals/001-actuals-2026-0{1..4}.csv.
const actuals001: ActualEntry[] = [
  { period: "2026-01", category: "salary", amount: 124200, description: "Payroll run", source: "csv" },
  { period: "2026-01", category: "consultancy", amount: 60000, description: "CMS vendor invoice #INV-1001", source: "csv" },
  { period: "2026-02", category: "salary", amount: 123700, description: "Payroll run", source: "csv" },
  { period: "2026-02", category: "consultancy", amount: 86000, description: "CMS vendor invoice #INV-1014", source: "csv" },
  { period: "2026-03", category: "salary", amount: 125300, description: "Payroll run", source: "csv" },
  { period: "2026-03", category: "consultancy", amount: 87500, description: "CMS vendor invoice #INV-1029", source: "csv" },
  { period: "2026-04", category: "salary", amount: 124100, description: "Payroll run", source: "csv" },
  { period: "2026-04", category: "consultancy", amount: 85000, description: "CMS vendor invoice #INV-1042", source: "csv" },
];

describe("computeBlendedTotals — no closed periods", () => {
  it("003: blended output equals the plain scenario output exactly", () => {
    const scenarios = computeProjectScenarios(project003 as Project, bands);
    const blended = computeBlendedTotals(project003 as Project, [], bands);

    expect(blended.lastClosedPeriod).toBeNull();
    expect(blended.warnings).toEqual([]);
    for (const period of scenarios.periods) {
      expect(blended.costByPeriod[period]).toEqual(scenarios.costByPeriod[period]);
      expect(blended.revenueByPeriod[period]).toEqual(scenarios.revenueByPeriod[period]);
      expect(blended.marginByPeriod[period]).toEqual(scenarios.marginByPeriod[period]);
    }
    expect(blended.totals).toEqual(scenarios.totals);
  });
});

describe("computeBlendedTotals — 001 closed through 2026-04", () => {
  const blended = computeBlendedTotals(project001 as Project, actuals001, bands);

  it("collapses closed periods to a zero-width band at the actual value", () => {
    const jan = blended.costByPeriod["2026-01"];
    expect(jan.expected).toBeCloseTo(184200, 2);
    expect(jan.best).toBeCloseTo(184200, 2);
    expect(jan.worst).toBeCloseTo(184200, 2);
  });

  it("open periods after the close point stay projected, with a real band", () => {
    const may = blended.costByPeriod["2026-05"];
    expect(may.best).toBeLessThan(may.expected);
    expect(may.worst).toBeGreaterThan(may.expected);
  });

  it("reports the last closed period for the dashboard caption", () => {
    expect(blended.lastClosedPeriod).toBe("2026-04");
  });

  it("no revenue was ever budgeted or actualised, so blended revenue stays zero throughout", () => {
    expect(blended.totals.revenue.expected).toBe(0);
  });

  it("has no warnings — every closed period has actuals", () => {
    expect(blended.warnings).toEqual([]);
  });
});

describe("computeBlendedTotals — revenue actuals and warnings", () => {
  const project: Project = {
    id: "997",
    code: "997",
    name: "revenue-blend-test",
    type: "customer",
    status: "in_progress",
    currency: "NOK",
    displayUnits: "whole",
    periodization: "monthly",
    startPeriod: "2026-01",
    endPeriod: "2026-03",
    loadedCostMultiplier: 1,
    pricingModel: {
      type: "fixed",
      amount: 300000,
      allocation: { type: "even" },
      confidence: "estimated",
    },
    costs: [
      {
        id: "license",
        category: "it_systems",
        label: "License fee",
        valuesPerPeriod: { "2026-01": 20000, "2026-02": 20000, "2026-03": 20000 },
        confidence: "estimated",
      },
    ],
    stakeholders: [],
    dependencies: [],
    closedPeriods: ["2026-01", "2026-02"],
  };

  it("actual revenue flows into blended revenue and margin for a closed period", () => {
    const actuals: ActualEntry[] = [
      { period: "2026-01", category: "it_systems", amount: 18000, description: "invoice", source: "csv" },
      { period: "2026-01", category: "revenue", amount: 110000, description: "customer invoice", source: "csv" },
    ];
    const blended = computeBlendedTotals(project, actuals, bands);

    const jan = blended.revenueByPeriod["2026-01"];
    expect(jan.expected).toBe(110000);
    expect(jan.best).toBe(110000);
    expect(jan.worst).toBe(110000);

    const janMargin = blended.marginByPeriod["2026-01"];
    expect(janMargin.expected).toBeCloseTo(110000 - 18000, 6);

    // 2026-02 is closed but has no actuals at all: treated as zero cost and revenue, with a warning.
    expect(blended.costByPeriod["2026-02"]).toEqual({ expected: 0, best: 0, worst: 0 });
    expect(blended.revenueByPeriod["2026-02"]).toEqual({ expected: 0, best: 0, worst: 0 });
    expect(blended.warnings).toEqual(["2026-02 is closed but has no actuals"]);
  });

  it("a closed period with only cost actuals (no revenue entry) is not warned about", () => {
    const actuals: ActualEntry[] = [
      { period: "2026-01", category: "it_systems", amount: 18000, description: "invoice", source: "csv" },
      { period: "2026-02", category: "it_systems", amount: 21000, description: "invoice", source: "csv" },
    ];
    const blended = computeBlendedTotals(project, actuals, bands);
    expect(blended.warnings).toEqual([]);
    expect(blended.revenueByPeriod["2026-02"]).toEqual({ expected: 0, best: 0, worst: 0 });
  });

  it("returns budgeted values for every period regardless of closed state", () => {
    const blended = computeBlendedTotals(project, [], bands);
    expect(blended.budgetedCostByPeriod).toEqual({
      "2026-01": 20000,
      "2026-02": 20000,
      "2026-03": 20000,
    });
    expect(blended.budgetedRevenueByPeriod["2026-01"]).toBeCloseTo(100000, 6);
    expect(blended.budgetedRevenueByPeriod["2026-03"]).toBeCloseTo(100000, 6);
  });
});
