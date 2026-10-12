import { describe, expect, it } from "vitest";
import { computeHeadline } from "./headline";
import type { ActualEntry, ConfidenceBands, Project } from "./model";
import project001 from "../../demo/projects/001-intranet-relaunch.json";
import project002 from "../../demo/projects/002-booking-integration-example-hotel-a.json";
import project003 from "../../demo/projects/003-erp-data-migration.json";

const bands: ConfidenceBands = {
  committed: { bandPct: 0 },
  estimated: { bandPct: 10 },
  rough: { bandPct: 30 },
};

// Same fixtures as variance.test.ts, hand-transcribed from demo/actuals/.
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

describe("computeHeadline — 001 internal, closed through 2026-04 (the overrun story)", () => {
  const h = computeHeadline(project001 as Project, actuals001, bands);

  it("leads with cost against budgeted cost, never margin", () => {
    expect(h.measure).toBe("cost");
    expect(h.value.expected).toBeCloseTo(1552600, 6);
    expect(h.budget).toBeCloseTo(1473600, 6);
    expect(h.deltaVsBudget).toBeCloseTo(79000, 6);
    expect(h.deltaPct).toBeCloseTo(79000 / 1473600, 9);
    expect(h.unfavourable).toBe(true);
    expect(h.worstCaseBelowZero).toBe(false);
  });

  it("status is the worst category (consultancy red), not the total's own Watch", () => {
    expect(h.status).toBe("red");
    expect(h.driver).toBe("consultancy");
  });

  it("reports cost to date against plan and the projected span", () => {
    expect(h.costActualToDate).toBeCloseTo(815800, 6);
    expect(h.costBudgetedToDate).toBeCloseTo(736800, 6);
    expect(h.lastClosedPeriod).toBe("2026-04");
    expect(h.projectedFrom).toBe("2026-05");
    expect(h.projectedTo).toBe("2026-08");
  });
});

describe("computeHeadline — 002 customer, every period closed (the clean case)", () => {
  const h = computeHeadline(project002 as Project, actuals002, bands);

  it("leads with margin, using planned revenue for closed periods with no revenue recorded", () => {
    expect(h.measure).toBe("margin");
    expect(h.value.expected).toBeCloseTo(900000 - 666000, 6);
    expect(h.budget).toBeCloseTo(900000 - 663250, 6);
    expect(h.deltaVsBudget).toBeCloseTo(-2750, 6);
    expect(h.unfavourable).toBe(true);
    expect(h.worstCaseBelowZero).toBe(false);
  });

  it("is on track with nothing projected", () => {
    expect(h.status).toBe("ok");
    expect(h.driver).toBeNull();
    expect(h.lastClosedPeriod).toBe("2025-Q4");
    expect(h.projectedFrom).toBeNull();
    expect(h.projectedTo).toBeNull();
  });
});

describe("computeHeadline — 003 customer, nothing closed", () => {
  const h = computeHeadline(project003 as Project, [], bands);

  it("expected margin equals budget, and the worst case is a loss", () => {
    expect(h.measure).toBe("margin");
    expect(h.value.expected).toBeCloseTo(263250, 6);
    expect(h.value.worst).toBeCloseTo(-809775, 6);
    expect(h.value.best).toBeCloseTo(1336275, 6);
    expect(h.deltaVsBudget).toBeCloseTo(0, 6);
    expect(h.unfavourable).toBe(false);
    expect(h.worstCaseBelowZero).toBe(true);
  });

  it("is on track and fully projected", () => {
    expect(h.status).toBe("ok");
    expect(h.costActualToDate).toBe(0);
    expect(h.lastClosedPeriod).toBeNull();
    expect(h.projectedFrom).toBe("2026-10");
    expect(h.projectedTo).toBe("2027-03");
  });
});

describe("computeHeadline — status and edge cases", () => {
  const base: Project = {
    id: "996",
    code: "996",
    name: "headline-edge",
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
        id: "a",
        category: "it_systems",
        label: "Licences",
        valuesPerPeriod: { "2026-01": 10000, "2026-02": 10000 },
        confidence: "estimated",
      },
      {
        id: "b",
        category: "travel",
        label: "Travel",
        valuesPerPeriod: { "2026-01": 10000, "2026-02": 10000 },
        confidence: "estimated",
      },
    ],
    stakeholders: [],
    dependencies: [],
    closedPeriods: ["2026-01"],
  };

  it("a Watch category drives the status when nothing is red", () => {
    // it_systems: contingency 2,000; 1,500 over plan = 75% consumed → warning.
    const h = computeHeadline(base, [
      { period: "2026-01", category: "it_systems", amount: 11500, description: "x", source: "csv" },
      { period: "2026-01", category: "travel", amount: 10000, description: "y", source: "csv" },
    ], bands);
    expect(h.status).toBe("warning");
    expect(h.driver).toBe("it_systems");
  });

  it("red beats warning, and among equals the most-consumed category is the driver", () => {
    const h = computeHeadline(base, [
      { period: "2026-01", category: "it_systems", amount: 13000, description: "x", source: "csv" }, // 150%
      { period: "2026-01", category: "travel", amount: 15000, description: "y", source: "csv" }, // 250%
    ], bands);
    expect(h.status).toBe("red");
    expect(h.driver).toBe("travel");
  });

  it("cost under budget is favourable", () => {
    const h = computeHeadline(base, [
      { period: "2026-01", category: "it_systems", amount: 9000, description: "x", source: "csv" },
      { period: "2026-01", category: "travel", amount: 9000, description: "y", source: "csv" },
    ], bands);
    expect(h.deltaVsBudget).toBeCloseTo(-2000, 6);
    expect(h.unfavourable).toBe(false);
    expect(h.status).toBe("ok");
  });

  it("a zero budget has no percentage", () => {
    const h = computeHeadline({ ...base, costs: [], closedPeriods: [] }, [], bands);
    expect(h.budget).toBe(0);
    expect(h.deltaPct).toBeNull();
    expect(h.status).toBe("ok");
    expect(h.driver).toBeNull();
  });
});
