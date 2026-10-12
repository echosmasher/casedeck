"use client";

// Shared between ScenarioChart and CumulativeChart (ticket 12): the shaded closed-period region,
// the actual/forecast boundary divider, the dashed "Budgeted" line, and the legend/tooltip pieces
// that go with them — kept in one place so the two charts can't drift out of sync.
import { Line, ReferenceArea, ReferenceLine } from "recharts";
import type { ActualsBoundary } from "./actualsBoundary";
import type { LegendRow } from "./ScenarioTooltip";

/** Shading for closed periods; the legend swatch uses the same fill plus an outline so it stays
 * visible at this low opacity. */
export const ACTUALS_FILL_OPACITY = 0.08;

/** Right-hand chart margin that leaves room for the end-of-line labels below. */
export const END_LABEL_MARGIN = 64;

/** Direct label at the last point of a scenario line ("Worst", "Expected", "Best"), so the series
 * are told apart by name and position, not by red vs. blue alone (WCAG 1.4.1). Best sits just
 * above its line and worst just below, since on a margin chart best is the upper line. Pass
 * `hidden` when the band has collapsed at the last period (all three lines meet), leaving only
 * "Expected". */
export function endLabel(text: string, color: string, lastIndex: number, placement: "above" | "middle" | "below", hidden = false) {
  const dy = placement === "above" ? -6 : placement === "below" ? 14 : 4;
  function EndLabel(props: { x?: number | string; y?: number | string; index?: number }) {
    if (hidden || props.index !== lastIndex || props.x === undefined || props.y === undefined) return null;
    return (
      <text x={Number(props.x) + 8} y={Number(props.y) + dy} fill={color} fontSize={12} fontWeight={500}>
        {text}
      </text>
    );
  }
  return EndLabel;
}

export function ActualsBoundaryOverlay({ boundary }: { boundary: ActualsBoundary }) {
  return (
    <>
      {boundary.firstClosed && boundary.lastClosed && (
        <ReferenceArea
          x1={boundary.firstClosed}
          x2={boundary.lastClosed}
          fill="var(--viz-text-muted)"
          fillOpacity={ACTUALS_FILL_OPACITY}
          ifOverflow="visible"
        />
      )}
      {boundary.firstOpenAfterClose && (
        <ReferenceLine
          x={boundary.firstOpenAfterClose}
          stroke="var(--viz-text-secondary)"
          strokeDasharray="3 3"
          ifOverflow="visible"
        />
      )}
    </>
  );
}

/** Renders the `budgeted` series as a dashed line — expects the chart data to carry a `budgeted`
 * field, `null` outside the closed range, per `ScenarioChart`/`CumulativeChart`'s `ChartRow`. */
export function BudgetedLine() {
  return (
    <Line
      dataKey="budgeted"
      stroke="var(--viz-text-secondary)"
      strokeWidth={2}
      strokeDasharray="4 4"
      dot={false}
      connectNulls={false}
      isAnimationActive={false}
      legendType="none"
    />
  );
}

export function actualsLegendRows(boundary: ActualsBoundary): LegendRow[] {
  if (boundary.closedSet.size === 0) return [];
  return [
    { key: "actuals", label: "Actuals", color: "var(--viz-text-muted)", swatch: "area" },
    { key: "budgeted", label: "Budgeted", color: "var(--viz-text-secondary)", swatch: "dashed" },
  ];
}

export function tooltipStatus(
  boundary: ActualsBoundary,
  label: string | number | undefined,
): "Actual" | "Projected" | undefined {
  if (label === undefined) return undefined;
  return boundary.closedSet.has(String(label)) ? "Actual" : "Projected";
}
