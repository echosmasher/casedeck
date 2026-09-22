import { activeConfig } from "../_lib/activeConfig";
import type { Confidence, DirectCostCategory } from "@/engine/model";

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
