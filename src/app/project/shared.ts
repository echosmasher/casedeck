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

/** The Total row's status, in words rather than a pill so it never competes with the headline's
 * (which follows the worst category, not the total). Says what the combined figure has done, not a
 * second verdict: "Watch" here beside an "Over budget" pill read as a contradiction. */
export function blendedFlagLabel(flag: VarianceFlag) {
  return TOTAL_FLAG_LABEL[flag];
}

const TOTAL_FLAG_LABEL: Record<VarianceFlag, string> = {
  ok: "Within range",
  warning: "Over half the contingency used",
  red: "Past the worst-case ceiling",
};
