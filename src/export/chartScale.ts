// Y-axis scale for cost charts, shared by the dashboard and the business-case export (src/app may
// import from src/export, not the reverse). Kept free of React and Recharts so the rule is
// unit-tested on its own.

const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
const TICK_STEPS = 4;

/** A cost axis fitted to the data rather than pinned to zero, so the scenario band fills the plot
 * instead of a sliver above an empty floor (001's per-period band was ~15% of the height). Four
 * equal steps on round values, with headroom on top for the "Actuals | Forecast" labels. The axis
 * still starts at zero when the data comes near it (a cumulative cost begins at its first period),
 * where a raised floor would save little and cost the reader a caveat. `ticks[0] > 0` means the
 * floor is raised and the chart should say so. */
export function costAxisScale(dataMin: number, dataMax: number): { domain: [number, number]; ticks: number[] } {
  if (!(dataMax > 0)) return { domain: [0, 1], ticks: [0, 1] };
  const low = Math.max(0, Math.min(dataMin, dataMax));
  // A flat series still needs a visible span; take a tenth of its level.
  const span = Math.max(dataMax - low, dataMax * 0.1);
  const lo = Math.max(0, low - span * 0.1);
  const hi = dataMax + span * 0.15;

  const rawStep = (hi - lo) / TICK_STEPS;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  for (const multiplier of [...NICE_STEPS, ...NICE_STEPS.map((n) => n * 10)]) {
    const step = multiplier * magnitude;
    if (step < rawStep) continue;
    // Within one step of zero, start at zero: the raised floor would buy almost nothing.
    const floor = Math.floor(lo / step) * step <= step ? 0 : Math.floor(lo / step) * step;
    if (floor + step * TICK_STEPS >= hi) {
      const ticks = Array.from({ length: TICK_STEPS + 1 }, (_, i) => floor + step * i);
      return { domain: [floor, ticks[TICK_STEPS]], ticks };
    }
  }
  // Unreachable: a step of 100 × magnitude always covers the range.
  return { domain: [0, hi], ticks: [0, hi] };
}
