import type { DisplayUnits } from "@/engine/model";

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
 * number). Always showing the range ascending keeps every stat tile reading the same way. */
export function formatRange(
  a: number,
  b: number,
  currency: string,
  displayUnits: DisplayUnits,
): string {
  const [low, high] = a <= b ? [a, b] : [b, a];
  return `${formatCurrency(low, currency, displayUnits)} – ${formatCurrency(high, currency, displayUnits)}`;
}

export function formatPercent(fraction: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(fraction);
}
