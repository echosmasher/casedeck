import { describe, expect, it } from "vitest";
import { buildEffectiveConfig, mergeRateCard } from "./effectiveConfig";
import type { GroupConfig } from "@/engine/model";

describe("mergeRateCard", () => {
  it("overrides win over the bundled rate for the same role", () => {
    const base = [
      { role: "Junior Developer", ratePerHour: 550 },
      { role: "Senior Developer", ratePerHour: 750 },
    ];
    const merged = mergeRateCard(base, [{ role: "Senior Developer", ratePerHour: 900 }]);
    expect(merged).toEqual([
      { role: "Junior Developer", ratePerHour: 550 },
      { role: "Senior Developer", ratePerHour: 900 },
    ]);
  });
});

describe("buildEffectiveConfig", () => {
  const base: GroupConfig = {
    orgName: "Example Group",
    currency: "NOK",
    displayUnitsDefault: "whole",
    loadedCostMultiplier: 1.35,
    confidenceBands: {
      committed: { bandPct: 0 },
      estimated: { bandPct: 10 },
      rough: { bandPct: 30 },
    },
    categories: [],
    statuses: [],
    rateCard: [{ role: "Senior Developer", ratePerHour: 750 }],
    categoryMapping: [],
  };

  it("falls back to the bundled config when no overrides are set", () => {
    expect(buildEffectiveConfig(base, { rateCardOverrides: [] })).toEqual(base);
  });

  it("layers overrides over the bundled config without mutating it", () => {
    const effective = buildEffectiveConfig(base, {
      rateCardOverrides: [{ role: "Senior Developer", ratePerHour: 900 }],
      loadedCostMultiplierOverride: 1.5,
      confidenceBandOverrides: {
        committed: { bandPct: 0 },
        estimated: { bandPct: 20 },
        rough: { bandPct: 40 },
      },
    });

    expect(effective.rateCard).toEqual([{ role: "Senior Developer", ratePerHour: 900 }]);
    expect(effective.loadedCostMultiplier).toBe(1.5);
    expect(effective.confidenceBands.estimated.bandPct).toBe(20);
    expect(base.rateCard).toEqual([{ role: "Senior Developer", ratePerHour: 750 }]);
  });
});
