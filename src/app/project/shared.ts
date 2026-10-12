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
  { label: string; color: string; variant: NonNullable<VariantProps<typeof badgeVariants>["variant"]> }
> = {
  ok: { label: "On track", color: "var(--viz-good)", variant: "status-good" },
  warning: { label: "Watch", color: "var(--viz-warning)", variant: "status-warning" },
  red: { label: "Over budget", color: "var(--viz-critical)", variant: "status-critical" },
};
