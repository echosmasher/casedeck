// Plain-text amount formatting shared by the dashboard and the business-case export. Lives in
// src/export because export code may not import from src/app (dependency-cruiser); src/app/_lib/format
// re-exports it. Presentation only: no rounding decisions are made by the engine (PLAN.md §6.1).
import type { DisplayUnits } from "@/engine/model";

/** True minus sign (U+2212) instead of the hyphen Intl emits — reads as a negative amount rather
 * than a dash, especially inside ranges ("−1,626,280 to −1,478,920 NOK"). */
function withTrueMinus(text: string): string {
  return text.replace(/^-/, "\u2212");
}

/** An amount without its currency, for a column whose header names it: "124,200". */
export function formatAmount(value: number, displayUnits: DisplayUnits): string {
  const displayValue = displayUnits === "thousands" ? value / 1000 : value;
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(displayValue);
  return withTrueMinus(formatted) + (displayUnits === "thousands" ? "k" : "");
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
