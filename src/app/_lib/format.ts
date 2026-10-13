import type { DisplayUnits } from "@/engine/model";
import { formatAmount } from "@/export/amounts";

// Re-exported so callers only need to import from one place; the compact axis-tick formatter is
// defined in src/export (its canonical home per dependency-cruiser: export code may not import
// from src/app, but src/app may import from src/export) and shared by both the live dashboard's
// charts and the HTML export's charts, so tick formatting never drifts between the two.
export { formatCompactChartCurrency, formatCompactChartNumber } from "@/export/charts";
export { formatAmount, formatCompactAmount } from "@/export/amounts";

/** Formats a raw currency amount per the project's display units. No rounding decisions are made
 * by the engine (PLAN.md §6.1) — this is presentation-only, applied in the UI. */
export function formatCurrency(value: number, currency: string, displayUnits: DisplayUnits): string {
  const displayValue = displayUnits === "thousands" ? value / 1000 : value;
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(displayValue);
  const suffix = displayUnits === "thousands" ? "k" : "";
  return `${formatted}${suffix} ${currency}`;
}



/** Formats a best/worst range low-to-high regardless of which one is numerically larger —
 * for a cost, "worst" is the higher number (+band), so a naive "worst - best" label would read
 * high-to-low and look backwards next to a revenue or margin range (where worst is the lower
 * number). Always showing the range ascending keeps every stat tile reading the same way.
 * A zero-width band (every period closed, or every line committed) collapses to one value, and
 * the currency is written once: "−1,626,280 to −1,478,920 NOK". */
export function formatRange(
  a: number,
  b: number,
  currency: string,
  displayUnits: DisplayUnits,
): string {
  const [low, high] = a <= b ? [a, b] : [b, a];
  if (formatAmount(low, displayUnits) === formatAmount(high, displayUnits)) {
    return `${formatAmount(low, displayUnits)} ${currency}`;
  }
  return `${formatAmount(low, displayUnits)} to ${formatAmount(high, displayUnits)} ${currency}`;
}


export function formatPercent(fraction: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(fraction);
}
