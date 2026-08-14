import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { enumeratePeriods, periodizeCosts, periodizeRevenue, projectPeriods } from "./periodize";
import type { Project } from "./model";
import project001 from "../../demo/projects/001-intranet-relaunch.json";
import project002 from "../../demo/projects/002-booking-integration-example-hotel-a.json";
import project003 from "../../demo/projects/003-erp-data-migration.json";

describe("enumeratePeriods", () => {
  it("enumerates monthly periods inclusive of both ends", () => {
    expect(enumeratePeriods("2026-01", "2026-08", "monthly")).toEqual([
      "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08",
    ]);
  });

  it("enumerates quarterly periods, wrapping year at Q4->Q1", () => {
    expect(enumeratePeriods("2025-Q3", "2026-Q1", "quarterly")).toEqual([
      "2025-Q3", "2025-Q4", "2026-Q1",
    ]);
  });

  it("enumerates a single period for total periodization", () => {
    expect(enumeratePeriods("2026", "2026", "total")).toEqual(["2026"]);
  });

  it("throws on a malformed monthly period key", () => {
    expect(() => enumeratePeriods("2026/01", "2026-02", "monthly")).toThrow(/Invalid monthly period key/);
  });

  it("throws on a malformed quarterly period key", () => {
    expect(() => enumeratePeriods("2026-Q1", "2026-Q5", "quarterly")).toThrow(/Invalid quarterly period key/);
  });
});

describe("periodizeCosts — demo fixtures", () => {
  it("001: salary + consultancy category totals match hand-computed figures", () => {
    const result = periodizeCosts(project001 as Project);
    expect(result.totalByCategory.salary).toBeCloseTo(993600, 2);
    expect(result.totalByCategory.consultancy).toBeCloseTo(480000, 2);
    expect(result.grandTotal).toBeCloseTo(1473600, 2);
  });

  it("003: salary (two roles) + consultancy totals match demo README", () => {
    const result = periodizeCosts(project003 as Project);
    expect(result.totalByCategory.salary).toBeCloseTo(1356750, 2);
    expect(result.totalByCategory.consultancy).toBeCloseTo(540000, 2);
    expect(result.grandTotal).toBeCloseTo(1896750, 2);
  });

  it("treats periods missing from a line's valuesPerPeriod as zero, not undefined", () => {
    const project: Project = {
      id: "997",
      name: "sparse",
      type: "internal",
      status: "planning",
      currency: "NOK",
      displayUnits: "whole",
      periodization: "monthly",
      startPeriod: "2026-01",
      endPeriod: "2026-03",
      loadedCostMultiplier: 1,
      pricingModel: null,
      costs: [
        {
          id: "sparse-line",
          category: "other_direct",
          label: "One-off cost",
          valuesPerPeriod: { "2026-02": 5000 },
          confidence: "rough",
        },
      ],
      stakeholders: [],
      dependencies: [],
    };
    const result = periodizeCosts(project);
    expect(result.byCategory.other_direct["2026-01"]).toBe(0);
    expect(result.byCategory.other_direct["2026-02"]).toBe(5000);
    expect(result.grandTotal).toBe(5000);
  });

  it("sum of per-period totals across every category equals the grand total", () => {
    for (const project of [project001, project002, project003] as Project[]) {
      const result = periodizeCosts(project);
      const periodSum = Object.values(result.totalByPeriod).reduce((a, b) => a + b, 0);
      expect(periodSum).toBeCloseTo(result.grandTotal, 6);
    }
  });
});

describe("periodizeRevenue — demo fixtures", () => {
  it("002: fixed price recognized entirely at the final period", () => {
    const result = periodizeRevenue(project002 as Project);
    expect(result.byPeriod["2025-Q1"]).toBe(0);
    expect(result.byPeriod["2025-Q2"]).toBe(0);
    expect(result.byPeriod["2025-Q3"]).toBe(0);
    expect(result.byPeriod["2025-Q4"]).toBe(900000);
    expect(result.total).toBe(900000);
  });

  it("003: hourly revenue = hours x rate per period", () => {
    const result = periodizeRevenue(project003 as Project);
    expect(result.byPeriod["2026-10"]).toBe(400 * 900);
    expect(result.total).toBeCloseTo(2160000, 2);
  });

  it("hourly revenue treats a period missing from hoursPerPeriod as zero hours", () => {
    const project: Project = {
      ...(project003 as Project),
      pricingModel: {
        type: "hourly",
        ratePerHour: 900,
        hoursPerPeriod: { "2026-10": 400 },
        confidence: "rough",
      },
    };
    const result = periodizeRevenue(project);
    expect(result.byPeriod["2026-11"]).toBe(0);
  });

  it("custom allocation treats a period missing from values as zero", () => {
    const project: Project = {
      ...(project002 as Project),
      pricingModel: {
        type: "fixed",
        amount: 500000,
        allocation: { type: "custom", values: { "2025-Q4": 500000 } },
        confidence: "committed",
      },
    };
    const result = periodizeRevenue(project);
    expect(result.byPeriod["2025-Q1"]).toBe(0);
    expect(result.total).toBe(500000);
  });

  it("001: internal project (pricingModel null) has zero revenue", () => {
    const result = periodizeRevenue(project001 as Project);
    expect(result.total).toBe(0);
    for (const period of projectPeriods(project001 as Project)) {
      expect(result.byPeriod[period]).toBe(0);
    }
  });

  it("throws when an at_period allocation points outside the project lifetime", () => {
    const project: Project = {
      ...(project002 as Project),
      pricingModel: {
        type: "fixed",
        amount: 900000,
        allocation: { type: "at_period", period: "2026-Q1" },
        confidence: "committed",
      },
    };
    expect(() => periodizeRevenue(project)).toThrow(/outside the project lifetime/);
  });
});

describe("allocation property: periodized revenue always sums to the modeled total", () => {
  it("even allocation sums to the fixed amount for any period count", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        fc.float({ min: 0, max: Math.fround(1_000_000), noNaN: true }),
        (monthCount, amount) => {
          const periods = Array.from({ length: monthCount }, (_, i) =>
            `2026-${String(i + 1).padStart(2, "0")}`,
          );
          const project: Project = {
            id: "999",
            name: "prop",
            type: "customer",
            status: "planning",
            currency: "NOK",
            displayUnits: "whole",
            periodization: "monthly",
            startPeriod: periods[0],
            endPeriod: periods[periods.length - 1],
            loadedCostMultiplier: 1,
            pricingModel: { type: "fixed", amount, allocation: { type: "even" }, confidence: "estimated" },
            costs: [],
            stakeholders: [],
            dependencies: [],
          };
          const result = periodizeRevenue(project);
          expect(result.total).toBeCloseTo(amount, 2);
        },
      ),
    );
  });

  it("custom allocation sums to whatever the per-period values sum to", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 0, max: Math.fround(100_000), noNaN: true }), { minLength: 1, maxLength: 12 }),
        (values) => {
          const periods = values.map((_, i) => `2026-${String(i + 1).padStart(2, "0")}`);
          const valuesByPeriod = Object.fromEntries(periods.map((p, i) => [p, values[i]]));
          const total = values.reduce((a, b) => a + b, 0);
          const project: Project = {
            id: "999",
            name: "prop",
            type: "customer",
            status: "planning",
            currency: "NOK",
            displayUnits: "whole",
            periodization: "monthly",
            startPeriod: periods[0],
            endPeriod: periods[periods.length - 1],
            loadedCostMultiplier: 1,
            pricingModel: {
              type: "fixed",
              amount: total,
              allocation: { type: "custom", values: valuesByPeriod },
              confidence: "estimated",
            },
            costs: [],
            stakeholders: [],
            dependencies: [],
          };
          const result = periodizeRevenue(project);
          expect(result.total).toBeCloseTo(total, 2);
        },
      ),
    );
  });
});
