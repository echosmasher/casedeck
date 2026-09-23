// Shared by ScenarioChart and CumulativeChart (ticket 12): where the closed-period range starts
// and ends, and where the actual/forecast boundary divider belongs.
import type { PeriodKey, PeriodValues } from "@/engine/model";

export interface ActualsBoundary {
  closedSet: Set<PeriodKey>;
  firstClosed: PeriodKey | null;
  lastClosed: PeriodKey | null;
  /** First period after the close point. Null when nothing is closed, or when every period is
   * closed — in both cases there's no boundary to draw. */
  firstOpenAfterClose: PeriodKey | null;
}

/** Everything a chart needs to render the closed-period overlay: the boundary plus the budgeted
 * comparison series, bundled together since they're always passed to the same charts as a pair. */
export interface ActualsOverlay {
  boundary: ActualsBoundary;
  budgetedByPeriod: PeriodValues;
}

export function computeActualsBoundary(
  periods: PeriodKey[],
  closedPeriods: PeriodKey[],
): ActualsBoundary {
  const closedSet = new Set(closedPeriods);
  const closedInOrder = periods.filter((p) => closedSet.has(p));
  const firstClosed = closedInOrder[0] ?? null;
  const lastClosed = closedInOrder.at(-1) ?? null;
  const lastClosedIndex = lastClosed ? periods.indexOf(lastClosed) : -1;
  const firstOpenAfterClose =
    lastClosedIndex >= 0 && lastClosedIndex < periods.length - 1 ? periods[lastClosedIndex + 1] : null;

  return { closedSet, firstClosed, lastClosed, firstOpenAfterClose };
}
