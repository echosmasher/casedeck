"use client";

// Shared between ScenarioChart and CumulativeChart (ticket 12): the shaded closed-period region,
// the actual/forecast boundary divider, the dashed "Budgeted" line, and the legend/tooltip pieces
// that go with them — kept in one place so the two charts can't drift out of sync.
import { Line, ReferenceArea, ReferenceLine } from "recharts";
import type { ActualsBoundary } from "./actualsBoundary";
import type { LegendRow } from "./ScenarioTooltip";

export function ActualsBoundaryOverlay({ boundary }: { boundary: ActualsBoundary }) {
  return (
    <>
      {boundary.firstClosed && boundary.lastClosed && (
        <ReferenceArea
          x1={boundary.firstClosed}
          x2={boundary.lastClosed}
          fill="var(--viz-text-muted)"
          fillOpacity={0.08}
          ifOverflow="visible"
        />
      )}
      {boundary.firstOpenAfterClose && (
        <ReferenceLine
          x={boundary.firstOpenAfterClose}
          stroke="var(--viz-text-muted)"
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
