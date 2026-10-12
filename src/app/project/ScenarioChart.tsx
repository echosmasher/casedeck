"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardAction, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCompactChartNumber, formatCurrency } from "../_lib/format";
import { ChartDataTable, ChartLegend, ChartTooltip } from "./ScenarioTooltip";
import {
  ActualsBoundaryOverlay,
  BudgetedLine,
  END_LABEL_MARGIN,
  actualsLegendRows,
  costAxisMax,
  chartSummary,
  endLabel,
  tooltipStatus,
} from "./ChartActualsOverlay";
import type { ActualsOverlay } from "./actualsBoundary";
import type { DisplayUnits, PeriodKey, ScenarioByPeriod } from "@/engine/model";
import type { HeadlineMeasure } from "@/engine/headline";

interface ChartRow {
  period: PeriodKey;
  worst: number;
  expected: number;
  best: number;
  bandLow: number;
  bandHeight: number;
  budgeted: number | null;
}

export function ScenarioChart({
  measure,
  periods,
  byPeriod,
  actualsOverlay,
  currency,
  displayUnits,
  action,
}: {
  /** What the headline leads with: margin for a customer project, cost for an internal one (no
   * revenue by design, so a margin chart would only plot its costs as an ever-deeper "loss"). */
  measure: HeadlineMeasure;
  periods: PeriodKey[];
  byPeriod: ScenarioByPeriod;
  /** Closed-period boundary plus the budgeted comparison series (ticket 12). */
  actualsOverlay: ActualsOverlay;
  currency: string;
  displayUnits: DisplayUnits;
  /** Rendered at the top right of the header — the dashboard's per-period/cumulative toggle. */
  action?: React.ReactNode;
}) {
  const { boundary, budgetedByPeriod } = actualsOverlay;
  const data: ChartRow[] = periods.map((period) => {
    const v = byPeriod[period];
    return {
      period,
      worst: v.worst,
      expected: v.expected,
      best: v.best,
      bandLow: v.worst,
      bandHeight: v.best - v.worst,
      budgeted: boundary.closedSet.has(period) ? (budgetedByPeriod[period] ?? 0) : null,
    };
  });

  const lastIndex = data.length - 1;
  const lastRow = data[lastIndex];
  const collapsedAtEnd = !lastRow || lastRow.best === lastRow.worst;
  const isCost = measure === "cost";

  return (
    <Card>
      <CardHeader className="max-sm:grid-cols-1!">
        {/* Below `sm` the toggle drops under the description so it doesn't squeeze the title. */}
        {action && (
          <CardAction className="col-start-1 row-span-1 row-start-3 mt-2 justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:justify-self-end">
            {action}
          </CardAction>
        )}
        <CardTitle>Scenario bands — {measure} by period</CardTitle>
        <CardDescription>
          The confidence-weighted range for each period&apos;s {measure}, given every line
          item&apos;s own confidence marker.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartLegend
          rows={[
            { key: "worst", label: "Worst case", color: "var(--viz-red)" },
            { key: "expected", label: "Expected", color: "var(--viz-text-primary)" },
            { key: "best", label: "Best case", color: "var(--viz-blue)" },
            ...actualsLegendRows(boundary),
          ]}
        />
        <div
          role="figure"
          aria-label={chartSummary(
            `Scenario bands, ${measure} by period`,
            periods,
            lastRow,
            boundary,
            (v) => formatCurrency(v, currency, displayUnits),
          )}
        >
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data} margin={{ top: 16, right: END_LABEL_MARGIN, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--viz-gridline)" vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fill: "var(--viz-text-secondary)", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "var(--viz-baseline)" }}
                // A short project labels every period; a long one keeps the ends and thins the rest.
                interval={periods.length <= 4 ? 0 : "preserveStartEnd"}
                minTickGap={24}
              />
              <YAxis
                domain={isCost ? [0, costAxisMax] : undefined}
                tickCount={5}
                tickFormatter={(v: number) => formatCompactChartNumber(v, displayUnits)}
                tick={{ fill: "var(--viz-text-secondary)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={64}
                label={{
                  value: currency,
                  angle: -90,
                  position: "insideLeft",
                  offset: 4,
                  style: { fill: "var(--viz-text-secondary)", fontSize: 12, textAnchor: "middle" },
                }}
              />
              {/* Shading every period as "actual" would mark nothing. */}
              <ActualsBoundaryOverlay boundary={boundary} />
              {!isCost && <ReferenceLine y={0} stroke="var(--viz-baseline)" strokeWidth={1} />}
              <Tooltip
                content={({ active, label, payload }) => (
                  <ChartTooltip
                    active={active}
                    label={label}
                    currency={currency}
                    displayUnits={displayUnits}
                    status={tooltipStatus(boundary, label)}
                    rows={
                      // A closed period has one value, the actual: show it against its budget
                      // rather than as three identical best/expected/worst rows.
                      payload && tooltipStatus(boundary, label) === "Actual"
                        ? [
                            { key: "expected", label: "Actual", color: "var(--viz-text-primary)", value: Number(payload.find((p) => p.dataKey === "expected")?.value ?? 0) },
                            { key: "budgeted", label: "Budgeted", color: "var(--viz-text-secondary)", value: Number(payload.find((p) => p.dataKey === "budgeted")?.value ?? 0) },
                          ]
                        : payload
                        ? [
                            { key: "best", label: "Best case", color: "var(--viz-blue)", value: Number(payload.find((p) => p.dataKey === "best")?.value ?? 0) },
                            { key: "expected", label: "Expected", color: "var(--viz-text-primary)", value: Number(payload.find((p) => p.dataKey === "expected")?.value ?? 0) },
                            { key: "worst", label: "Worst case", color: "var(--viz-red)", value: Number(payload.find((p) => p.dataKey === "worst")?.value ?? 0) },
                          ]
                        : []
                    }
                  />
                )}
              />
              <Area
                dataKey="bandLow"
                stackId="band"
                stroke="none"
                fill="transparent"
                isAnimationActive={false}
                legendType="none"
              />
              <Area
                dataKey="bandHeight"
                stackId="band"
                stroke="none"
                fill="var(--viz-blue)"
                fillOpacity={0.1}
                isAnimationActive={false}
                legendType="none"
              />
              <Line
                dataKey="worst"
                stroke="var(--viz-red)"
                strokeWidth={2}
                dot={false}
                label={endLabel("Worst", "var(--viz-critical-ink)", lastIndex, isCost ? "above" : "below", collapsedAtEnd)}
                isAnimationActive={false}
              />
              <Line
                dataKey="best"
                stroke="var(--viz-blue)"
                strokeWidth={2}
                dot={false}
                label={endLabel("Best", "var(--viz-blue-ink)", lastIndex, isCost ? "below" : "above", collapsedAtEnd)}
                isAnimationActive={false}
              />
              <Line
                dataKey="expected"
                stroke="var(--viz-text-primary)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--viz-text-primary)", stroke: "var(--viz-surface)", strokeWidth: 2 }}
                label={endLabel("Expected", "var(--viz-text-primary)", lastIndex, "middle")}
                isAnimationActive={false}
              />
              <BudgetedLine />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <ChartDataTable
          caption={`${isCost ? "Cost" : "Margin"} by period: worst, expected, and best case`}
          periods={periods}
          currency={currency}
          displayUnits={displayUnits}
          actualPeriods={boundary.closedSet}
          rows={[
            { key: "worst", label: "Worst case", valueByPeriod: Object.fromEntries(periods.map((p) => [p, byPeriod[p].worst])) },
            { key: "expected", label: "Expected", valueByPeriod: Object.fromEntries(periods.map((p) => [p, byPeriod[p].expected])) },
            { key: "best", label: "Best case", valueByPeriod: Object.fromEntries(periods.map((p) => [p, byPeriod[p].best])) },
            ...(boundary.closedSet.size > 0
              ? [
                  {
                    key: "budgeted",
                    label: "Budgeted",
                    // Equal to "Expected" for open periods by construction: scenario `expected`
                    // is the raw unbanded value, same source as `budgetedByPeriod`. Shown for
                    // every period so the row reads as a genuine, continuous budget line.
                    valueByPeriod: Object.fromEntries(periods.map((p) => [p, budgetedByPeriod[p] ?? 0])),
                  },
                ]
              : []),
          ]}
        />
      </CardContent>
    </Card>
  );
}
