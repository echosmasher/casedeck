import { describe, expect, it } from "vitest";
import { describeCostEdit, describeEffect, describeRevenueEdit } from "./editFeedback";
import { computeHeadline } from "@/engine/headline";
import type { ActualEntry, ConfidenceBands, CostLineItem, HourlyPricingModel, Project } from "@/engine/model";
import project001 from "../../../demo/projects/001-intranet-relaunch.json";
import { demoSnapshot } from "../_lib/demoSnapshot";

const units = { currency: "NOK", displayUnits: "whole" as const };
const bands: ConfidenceBands = { committed: { bandPct: 0 }, estimated: { bandPct: 10 }, rough: { bandPct: 30 } };
const nbsp = (s: string) => s.replaceAll(" ", " ");

const salary = (project001 as Project).costs[0] as Extract<CostLineItem, { category: "salary" }>;
const vendor = (project001 as Project).costs[2] as Exclude<CostLineItem, { category: "salary" }>;

describe("describeCostEdit", () => {
  it("names the line, the period and the hours before and after", () => {
    const after = { ...salary, hoursPerPeriod: { ...salary.hoursPerPeriod, "2026-05": 90 } };
    expect(describeCostEdit(salary, after, units)).toEqual({
      text: "Senior Developer — internal team, 2026-05: 80 h → 90 h",
      period: "2026-05",
    });
  });

  it("writes an amount with its currency", () => {
    const after = { ...vendor, valuesPerPeriod: { ...vendor.valuesPerPeriod, "2026-06": 65000 } };
    expect(describeCostEdit(vendor, after, units)?.text).toBe(
      "External CMS integration vendor, 2026-06: 60,000 NOK → 65,000 NOK",
    );
  });

  it("a confidence change has no period; an unchanged value says nothing", () => {
    expect(describeCostEdit(vendor, { ...vendor, confidence: "rough" }, units)).toEqual({
      text: "External CMS integration vendor: confidence estimated → rough",
      period: null,
    });
    expect(describeCostEdit(vendor, { ...vendor }, units)).toBeNull();
  });
});

describe("describeRevenueEdit", () => {
  const model: HourlyPricingModel = {
    type: "hourly",
    ratePerHour: 900,
    hoursPerPeriod: { "2026-10": 400 },
    confidence: "rough",
  };
  it("covers the rate and the billable hours", () => {
    expect(describeRevenueEdit(model, { ...model, ratePerHour: 950 }, units)?.text).toBe(
      "Revenue rate: 900 NOK/h → 950 NOK/h",
    );
    expect(describeRevenueEdit(model, { ...model, hoursPerPeriod: { "2026-10": 380 } }, units)?.text).toBe(
      "Billable hours, 2026-10: 400 h → 380 h",
    );
  });
});

describe("describeEffect — computed from the engine's headline before and after", () => {
  const before = project001 as Project;
  const actuals: ActualEntry[] = demoSnapshot.actuals.filter((a) => a.projectId === "001");
  const withSalaryHours = (period: string, hours: number): Project => ({
    ...before,
    costs: before.costs.map((l) =>
      l.id === salary.id ? { ...salary, hoursPerPeriod: { ...salary.hoursPerPeriod, [period]: hours } } : l,
    ),
  });

  it("an open period moves the expected figure", () => {
    // 10 more hours × 750 × 1.35 = 10,125.
    const after = withSalaryHours("2026-05", 90);
    const text = describeEffect(computeHeadline(before, actuals, bands), computeHeadline(after, actuals, bands), units, null);
    expect(nbsp(text)).toBe("Expected cost now 1.56M NOK (+10k).");
  });

  it("a closed period moves only the budget, and says why", () => {
    const after = withSalaryHours("2026-03", 90);
    const text = describeEffect(computeHeadline(before, actuals, bands), computeHeadline(after, actuals, bands), units, "2026-03");
    expect(nbsp(text)).toBe("Budget now 1.48M NOK (+10k); 2026-03 is closed, so the expected cost keeps its actuals.");
  });

  it("a confidence change reports the new range", () => {
    const after: Project = {
      ...before,
      costs: before.costs.map((l) => (l.id === vendor.id ? { ...vendor, confidence: "rough" } : l)),
    };
    const text = describeEffect(computeHeadline(before, actuals, bands), computeHeadline(after, actuals, bands), units, null);
    expect(nbsp(text)).toMatch(/^Expected cost unchanged; the range is now .+ to .+ NOK\.$/);
  });
});
