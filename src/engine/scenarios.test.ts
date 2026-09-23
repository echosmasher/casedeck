import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  bandFraction,
  computeProjectScenarios,
  costScenarioValue,
  lineScenarioTotal,
  resolveConfidence,
  revenueScenarioValue,
} from "./scenarios";
import type { Confidence, ConfidenceBands, Project, SalaryLineItem } from "./model";
import project001 from "../../demo/projects/001-intranet-relaunch.json";
import project002 from "../../demo/projects/002-booking-integration-example-hotel-a.json";
import project003 from "../../demo/projects/003-erp-data-migration.json";

const bands: ConfidenceBands = {
  committed: { bandPct: 0 },
  estimated: { bandPct: 10 },
  rough: { bandPct: 30 },
};

const confidenceArb = fc.constantFrom<Confidence>("committed", "estimated", "rough");
const valueArb = fc.float({ min: 0, max: Math.fround(1_000_000), noNaN: true });

describe("band symmetry property", () => {
  it("cost scenario: worst + best = 2 x expected, for any value and confidence", () => {
    fc.assert(
      fc.property(valueArb, confidenceArb, (value, confidence) => {
        const sv = costScenarioValue(value, confidence, bands);
        expect(sv.worst + sv.best).toBeCloseTo(2 * value, 4);
      }),
    );
  });

  it("revenue scenario: worst + best = 2 x expected, for any value and confidence", () => {
    fc.assert(
      fc.property(valueArb, confidenceArb, (value, confidence) => {
        const sv = revenueScenarioValue(value, confidence, bands);
        expect(sv.worst + sv.best).toBeCloseTo(2 * value, 4);
      }),
    );
  });
});

describe("committed invariance property", () => {
  it("committed confidence collapses best = expected = worst, for costs and revenue", () => {
    fc.assert(
      fc.property(valueArb, (value) => {
        const cost = costScenarioValue(value, "committed", bands);
        const revenue = revenueScenarioValue(value, "committed", bands);
        expect(cost.best).toBeCloseTo(value, 6);
        expect(cost.worst).toBeCloseTo(value, 6);
        expect(revenue.best).toBeCloseTo(value, 6);
        expect(revenue.worst).toBeCloseTo(value, 6);
      }),
    );
  });
});

describe("resolveConfidence", () => {
  it("uses the per-period override when present, else the line's base confidence", () => {
    expect(resolveConfidence("rough", { "2026-01": "estimated" }, "2026-01")).toBe("estimated");
    expect(resolveConfidence("rough", { "2026-01": "estimated" }, "2026-02")).toBe("rough");
    expect(resolveConfidence("rough", undefined, "2026-02")).toBe("rough");
  });
});

describe("bandFraction", () => {
  it("converts bandPct to a 0-1 fraction", () => {
    expect(bandFraction("estimated", bands)).toBeCloseTo(0.1, 6);
    expect(bandFraction("rough", bands)).toBeCloseTo(0.3, 6);
    expect(bandFraction("committed", bands)).toBe(0);
  });
});

describe("computeProjectScenarios — fixed-price allocation variants", () => {
  const base: Project = {
    id: "999",
    code: "999",
    name: "alloc-test",
    type: "customer",
    status: "planning",
    currency: "NOK",
    displayUnits: "whole",
    periodization: "monthly",
    startPeriod: "2026-01",
    endPeriod: "2026-03",
    loadedCostMultiplier: 1,
    pricingModel: null,
    costs: [],
    stakeholders: [],
    dependencies: [],
    closedPeriods: [],
  };

  it("even allocation splits the amount equally across periods, and bands it", () => {
    const project: Project = {
      ...base,
      pricingModel: { type: "fixed", amount: 300000, allocation: { type: "even" }, confidence: "estimated" },
    };
    const result = computeProjectScenarios(project, bands);
    expect(result.revenueByPeriod["2026-01"].expected).toBeCloseTo(100000, 6);
    expect(result.revenueByPeriod["2026-01"].worst).toBeCloseTo(90000, 6);
    expect(result.revenueByPeriod["2026-01"].best).toBeCloseTo(110000, 6);
    expect(result.totals.revenue.expected).toBeCloseTo(300000, 6);
  });

  it("custom allocation uses the given per-period values, and bands them", () => {
    const project: Project = {
      ...base,
      pricingModel: {
        type: "fixed",
        amount: 300000,
        allocation: { type: "custom", values: { "2026-01": 50000, "2026-02": 250000, "2026-03": 0 } },
        confidence: "rough",
      },
    };
    const result = computeProjectScenarios(project, bands);
    expect(result.revenueByPeriod["2026-01"].expected).toBe(50000);
    expect(result.revenueByPeriod["2026-02"].expected).toBe(250000);
    expect(result.revenueByPeriod["2026-02"].worst).toBeCloseTo(175000, 6);
    expect(result.revenueByPeriod["2026-03"].expected).toBe(0);
    expect(result.totals.revenue.expected).toBeCloseTo(300000, 6);
  });
});

describe("computeProjectScenarios — demo fixtures", () => {
  it("001: costs-only project, worst margin is the negative of worst cost", () => {
    const result = computeProjectScenarios(project001 as Project, bands);
    expect(result.totals.cost.expected).toBeCloseTo(1473600, 2);
    expect(result.totals.revenue.expected).toBe(0);
    expect(result.totals.margin.expected).toBeCloseTo(-1473600, 2);
  });

  it("002: total profitable despite three quarters of deep per-period loss", () => {
    const result = computeProjectScenarios(project002 as Project, bands);
    expect(result.marginByPeriod["2025-Q1"].expected).toBeCloseTo(-189500, 2);
    expect(result.marginByPeriod["2025-Q2"].expected).toBeCloseTo(-194500, 2);
    expect(result.marginByPeriod["2025-Q3"].expected).toBeCloseTo(-191500, 2);
    expect(result.marginByPeriod["2025-Q4"].expected).toBeCloseTo(812250, 2);
    expect(result.totals.margin.expected).toBeCloseTo(236750, 2);

    let cumulative = 0;
    const cumByQuarter: Record<string, number> = {};
    for (const q of ["2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4"]) {
      cumulative += result.marginByPeriod[q].expected;
      cumByQuarter[q] = cumulative;
    }
    expect(cumByQuarter["2025-Q1"]).toBeLessThan(0);
    expect(cumByQuarter["2025-Q2"]).toBeLessThan(0);
    expect(cumByQuarter["2025-Q3"]).toBeLessThan(0);
    expect(cumByQuarter["2025-Q4"]).toBeCloseTo(236750, 2);
  });

  it("003: expected case profitable, worst case is not — the flagship scenario story", () => {
    const result = computeProjectScenarios(project003 as Project, bands);
    expect(result.totals.margin.expected).toBeCloseTo(263250, 2);
    expect(result.totals.margin.worst).toBeCloseTo(-809775, 2);
    expect(result.totals.margin.best).toBeCloseTo(1336275, 2);
    expect(result.totals.margin.expected).toBeGreaterThan(0);
    expect(result.totals.margin.worst).toBeLessThan(0);
  });
});

describe("lineScenarioTotal — dashboard drill-down", () => {
  it("001: Senior Developer salary line totals, banded at its own confidence", () => {
    const seniorDev = (project001 as Project).costs[0] as SalaryLineItem;
    const total = lineScenarioTotal(seniorDev, (project001 as Project).loadedCostMultiplier, bands);
    const expected = 80 * 750 * 1.35 * 8;
    expect(total.expected).toBeCloseTo(expected, 2);
    expect(total.worst).toBeCloseTo(expected * 1.1, 2);
    expect(total.best).toBeCloseTo(expected * 0.9, 2);
  });
});
