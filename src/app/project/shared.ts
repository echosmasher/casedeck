import { activeConfig } from "../_lib/activeConfig";
import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";
import type { Confidence, DirectCostCategory } from "@/engine/model";
import type { VarianceFlag } from "@/engine/variance";

export const selectClass =
  "h-8 w-full min-w-[7.5rem] rounded-[0.25rem] border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-primary dark:bg-input/30";

export const DIRECT_CATEGORIES: DirectCostCategory[] = [
  "consultancy",
  "it_systems",
  "travel",
  "other_direct",
];
export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  activeConfig.categories.map((c) => [c.id, c.label]),
);
export const CONFIDENCE_OPTIONS: Confidence[] = ["committed", "estimated", "rough"];

/** Variance status labels and pill variants — one map for the headline and "Budget vs. actual". */
export const FLAG_META: Record<
  VarianceFlag,
  { label: string; color: string; ink: string; variant: NonNullable<VariantProps<typeof badgeVariants>["variant"]> }
> = {
  ok: { label: "On track", color: "var(--viz-good)", ink: "var(--viz-good-ink)", variant: "status-good" },
  warning: { label: "Watch", color: "var(--viz-warning)", ink: "var(--viz-warning-ink)", variant: "status-warning" },
  red: { label: "Over budget", color: "var(--viz-critical)", ink: "var(--viz-critical-ink)", variant: "status-critical" },
};

/** Headline pill before any period is closed: neutral, because no actual has been checked yet. */
export const NOT_STARTED_META: { label: string; variant: "outline" } = { label: "Not started", variant: "outline" };

/** The Total row's status: the blended flag in words, without a pill, so it never competes with the
 * headline's status (which follows the worst category, not the blend). */
export function blendedFlagLabel(flag: VarianceFlag) {
  return `Blended: ${FLAG_META[flag].label.toLowerCase()}`;
}
