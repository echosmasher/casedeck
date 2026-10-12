// Words for the dashboard headline (.impeccable/briefs/project-dashboard-headline.md). Every number
// comes from `computeHeadline` (src/engine/headline.ts); this module only chooses phrasing and
// formats. Kept free of React so the copy rules are unit-tested on their own.
import type { DisplayUnits } from "@/engine/model";
import type { HeadlineSummary } from "@/engine/headline";
import { formatCompactAmount, formatRange } from "../_lib/format";

/** A run of verdict text; `negative` marks an unfavourable figure (set in the critical ink — the
 * words already say "over", "below" or "loss", so colour only reinforces them). */
export interface VerdictSegment {
  text: string;
  negative?: boolean;
}

export interface HeadlineCopy {
  /** One plain reason beside the status pill. */
  reason: string;
  verdict: VerdictSegment[];
  /** Where the numbers come from: actuals vs. projections, plus the cost range when the verdict
   * sentence doesn't already carry it. */
  source: string;
}

/** Keeps a figure on the same line as its unit ("1.55M NOK", "of 810k") in the display-size
 * sentence, where a break between them reads as two separate claims. */
const NBSP = "\u00a0";

function span(from: string, to: string) {
  return from === to ? from : `${from}–${to}`;
}

/** Margin range as words: signs become "a loss of" / "a gain of" so a reader never has to parse a
 * negative number mid-sentence. */
function marginRangeSegments(low: number, high: number, units: DisplayUnits): VerdictSegment[] {
  const amount = (v: number) => formatCompactAmount(Math.abs(v), units);
  if (low < 0 && high > 0) {
    return [
      { text: ", anywhere from " },
      { text: `a loss of${NBSP}${amount(low)}`, negative: true },
      { text: ` to a gain of${NBSP}${amount(high)}.` },
    ];
  }
  if (high <= 0) {
    return [{ text: ", anywhere from " }, { text: `a loss of ${amount(high)} to ${amount(low)}`, negative: true }, { text: "." }];
  }
  return [{ text: `, anywhere from ${amount(low)} to ${amount(high)}.` }];
}

/** ", 79k over budget." / ", 12k under budget." / ", on budget." — for the measure in hand. */
function budgetSegments(h: HeadlineSummary, units: DisplayUnits): VerdictSegment[] {
  const amount = formatCompactAmount(Math.abs(h.deltaVsBudget), units);
  if (amount === "0") return [{ text: ", on budget." }];
  const direction =
    h.measure === "cost" ? (h.deltaVsBudget > 0 ? "over" : "under") : h.deltaVsBudget < 0 ? "below" : "above";
  return [
    { text: ", " },
    { text: `${amount}${NBSP}${direction} budget`, negative: h.unfavourable },
    { text: "." },
  ];
}

export function headlineCopy(
  h: HeadlineSummary,
  currency: string,
  units: DisplayUnits,
  categoryLabel: (category: string) => string,
): HeadlineCopy {
  const low = Math.min(h.value.best, h.value.worst);
  const high = Math.max(h.value.best, h.value.worst);
  const collapsed = formatCompactAmount(low, units) === formatCompactAmount(high, units);

  let reason: string;
  if (h.status === "red" && h.driver) {
    reason = `${categoryLabel(h.driver)} is past its worst-case ceiling.`;
  } else if (h.status === "warning" && h.driver) {
    reason = `${categoryLabel(h.driver)} has used over half its contingency.`;
  } else if (h.worstCaseBelowZero) {
    reason = "Worst case is a loss.";
  } else if (h.lastClosedPeriod && !h.projectedFrom) {
    reason = "Every category finished within its range.";
  } else if (!h.lastClosedPeriod) {
    reason = "Nothing closed yet.";
  } else {
    reason = "Every category is within its range.";
  }

  let verdict: VerdictSegment[];
  if (h.measure === "cost") {
    verdict = [
      { text: `Expected to cost ${formatCompactAmount(h.value.expected, units)}${NBSP}${currency}` },
      ...budgetSegments(h, units),
    ];
  } else {
    const lead =
      h.value.expected < 0
        ? { text: `Expected loss ${formatCompactAmount(-h.value.expected, units)}${NBSP}${currency}`, negative: true }
        : { text: `Expected margin ${formatCompactAmount(h.value.expected, units)}${NBSP}${currency}` };
    verdict = [lead, ...(collapsed ? budgetSegments(h, units) : marginRangeSegments(low, high, units))];
  }

  let source: string;
  if (h.lastClosedPeriod && h.projectedFrom && h.projectedTo) {
    source = `Actuals through ${h.lastClosedPeriod}, projected ${span(h.projectedFrom, h.projectedTo)}`;
  } else if (h.lastClosedPeriod) {
    source = `Actuals for every period, through ${h.lastClosedPeriod}`;
  } else {
    source = "No actuals yet; every period is projected";
  }
  if (h.measure === "cost" && !collapsed) {
    source += ` · range ${formatRange(low, high, currency, units)}`;
  }

  return { reason, verdict, source };
}
