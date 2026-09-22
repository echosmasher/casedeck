// Pure merge of the bundled org config with Settings-page overrides (UI-QA-PLAN.md Phase C).
// Same "override wins over bundled config for the same key" pattern as categoryMapping.ts — the
// bundled demo/example-group.config.json is never mutated, only shadowed at read time.
import type { GroupConfig, RateCardEntry } from "@/engine/model";
import type { SettingsOverrides } from "@/storage/types";

export function mergeRateCard(base: RateCardEntry[], overrides: RateCardEntry[]): RateCardEntry[] {
  const merged = new Map(base.map((r) => [r.role, r]));
  for (const override of overrides) {
    merged.set(override.role, override);
  }
  return [...merged.values()];
}

export function buildEffectiveConfig(base: GroupConfig, overrides: SettingsOverrides): GroupConfig {
  return {
    ...base,
    rateCard: mergeRateCard(base.rateCard, overrides.rateCardOverrides),
    loadedCostMultiplier: overrides.loadedCostMultiplierOverride ?? base.loadedCostMultiplier,
    confidenceBands: overrides.confidenceBandOverrides ?? base.confidenceBands,
  };
}
