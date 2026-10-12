"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "../_lib/format";
import { useEffectiveConfig } from "../_lib/EffectiveConfigProvider";
import { computeVariance } from "@/engine/variance";
import type { ActualEntry, Project } from "@/engine/model";
import { blendedFlagLabel, CATEGORY_LABEL, FLAG_META } from "./shared";

export function VarianceSection({
  project,
  actuals,
}: {
  project: Project;
  actuals: ActualEntry[];
}) {
  const { config } = useEffectiveConfig();
  if (actuals.length === 0) return null;

  const variance = computeVariance(project, actuals, config.confidenceBands);
  const categories = Object.keys(variance.byCategory).sort();
  const { currency, displayUnits } = project;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget vs. actual</CardTitle>
        <CardDescription>
          Projection-to-complete = actuals so far + budgeted values for the remaining periods, per
          category, checked against that category&apos;s own worst-case ceiling.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Below `md` each category stacks as its own block (six columns fit neither a phone nor a
            desktop at 200% zoom); the table takes over from `md` up. Only one is visible at a
            time, and `hidden` removes the other from the accessibility tree too. */}
        <ul className="flex flex-col md:hidden">
          {[
            ...categories.map((category) => ({
              key: category,
              label: CATEGORY_LABEL[category] ?? category,
              row: variance.byCategory[category],
              total: false,
            })),
            { key: "__total__", label: "Total", row: variance.total, total: true },
          ].map(({ key, label, row, total }) => {
            const meta = FLAG_META[row.flag];
            return (
              <li key={key} className={total ? "border-t-2 pt-3" : "border-b py-3 first:pt-0"}>
                <div className="flex items-center justify-between gap-3">
                  <span className={total ? "font-semibold" : "font-medium"}>{label}</span>
                  {total ? (
                    <span className="text-sm text-muted-foreground">{blendedFlagLabel(row.flag)}</span>
                  ) : (
                    <Badge variant={meta.variant} dot>
                      {meta.label}
                    </Badge>
                  )}
                </div>
                <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm tabular-nums">
                  <dt className="text-muted-foreground">Actual to date</dt>
                  <dd className="text-right">{formatCurrency(row.actualToDate, currency, displayUnits)}</dd>
                  <dt className="text-muted-foreground">Projection to complete</dt>
                  <dd className="text-right" style={{ color: total || row.flag === "ok" ? undefined : meta.ink }}>
                    {formatCurrency(row.projectionToComplete, currency, displayUnits)}
                  </dd>
                  <dt className="text-muted-foreground">Budgeted total</dt>
                  <dd className="text-right text-muted-foreground">
                    {formatCurrency(row.expectedTotal, currency, displayUnits)}
                  </dd>
                  <dt className="text-muted-foreground">Worst-case ceiling</dt>
                  <dd className="text-right text-muted-foreground">
                    {formatCurrency(row.worstCeiling, currency, displayUnits)}
                  </dd>
                </dl>
              </li>
            );
          })}
        </ul>
        <Table containerClassName="hidden md:block">
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actual to date</TableHead>
              <TableHead className="text-right">Projection to complete</TableHead>
              <TableHead className="text-right">Budgeted total</TableHead>
              <TableHead className="text-right">Worst-case ceiling</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => {
              const row = variance.byCategory[category];
              const meta = FLAG_META[row.flag];
              return (
                <TableRow key={category}>
                  <TableCell className="font-medium">{CATEGORY_LABEL[category] ?? category}</TableCell>
                  <TableCell>
                    <Badge variant={meta.variant} dot>
                      {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(row.actualToDate, currency, displayUnits)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums" style={{ color: row.flag === "ok" ? undefined : meta.ink }}>
                    {formatCurrency(row.projectionToComplete, currency, displayUnits)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatCurrency(row.expectedTotal, currency, displayUnits)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatCurrency(row.worstCeiling, currency, displayUnits)}
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow className="border-t-2">
              <TableCell className="font-semibold">Total</TableCell>
              <TableCell className="text-sm text-muted-foreground">{blendedFlagLabel(variance.total.flag)}</TableCell>
              <TableCell className="text-right tabular-nums font-semibold">
                {formatCurrency(variance.total.actualToDate, currency, displayUnits)}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold">
                {formatCurrency(variance.total.projectionToComplete, currency, displayUnits)}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold text-muted-foreground">
                {formatCurrency(variance.total.expectedTotal, currency, displayUnits)}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold text-muted-foreground">
                {formatCurrency(variance.total.worstCeiling, currency, displayUnits)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
