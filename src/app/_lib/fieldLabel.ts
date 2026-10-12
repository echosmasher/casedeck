// Plain names for the field paths in `ModelValidationError` ("costs[0] (line-1).hoursPerPeriod.2026-05"),
// so the dashboard and Export tab point at what a user sees on the Inputs tab, not at the JSON. The
// paths stay as they are in the engine, where an imported file's errors need them.
import type { Project } from "@/engine/model";

const COST_PATH = /^costs\[(\d+)\](?: \([^)]*\))?\.(ratePerHour|hoursPerPeriod|valuesPerPeriod)(?:\.(.+))?$/;
const REVENUE_HOURS = /^pricingModel\.hoursPerPeriod\.(.+)$/;

const FIXED: Record<string, string> = {
  code: "Project code",
  closedPeriods: "Closed periods",
  loadedCostMultiplier: "Loaded-cost multiplier",
  "pricingModel.amount": "Fixed price",
  "pricingModel.allocation.period": "Fixed price, invoice period",
  "pricingModel.allocation.values": "Fixed price, amounts per period",
  "pricingModel.ratePerHour": "Revenue rate",
};

/** "Senior Developer, 2026-05 hours"; falls back to the raw path for anything it doesn't know. */
export function fieldLabel(field: string, project: Project): string {
  const cost = COST_PATH.exec(field);
  if (cost) {
    const [, index, key, period] = cost;
    const line = project.costs[Number(index)]?.label ?? `Cost line ${Number(index) + 1}`;
    if (key === "ratePerHour") return `${line}, hourly rate`;
    return `${line}, ${period} ${key === "hoursPerPeriod" ? "hours" : "amount"}`;
  }
  const revenueHours = REVENUE_HOURS.exec(field);
  if (revenueHours) return `Billable hours, ${revenueHours[1]}`;
  if (/^closedPeriods\[\d+\]$/.test(field)) return FIXED.closedPeriods;
  return FIXED[field] ?? field;
}
