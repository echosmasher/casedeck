"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactChartNumber } from "../_lib/format";
import { ChartDataTable, ChartTooltip } from "./ScenarioTooltip";
import type { DisplayUnits, PeriodKey, PeriodValues, ScenarioByPeriod } from "@/engine/model";
import type { HeadlineMeasure } from "@/engine/headline";

/** A finished project's per-period view: how far each period landed from its budget, as bars
 * from zero. Actual and budgeted lines sat on top of each other here, so the chart said nothing;
 * the gap is the part worth seeing. Every value comes from `computeBlendedTotals`. */
export function GapChart({
  measure,
  periods,
  byPeriod,
  budgetedByPeriod,
  gapByPeriod,
  currency,
  displayUnits,
  action,
}: {
  measure: HeadlineMeasure;
  periods: PeriodKey[];
  byPeriod: ScenarioByPeriod;
  budgetedByPeriod: PeriodValues;
  /** Actual minus budgeted, per period (`costVsBudgetByPeriod` or `marginVsBudgetByPeriod`). */
  gapByPeriod: PeriodValues;
  currency: string;
  displayUnits: DisplayUnits;
  action?: React.ReactNode;
}) {
  const isCost = measure === "cost";
  // Over budget is bad for a cost; below budget is bad for a margin.
  const unfavourable = (gap: number) => (isCost ? gap > 0 : gap < 0);
  const words = (gap: number) =>
    gap === 0 ? "On budget" : isCost ? (gap > 0 ? "Over budget" : "Under budget") : gap > 0 ? "Above budget" : "Below budget";
  const data = periods.map((period) => ({ period, gap: gapByPeriod[period] ?? 0 }));
  const worse = data.filter((d) => unfavourable(d.gap)).length;
  const title = `${isCost ? "Cost" : "Margin"} against budget, by period`;

  return (
    <Card>
      <CardHeader className="max-sm:grid-cols-1!">
        {action && (
          <CardAction className="col-start-1 row-span-1 row-start-3 mt-2 justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:justify-self-end">
            {action}
          </CardAction>
        )}
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          How far each period&apos;s actual {measure} landed from its budget.{" "}
          {isCost ? "Bars above zero went over." : "Bars below zero fell short."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="figure"
          aria-label={`${title}: ${worse} of ${periods.length} periods ${isCost ? "over" : "below"} budget.`}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--viz-gridline)" vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fill: "var(--viz-text-secondary)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                interval={periods.length <= 4 ? 0 : "preserveStartEnd"}
                minTickGap={24}
              />
              <YAxis
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
              <ReferenceLine y={0} stroke="var(--viz-baseline)" strokeWidth={1} />
              <Tooltip
                cursor={{ fill: "var(--viz-gridline)", opacity: 0.4 }}
                content={({ active, label, payload }) => {
                  const gap = Number(payload?.[0]?.value ?? 0);
                  const period = String(label ?? "");
                  return (
                    <ChartTooltip
                      active={active}
                      label={label}
                      currency={currency}
                      displayUnits={displayUnits}
                      rows={
                        payload?.length
                          ? [
                              { key: "actual", label: "Actual", color: "var(--viz-text-primary)", value: byPeriod[period]?.expected ?? 0 },
                              { key: "budgeted", label: "Budgeted", color: "var(--viz-text-secondary)", value: budgetedByPeriod[period] ?? 0 },
                              { key: "gap", label: words(gap), color: unfavourable(gap) ? "var(--viz-critical)" : "var(--viz-text-secondary)", value: Math.abs(gap) },
                            ]
                          : []
                      }
                    />
                  );
                }}
              />
              <Bar dataKey="gap" isAnimationActive={false} maxBarSize={48} radius={[2, 2, 0, 0]}>
                {data.map((d) => (
                  <Cell key={d.period} fill={unfavourable(d.gap) ? "var(--viz-critical)" : "var(--viz-text-muted)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ChartDataTable
          caption={`${title}: actual, budgeted, and the difference`}
          periods={periods}
          currency={currency}
          displayUnits={displayUnits}
          rows={[
            { key: "actual", label: "Actual", valueByPeriod: Object.fromEntries(periods.map((p) => [p, byPeriod[p].expected])) },
            { key: "budgeted", label: "Budgeted", valueByPeriod: Object.fromEntries(periods.map((p) => [p, budgetedByPeriod[p] ?? 0])) },
            { key: "gap", label: "Actual − budget", valueByPeriod: gapByPeriod },
          ]}
        />
      </CardContent>
    </Card>
  );
}
