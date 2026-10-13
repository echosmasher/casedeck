import { describe, expect, it } from "vitest";
import { computeSpreadDrivers } from "./spread";
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

function rangeWidth(project: Project, actuals: ActualEntry[]) {
  const { value } = computeHeadline(project, actuals, bands);
  return Math.abs(value.worst - value.best);
}

describe("computeSpreadDrivers", () => {
  it("001: only the open months May–Aug carry width; salary is the widest source", () => {
    const drivers = computeSpreadDrivers(project001 as Project, [], bands);
    // Salary: (80h × 750 + 40h × 800) × 1.35 = 124,200/month × 4 open months × 20% width.
    expect(drivers.sources[0]).toMatchObject({ source: "salary", lines: 2, mainConfidence: "estimated", mixedConfidence: false });
    expect(drivers.sources[0].width).toBeCloseTo(99360, 2);
    // Consultancy: 60,000/month × 4 × 20%.
    expect(drivers.sources[1].width).toBeCloseTo(48000, 2);
    expect(drivers.total).toBeCloseTo(147360, 2);
    expect(drivers.total).toBeCloseTo(rangeWidth(project001 as Project, []), 2);
  });

  it("003: revenue is the widest source, mostly rough, and the sources add up to the margin range", () => {
    const drivers = computeSpreadDrivers(project003 as Project, [], bands);
    expect(drivers.sources.map((s) => s.source)).toEqual(["revenue", "salary", "consultancy"]);
    // Revenue: 360,000/month; Oct–Nov estimated (20% width), Dec–Mar rough (60% width).
    expect(drivers.sources[0]).toMatchObject({ lines: 0, mainConfidence: "rough", mixedConfidence: true });
    expect(drivers.sources[0].width).toBeCloseTo(1008000, 2);
    expect(drivers.total).toBeCloseTo(1336275 + 809775, 2);
    expect(drivers.total).toBeCloseTo(rangeWidth(project003 as Project, []), 2);
  });

  it("002: every period closed and revenue committed, so nothing is left to drive a range", () => {
    const drivers = computeSpreadDrivers(project002 as Project, [], bands);
    expect(drivers.sources).toEqual([]);
    expect(drivers.total).toBe(0);
  });

  it("a closed period with recorded revenue drops out of the revenue width", () => {
    const project = { ...(project003 as Project), closedPeriods: ["2026-10"] };
    const revenue: ActualEntry[] = [
      { period: "2026-10", category: "revenue", amount: 360000, description: "Invoice", source: "csv" },
      { period: "2026-10", category: "salary", amount: 200000, description: "Payroll", source: "csv" },
    ];
    const drivers = computeSpreadDrivers(project, revenue, bands);
    expect(drivers.sources.find((s) => s.source === "revenue")!.width).toBeCloseTo(1008000 - 72000, 2);
    expect(drivers.total).toBeCloseTo(rangeWidth(project, revenue), 2);
  });
});
