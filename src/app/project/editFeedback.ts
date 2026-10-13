// Words for the Inputs tab's "Saved" line: what changed, and what it did to the headline figure
// (PRODUCT.md principle 4, "nothing changes silently"). Every number comes from the edit itself or
// from `computeHeadline`; this module only chooses phrasing. Kept free of React so it is
// unit-tested on its own, like headlineCopy.ts.
import type { HeadlineSummary } from "@/engine/headline";
import type { CostLineItem, DisplayUnits, HourlyPricingModel, PeriodKey } from "@/engine/model";
import { formatCompactAmount, formatCurrency } from "../_lib/format";

interface Units {
  currency: string;
  displayUnits: DisplayUnits;
}

/** What an edit changed, and the period it changed (null for a whole-line change like confidence). */
export interface EditChange {
  text: string;
  period: PeriodKey | null;
}

/** The one period whose value differs between two per-period maps, or null. */
function changedPeriod(before: Record<PeriodKey, number>, after: Record<PeriodKey, number>): PeriodKey | null {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if ((before[key] ?? 0) !== (after[key] ?? 0)) return key;
  }
  return null;
}

function hours(value: number) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)} h`;
}

/** "Senior Developer — internal team, 2026-05: 80 h → 90 h", or null when nothing changed. */
export function describeCostEdit(before: CostLineItem, after: CostLineItem, units: Units): EditChange | null {
  if (before.confidence !== after.confidence) {
    return { text: `${after.label}: confidence ${before.confidence} → ${after.confidence}`, period: null };
  }
  if (before.category === "salary" && after.category === "salary") {
    const period = changedPeriod(before.hoursPerPeriod, after.hoursPerPeriod);
    if (!period) return null;
    const from = hours(before.hoursPerPeriod[period] ?? 0);
    const to = hours(after.hoursPerPeriod[period] ?? 0);
    return { text: `${after.label}, ${period}: ${from} → ${to}`, period };
  }
  if (before.category !== "salary" && after.category !== "salary") {
    const period = changedPeriod(before.valuesPerPeriod, after.valuesPerPeriod);
    if (!period) return null;
    const money = (v: number) => formatCurrency(v, units.currency, units.displayUnits);
    const from = money(before.valuesPerPeriod[period] ?? 0);
    const to = money(after.valuesPerPeriod[period] ?? 0);
    return { text: `${after.label}, ${period}: ${from} → ${to}`, period };
  }
  return null;
}

/** The same for the hourly revenue model's rate, confidence, or billable hours. */
export function describeRevenueEdit(
  before: HourlyPricingModel,
  after: HourlyPricingModel,
  units: Units,
): EditChange | null {
  if (before.ratePerHour !== after.ratePerHour) {
    const money = (v: number) => formatCurrency(v, units.currency, units.displayUnits);
    return { text: `Revenue rate: ${money(before.ratePerHour)}/h → ${money(after.ratePerHour)}/h`, period: null };
  }
  if (before.confidence !== after.confidence) {
    return { text: `Revenue: confidence ${before.confidence} → ${after.confidence}`, period: null };
  }
  const period = changedPeriod(before.hoursPerPeriod, after.hoursPerPeriod);
  if (!period) return null;
  const from = hours(before.hoursPerPeriod[period] ?? 0);
  const to = hours(after.hoursPerPeriod[period] ?? 0);
  return { text: `Billable hours, ${period}: ${from} → ${to}`, period };
}

function signed(value: number, displayUnits: DisplayUnits) {
  const amount = formatCompactAmount(Math.abs(value), displayUnits);
  return `${value > 0 ? "+" : "−"}${amount}`;
}

/** What the edit did to the dashboard's headline: "Expected cost now 1.56M NOK (+10k)." A change
 * in a closed period moves only the budget, because the expected figure uses that period's
 * actuals; saying so is the point, since otherwise the edit looks like it did nothing. */
export function describeEffect(
  before: HeadlineSummary,
  after: HeadlineSummary,
  units: Units,
  closedPeriod: PeriodKey | null,
): string {
  const measure = after.measure === "cost" ? "cost" : "margin";
  const expectedDelta = after.value.expected - before.value.expected;
  const budgetDelta = after.budget - before.budget;
  const moved = (delta: number) => formatCompactAmount(Math.abs(delta), units.displayUnits) !== "0";
  const now = (value: number) => `${formatCompactAmount(value, units.displayUnits)} ${units.currency}`;

  if (moved(expectedDelta)) {
    return `Expected ${measure} now ${now(after.value.expected)} (${signed(expectedDelta, units.displayUnits)}).`;
  }
  if (moved(budgetDelta)) {
    const why = closedPeriod
      ? `${closedPeriod} is closed, so the expected ${measure} keeps its actuals`
      : `the expected ${measure} is unchanged`;
    return `Budget now ${now(after.budget)} (${signed(budgetDelta, units.displayUnits)}); ${why}.`;
  }
  // A confidence change leaves the expected figure alone and moves only the range around it.
  const low = Math.min(after.value.best, after.value.worst);
  const high = Math.max(after.value.best, after.value.worst);
  const range = `${formatCompactAmount(low, units.displayUnits)} to ${now(high)}`;
  return `Expected ${measure} unchanged; the range is now ${range}.`;
}
