import type { CategoryMappingEntry } from "@/engine/model";
import type { CategoryMappingOverride } from "@/storage/types";

/** User-resolved overrides win over the bundled org config for the same account code — that's
 * what "persists and auto-applies to the next file" (PLAN.md §6.2) means in practice. */
export function mergeMapping(
  base: CategoryMappingEntry[],
  overrides: CategoryMappingOverride[],
): CategoryMappingEntry[] {
  const merged = new Map(base.map((m) => [m.accountCode, m]));
  for (const override of overrides) {
    merged.set(override.accountCode, { accountCode: override.accountCode, category: override.category });
  }
  return [...merged.values()];
}
