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
import type { DisplayUnits, PeriodKey, ScenarioByPeriod } from "@/engine/model";

interface ChartRow {
  period: PeriodKey;
  worst: number;
  expected: number;
  best: number;
  bandLow: number;
  bandHeight: number;
}

export function ScenarioChart({
  periods,
  byPeriod,
  currency,
  displayUnits,
}: {
  periods: PeriodKey[];
  byPeriod: ScenarioByPeriod;
  currency: string;
  displayUnits: DisplayUnits;
}) {
  const data: ChartRow[] = periods.map((period) => {
    const v = byPeriod[period];
    return {
      period,
      worst: v.worst,
      expected: v.expected,
      best: v.best,
      bandLow: v.worst,
      bandHeight: v.best - v.worst,
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
            <ReferenceLine y={0} stroke="var(--viz-baseline)" strokeWidth={1} />
            <Tooltip
              content={({ active, label, payload }) => (
                <ChartTooltip
                  active={active}
                  label={label}
                  currency={currency}
                  displayUnits={displayUnits}
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
          </ComposedChart>
        </ResponsiveContainer>
        <ChartDataTable
          caption="Margin by period: worst, expected, and best case"
          periods={periods}
          currency={currency}
          displayUnits={displayUnits}
          rows={[
            { key: "worst", label: "Worst case", valueByPeriod: Object.fromEntries(periods.map((p) => [p, byPeriod[p].worst])) },
            { key: "expected", label: "Expected", valueByPeriod: Object.fromEntries(periods.map((p) => [p, byPeriod[p].expected])) },
            { key: "best", label: "Best case", valueByPeriod: Object.fromEntries(periods.map((p) => [p, byPeriod[p].best])) },
          ]}
        />
      </CardContent>
    </Card>
  );
}
