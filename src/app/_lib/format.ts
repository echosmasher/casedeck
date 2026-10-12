import type { DisplayUnits } from "@/engine/model";

// Re-exported so callers only need to import from one place; the compact axis-tick formatter is
// defined in src/export (its canonical home per dependency-cruiser: export code may not import
// from src/app, but src/app may import from src/export) and shared by both the live dashboard's
// charts and the HTML export's charts, so tick formatting never drifts between the two.
export { formatCompactChartCurrency } from "@/export/charts";

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

/** True minus sign (U+2212) instead of the hyphen Intl emits — reads as a negative amount rather
 * than a dash, especially inside ranges ("−1,626,280 to −1,478,920 NOK"). */
function withTrueMinus(text: string): string {
  return text.replace(/^-/, "\u2212");
}

function formatAmount(value: number, displayUnits: DisplayUnits): string {
  const displayValue = displayUnits === "thousands" ? value / 1000 : value;
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(displayValue);
  return withTrueMinus(formatted) + (displayUnits === "thousands" ? "k" : "");
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

/** Headline-scale amount: "1.55M", "263k", "−810k", without the currency (callers place it once
 * per sentence). "thousands" display units keep the project's own convention ("1,553k"). */
export function formatCompactAmount(value: number, displayUnits: DisplayUnits): string {
  if (displayUnits === "thousands") return formatAmount(value, displayUnits);
  const abs = Math.abs(value);
  const [scaled, suffix, decimals] =
    abs >= 999_500 ? [value / 1_000_000, "M", 2] : abs >= 999.5 ? [value / 1_000, "k", 0] : [value, "", 0];
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(scaled);
  return withTrueMinus(formatted) + suffix;
}

export function formatPercent(fraction: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(fraction);
}
