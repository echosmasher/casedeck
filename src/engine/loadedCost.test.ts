import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { periodsOf, salaryLineLoadedCost, salaryLineRawCost, salaryLineTotalLoadedCost, sumValues } from "./loadedCost";
import type { SalaryLineItem } from "./model";
import project001 from "../../demo/projects/001-intranet-relaunch.json";

const seniorDev = (project001 as { costs: SalaryLineItem[] }).costs[0];

describe("salaryLineRawCost", () => {
  it("computes hours x rate, no multiplier", () => {
    const raw = salaryLineRawCost(seniorDev);
    expect(raw["2026-01"]).toBe(80 * 750);
    expect(sumValues(raw)).toBe(80 * 750 * 8);
  });
});

describe("salaryLineLoadedCost", () => {
  it("applies the multiplier on top of raw cost", () => {
    const loaded = salaryLineLoadedCost(seniorDev, 1.35);
    expect(loaded["2026-01"]).toBeCloseTo(80 * 750 * 1.35, 6);
  });

  it("never bakes the multiplier into ratePerHour itself", () => {
    salaryLineLoadedCost(seniorDev, 1.35);
    expect(seniorDev.ratePerHour).toBe(750);
  });

  it("total matches the demo README's expected monthly loaded salary contribution", () => {
    const total = salaryLineTotalLoadedCost(seniorDev, 1.35);
    expect(total).toBeCloseTo(80 * 750 * 1.35 * 8, 6);
  });
});

describe("periodsOf", () => {
  it("returns the period keys of a values map", () => {
    expect(periodsOf({ "2026-01": 1, "2026-02": 2 })).toEqual(["2026-01", "2026-02"]);
  });
});

describe("multiplier property", () => {
  it("loaded cost is always raw cost times the multiplier, for any positive multiplier", () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.constantFrom("2026-01", "2026-02", "2026-03"), fc.float({ min: 0, max: Math.fround(500), noNaN: true })),
        fc.float({ min: Math.fround(0.01), max: Math.fround(400), noNaN: true }),
        fc.float({ min: Math.fround(1), max: Math.fround(5), noNaN: true }),
        (hoursPerPeriod, ratePerHour, multiplier) => {
          const line: SalaryLineItem = {
            id: "x",
            category: "salary",
            label: "x",
            role: "x",
            hoursPerPeriod,
            ratePerHour,
            confidence: "estimated",
          };
          const raw = salaryLineRawCost(line);
          const loaded = salaryLineLoadedCost(line, multiplier);
          for (const period of Object.keys(hoursPerPeriod)) {
            expect(loaded[period]).toBeCloseTo(raw[period] * multiplier, 4);
          }
        },
      ),
    );
  });
});
