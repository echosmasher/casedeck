"use client";

import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "../_lib/format";
import { activeConfig } from "../_lib/activeConfig";
import { computeVariance, type VarianceFlag } from "@/engine/variance";
import type { ActualEntry, Project } from "@/engine/model";
import { CATEGORY_LABEL } from "./shared";

const FLAG_META: Record<
  VarianceFlag,
  { label: string; color: string; variant: NonNullable<VariantProps<typeof badgeVariants>["variant"]> }
> = {
  ok: { label: "On track", color: "var(--viz-good)", variant: "status-good" },
  warning: { label: "Watch", color: "var(--viz-warning)", variant: "status-warning" },
  red: { label: "Over budget", color: "var(--viz-critical)", variant: "status-critical" },
};

export function VarianceSection({
  project,
  actuals,
}: {
  project: Project;
  actuals: ActualEntry[];
}) {
  if (actuals.length === 0) return null;

  const variance = computeVariance(project, actuals, activeConfig.confidenceBands);
  const categories = Object.keys(variance.byCategory).sort();
  const { currency, displayUnits } = project;
  const totalMeta = FLAG_META[variance.total.flag];

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actual to date</TableHead>
              <TableHead>Projection to complete</TableHead>
              <TableHead>Expected total</TableHead>
              <TableHead>Worst-case ceiling</TableHead>
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
                  <TableCell className="tabular-nums">
                    {formatCurrency(row.actualToDate, currency, displayUnits)}
                  </TableCell>
                  <TableCell className="tabular-nums" style={{ color: row.flag === "ok" ? undefined : meta.color }}>
                    {formatCurrency(row.projectionToComplete, currency, displayUnits)}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatCurrency(row.expectedTotal, currency, displayUnits)}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatCurrency(row.worstCeiling, currency, displayUnits)}
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow className="border-t-2">
              <TableCell className="font-semibold">Total</TableCell>
              <TableCell>
                <Badge variant={totalMeta.variant} dot>
                  {totalMeta.label}
                </Badge>
              </TableCell>
              <TableCell className="tabular-nums font-semibold">
                {formatCurrency(variance.total.actualToDate, currency, displayUnits)}
              </TableCell>
              <TableCell className="tabular-nums font-semibold">
                {formatCurrency(variance.total.projectionToComplete, currency, displayUnits)}
              </TableCell>
              <TableCell className="tabular-nums font-semibold text-muted-foreground">
                {formatCurrency(variance.total.expectedTotal, currency, displayUnits)}
              </TableCell>
              <TableCell className="tabular-nums font-semibold text-muted-foreground">
                {formatCurrency(variance.total.worstCeiling, currency, displayUnits)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
