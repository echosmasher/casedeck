// Pure diff for the "Close periods through" control (DASHBOARD-CRITIQUE-PLAN.md Phase 1a).
// Picking a value in the select no longer commits it — the Actuals tab shows this preview first,
// then an explicit Apply saves `nextClosedPeriods`. No engine math here: it only works out which
// periods switch between projected and actuals, and which newly closed ones have nothing recorded
// (the same "closed but no actuals at all" rule `blendedProjection` warns about in
// src/engine/blended.ts, checked ahead of the save instead of after it).
import type { PeriodKey } from "@/engine/model";

export interface ClosingPeriod {
  period: PeriodKey;
  hasCost: boolean;
  hasRevenue: boolean;
}

export interface ClosePeriodPreview {
  /** The `closedPeriods` the project will have after Apply — contiguous from the start. */
  nextClosedPeriods: PeriodKey[];
  /** Periods that switch from projected to actuals, in period order. */
  closing: ClosingPeriod[];
  /** Periods that switch from actuals back to projected, in period order. */
  reopening: PeriodKey[];
  /** Closing periods with no actuals recorded at all — they will count as zero. */
  closingWithoutActuals: PeriodKey[];
  /** True when the pick matches what is already saved, so there is nothing to apply. */
  unchanged: boolean;
}

/**
 * @param periods every period of the project, in order (`projectPeriods(project)`)
 * @param closedPeriods the project's saved `closedPeriods`
 * @param target the period to close through, or `null` for "nothing closed"
 * @param actuals recorded actuals for the project (only `period` and `category` are read)
 */
export function previewClosePeriods(
  periods: PeriodKey[],
  closedPeriods: PeriodKey[],
  target: PeriodKey | null,
  actuals: { period: PeriodKey; category: string }[],
): ClosePeriodPreview {
  const targetIndex = target === null ? -1 : periods.indexOf(target);
  if (target !== null && targetIndex === -1) {
    throw new Error(`Period "${target}" is not one of this project's periods (${periods[0]}–${periods.at(-1)})`);
  }
  const nextClosedPeriods = periods.slice(0, targetIndex + 1);

  const wasClosed = new Set(closedPeriods);
  const willClose = new Set(nextClosedPeriods);

  const closing: ClosingPeriod[] = periods
    .filter((p) => willClose.has(p) && !wasClosed.has(p))
    .map((period) => {
      const forPeriod = actuals.filter((a) => a.period === period);
      return {
        period,
        hasCost: forPeriod.some((a) => a.category !== "revenue"),
        hasRevenue: forPeriod.some((a) => a.category === "revenue"),
      };
    });
  const reopening = periods.filter((p) => wasClosed.has(p) && !willClose.has(p));

  return {
    nextClosedPeriods,
    closing,
    reopening,
    closingWithoutActuals: closing.filter((c) => !c.hasCost && !c.hasRevenue).map((c) => c.period),
    unchanged: closing.length === 0 && reopening.length === 0,
  };
}
