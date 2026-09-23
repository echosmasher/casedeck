import { describe, expect, it } from "vitest";
import { computeVariance } from "./variance";
import type { ActualEntry, ConfidenceBands, Project } from "./model";
import project001 from "../../demo/projects/001-intranet-relaunch.json";
import project002 from "../../demo/projects/002-booking-integration-example-hotel-a.json";

const bands: ConfidenceBands = {
  committed: { bandPct: 0 },
  estimated: { bandPct: 10 },
  rough: { bandPct: 30 },
};

// Hand-transcribed from demo/actuals/001-actuals-2026-0{1..4}.csv — see demo/README.md Story 1.
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

// Hand-transcribed from demo/actuals/002-actuals-full-lifetime.csv — see demo/README.md Story 2.
const actuals002: ActualEntry[] = [
  { period: "2025-Q1", category: "salary", amount: 123000, description: "Lonn Q1", source: "csv" },
  { period: "2025-Q1", category: "consultancy", amount: 61500, description: "Konsulentfaktura Q1", source: "csv" },
  { period: "2025-Q1", category: "travel", amount: 8300, description: "Reisekostnader Q1", source: "csv" },
  { period: "2025-Q2", category: "salary", amount: 120000, description: "Lonn Q2", source: "csv" },
  { period: "2025-Q2", category: "consultancy", amount: 64000, description: "Konsulentfaktura Q2", source: "csv" },
  { period: "2025-Q2", category: "travel", amount: 7600, description: "Reisekostnader Q2", source: "csv" },
  { period: "2025-Q3", category: "salary", amount: 124000, description: "Lonn Q3", source: "csv" },
  { period: "2025-Q3", category: "consultancy", amount: 67000, description: "Konsulentfaktura Q3", source: "csv" },
  { period: "2025-Q3", category: "travel", amount: 5200, description: "Reisekostnader Q3", source: "csv" },
  { period: "2025-Q4", category: "salary", amount: 59500, description: "Lonn Q4", source: "csv" },
  { period: "2025-Q4", category: "consultancy", amount: 24000, description: "Konsulentfaktura Q4", source: "csv" },
  { period: "2025-Q4", category: "travel", amount: 1900, description: "Reisekostnader Q4", source: "csv" },
];

describe("computeVariance — 001 the overrun story", () => {
  const variance = computeVariance(project001 as Project, actuals001, bands);

  it("consultancy is flagged red: projection-to-complete breaches its own worst-case ceiling", () => {
    const consultancy = variance.byCategory.consultancy;
    expect(consultancy.actualToDate).toBeCloseTo(318500, 2);
    expect(consultancy.projectionToComplete).toBeCloseTo(558500, 2);
    expect(consultancy.worstCeiling).toBeCloseTo(528000, 2);
    expect(consultancy.projectionToComplete).toBeGreaterThan(consultancy.worstCeiling);
    expect(consultancy.flag).toBe("red");
  });

  it("salary tracks budget and is not flagged", () => {
    const salary = variance.byCategory.salary;
    expect(salary.actualToDate).toBeCloseTo(497300, 2);
    expect(salary.projectionToComplete).toBeCloseTo(994100, 2);
    expect(salary.flag).toBe("ok");
  });

  it("blended total consumes the majority of its contingency but does not itself breach", () => {
    expect(variance.total.projectionToComplete).toBeCloseTo(1552600, 2);
    expect(variance.total.worstCeiling).toBeCloseTo(1620960, 2);
    expect(variance.total.projectionToComplete).toBeLessThan(variance.total.worstCeiling);
    expect(variance.total.contingencyConsumedPct).toBeGreaterThan(0.5);
    expect(variance.total.contingencyConsumedPct).toBeLessThan(1);
    expect(variance.total.flag).toBe("warning");
  });
});

describe("computeVariance — 002 the clean case", () => {
  const variance = computeVariance(project002 as Project, actuals002, bands);

  it("every category lands within its estimated band and is not flagged", () => {
    for (const category of ["salary", "consultancy", "travel"]) {
      expect(variance.byCategory[category].flag).toBe("ok");
    }
    expect(variance.total.flag).toBe("ok");
  });

  it("a category with no actuals projects to exactly its expected total", () => {
    const variance003 = computeVariance(project002 as Project, [], bands);
    for (const category of ["salary", "consultancy", "travel"]) {
      const cv = variance003.byCategory[category];
      expect(cv.projectionToComplete).toBeCloseTo(cv.expectedTotal, 6);
      expect(cv.flag).toBe("ok");
    }
  });
});

describe("computeVariance — edge cases", () => {
  const zeroContingencyProject: Project = {
    id: "998",
    code: "998",
    name: "committed-only",
    type: "internal",
    status: "in_progress",
    currency: "NOK",
    displayUnits: "whole",
    periodization: "monthly",
    startPeriod: "2026-01",
    endPeriod: "2026-02",
    loadedCostMultiplier: 1,
    pricingModel: null,
    costs: [
      {
        id: "fixed-fee",
        category: "it_systems",
        label: "Fixed license fee",
        valuesPerPeriod: { "2026-01": 10000, "2026-02": 10000 },
        confidence: "committed",
      },
    ],
    stakeholders: [],
    dependencies: [],
  };

  it("spending against an entirely unbudgeted category has zero contingency and is flagged red", () => {
    const variance = computeVariance(zeroContingencyProject, [
      { period: "2026-01", category: "travel", amount: 500, description: "surprise trip", source: "manual" },
    ], bands);
    const travel = variance.byCategory.travel;
    expect(travel.expectedTotal).toBe(0);
    expect(travel.worstCeiling).toBe(0);
    expect(travel.contingency).toBe(0);
    expect(travel.contingencyConsumedPct).toBe(Number.POSITIVE_INFINITY);
    expect(travel.flag).toBe("red");
  });

  it("a committed (zero-band) category with actuals exactly on budget has zero contingency and is ok", () => {
    const variance = computeVariance(zeroContingencyProject, [
      { period: "2026-01", category: "it_systems", amount: 10000, description: "license invoice", source: "csv" },
    ], bands);
    const itSystems = variance.byCategory.it_systems;
    expect(itSystems.contingency).toBe(0);
    expect(itSystems.contingencyConsumedPct).toBe(0);
    expect(itSystems.flag).toBe("ok");
  });
});
