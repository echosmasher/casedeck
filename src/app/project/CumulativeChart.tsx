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
import { formatCompactAmount, formatCompactChartNumber, formatCurrency } from "../_lib/format";
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

export function CumulativeChart({
  measure,
  budgetTotal,
  periods,
  byPeriod,
  actualsOverlay,
  currency,
  displayUnits,
  action,
  settled = false,
}: {
  /** Margin for a customer project; cost for an internal one, drawn against its total budget. */
  measure: HeadlineMeasure;
  /** Total budgeted cost (`computeHeadline`'s budget), drawn as a ceiling on the cost chart. */
  budgetTotal: number;
  periods: PeriodKey[];
  byPeriod: ScenarioByPeriod;
  /** Closed-period boundary plus the budgeted comparison series (ticket 12). */
  actualsOverlay: ActualsOverlay;
  currency: string;
  displayUnits: DisplayUnits;
  /** Rendered at the top right of the header — the dashboard's per-period/cumulative toggle. */
  action?: React.ReactNode;
  /** Every period closed with no range left: plot the actual against the budget, with no
   * scenario lines that would all sit on top of it. */
  settled?: boolean;
}) {
  const { boundary, budgetedByPeriod } = actualsOverlay;
  const data = periods.reduce<
    {
      period: PeriodKey;
      worst: number;
      expected: number;
      best: number;
      bandLow: number;
      bandHeight: number;
      budgeted: number | null;
      budgetedToDate: number;
    }[]
  >((rows, period) => {
    const v = byPeriod[period];
    const prev = rows[rows.length - 1];
    const worst = (prev?.worst ?? 0) + v.worst;
    const expected = (prev?.expected ?? 0) + v.expected;
    const best = (prev?.best ?? 0) + v.best;
    // Running budget over every period. The dashed line is drawn only across the closed range,
    // where actuals can differ from plan; the data table shows it in full.
    const budgetedToDate = (prev?.budgetedToDate ?? 0) + (budgetedByPeriod[period] ?? 0);
    return [
      ...rows,
      {
        period,
        worst,
        expected,
        best,
        bandLow: worst,
        bandHeight: best - worst,
        budgeted: boundary.closedSet.has(period) ? budgetedToDate : null,
        budgetedToDate,
      },
    ];
  }, []);
  const cumulative: Record<PeriodKey, { worst: number; expected: number; best: number; budgetedToDate: number }> =
    Object.fromEntries(data.map((row) => [row.period, row]));

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
        {isCost ? (
          <>
            <CardTitle>Cumulative cost against budget</CardTitle>
            <CardDescription>
              Running total of cost across the project lifetime, against the total budget.
            </CardDescription>
          </>
        ) : (
          <>
            <CardTitle>Cumulative P&amp;L</CardTitle>
            <CardDescription>
              Running total across the project lifetime — a per-period loss doesn&apos;t mean the
              project is failing if revenue lands later.
            </CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent>
        <ChartLegend
          rows={[
            ...(settled
              ? [
                  { key: "expected", label: "Actual", color: "var(--viz-text-primary)" },
                  { key: "budgeted", label: "Budgeted", color: "var(--viz-text-secondary)", swatch: "dashed" as const },
                ]
              : [
                  { key: "worst", label: "Worst case", color: "var(--viz-red)" },
                  { key: "expected", label: "Expected", color: "var(--viz-text-primary)" },
                  { key: "best", label: "Best case", color: "var(--viz-blue)" },
                  ...actualsLegendRows(boundary),
                ]),
            ...(isCost ? [{ key: "budget", label: "Total budget", color: "var(--viz-text-primary)", swatch: "dashed" as const }] : []),
          ]}
        />
        <div
          role="figure"
          aria-label={chartSummary(
            isCost
              ? `Cumulative cost against a total budget of ${formatCurrency(budgetTotal, currency, displayUnits)}, by period`
              : "Cumulative margin, by period",
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
                interval="preserveStartEnd"
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
              {!settled && <ActualsBoundaryOverlay boundary={boundary} />}
              {isCost ? (
                <ReferenceLine
                  y={budgetTotal}
                  stroke="var(--viz-text-primary)"
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  ifOverflow="extendDomain"
                  label={{
                    value: `Budget ${formatCompactAmount(budgetTotal, displayUnits)}`,
                    position: "insideTopLeft",
                    fill: "var(--viz-text-primary)",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                />
              ) : (
                <ReferenceLine y={0} stroke="var(--viz-baseline)" strokeWidth={1} />
              )}
              <Tooltip
                content={({ active, label, payload }) => (
                  <ChartTooltip
                    active={active}
                    label={label}
                    currency={currency}
                    displayUnits={displayUnits}
                    status={settled ? undefined : tooltipStatus(boundary, label)}
                    rows={
                      payload && settled
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
              {!settled && (
                <Area
                  dataKey="bandLow"
                  stackId="band"
                  stroke="none"
                  fill="transparent"
                  isAnimationActive={false}
                  legendType="none"
                />
              )}
              {!settled && (
                <Area
                  dataKey="bandHeight"
                  stackId="band"
                  stroke="none"
                  fill="var(--viz-blue)"
                  fillOpacity={0.1}
                  isAnimationActive={false}
                  legendType="none"
                />
              )}
              {!settled && (
                <Line
                  dataKey="worst"
                  stroke="var(--viz-red)"
                  strokeWidth={2}
                  dot={false}
                  label={endLabel("Worst", "var(--viz-critical-ink)", lastIndex, isCost ? "above" : "below", collapsedAtEnd)}
                  isAnimationActive={false}
                />
              )}
              {!settled && (
                <Line
                  dataKey="best"
                  stroke="var(--viz-blue)"
                  strokeWidth={2}
                  dot={false}
                  label={endLabel("Best", "var(--viz-blue-ink)", lastIndex, isCost ? "below" : "above", collapsedAtEnd)}
                  isAnimationActive={false}
                />
              )}
              <Line
                dataKey="expected"
                stroke="var(--viz-text-primary)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--viz-text-primary)", stroke: "var(--viz-surface)", strokeWidth: 2 }}
                label={endLabel(settled ? "Actual" : "Expected", "var(--viz-text-primary)", lastIndex, "middle")}
                isAnimationActive={false}
              />
              <BudgetedLine />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <ChartDataTable
          caption={`Cumulative ${measure} by period: ${settled ? "actual and budgeted" : "worst, expected, and best case"}`}
          periods={periods}
          currency={currency}
          displayUnits={displayUnits}
          actualPeriods={boundary.closedSet}
          rows={[
            ...(settled
              ? [{ key: "expected", label: "Actual", valueByPeriod: Object.fromEntries(periods.map((p) => [p, cumulative[p].expected])) }]
              : [
                  { key: "worst", label: "Worst case", valueByPeriod: Object.fromEntries(periods.map((p) => [p, cumulative[p].worst])) },
                  { key: "expected", label: "Expected", valueByPeriod: Object.fromEntries(periods.map((p) => [p, cumulative[p].expected])) },
                  { key: "best", label: "Best case", valueByPeriod: Object.fromEntries(periods.map((p) => [p, cumulative[p].best])) },
                ]),
            ...(boundary.closedSet.size > 0 || isCost
              ? [
                  {
                    key: "budgeted",
                    label: "Budgeted",
                    valueByPeriod: Object.fromEntries(periods.map((p) => [p, cumulative[p].budgetedToDate])),
                  },
                ]
              : []),
          ]}
        />
      </CardContent>
    </Card>
  );
}
