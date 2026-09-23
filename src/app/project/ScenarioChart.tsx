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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCompactChartCurrency } from "../_lib/format";
import { ChartDataTable, ChartLegend, ChartTooltip } from "./ScenarioTooltip";
import { ActualsBoundaryOverlay, BudgetedLine, actualsLegendRows, tooltipStatus } from "./ChartActualsOverlay";
import type { ActualsOverlay } from "./actualsBoundary";
import type { DisplayUnits, PeriodKey, ScenarioByPeriod } from "@/engine/model";

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
  periods,
  byPeriod,
  actualsOverlay,
  currency,
  displayUnits,
}: {
  periods: PeriodKey[];
  byPeriod: ScenarioByPeriod;
  /** Closed-period boundary plus the budgeted comparison series (ticket 12). */
  actualsOverlay: ActualsOverlay;
  currency: string;
  displayUnits: DisplayUnits;
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scenario bands — margin by period</CardTitle>
        <CardDescription>
          The confidence-weighted range for each period&apos;s margin, given every line
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
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--viz-gridline)" vertical={false} />
            <XAxis
              dataKey="period"
              tick={{ fill: "var(--viz-text-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--viz-baseline)" }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              tickFormatter={(v: number) => formatCompactChartCurrency(v, currency, displayUnits)}
              tick={{ fill: "var(--viz-text-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <ActualsBoundaryOverlay boundary={boundary} />
            <ReferenceLine y={0} stroke="var(--viz-baseline)" strokeWidth={1} />
            <Tooltip
              content={({ active, label, payload }) => (
                <ChartTooltip
                  active={active}
                  label={label}
                  currency={currency}
                  displayUnits={displayUnits}
                  status={tooltipStatus(boundary, label)}
                  rows={
                    payload
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
              isAnimationActive={false}
            />
            <Line
              dataKey="best"
              stroke="var(--viz-blue)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="expected"
              stroke="var(--viz-text-primary)"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--viz-text-primary)", stroke: "var(--viz-surface)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <BudgetedLine />
          </ComposedChart>
        </ResponsiveContainer>
        <ChartDataTable
          caption="Margin by period: worst, expected, and best case"
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
