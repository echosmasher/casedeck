"use client";

import { formatCurrency } from "../_lib/format";
import type { DisplayUnits } from "@/engine/model";

interface SeriesRow {
  key: string;
  label: string;
  color: string;
  value: number;
}

export function ChartTooltip({
  active,
  label,
  rows,
  currency,
  displayUnits,
}: {
  active?: boolean;
  label?: string | number;
  rows: SeriesRow[];
  currency: string;
  displayUnits: DisplayUnits;
}) {
  if (!active || rows.length === 0) return null;

  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-md"
      style={{ background: "var(--viz-surface)", borderColor: "var(--viz-gridline)" }}
    >
      <p className="mb-1 font-medium" style={{ color: "var(--viz-text-secondary)" }}>
        {label}
      </p>
      <dl className="flex flex-col gap-0.5">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-1.5" style={{ color: "var(--viz-text-secondary)" }}>
              <span aria-hidden className="inline-block h-0.5 w-3" style={{ background: row.color }} />
              {row.label}
            </dt>
            <dd className="font-semibold tabular-nums" style={{ color: "var(--viz-text-primary)" }}>
              {formatCurrency(row.value, currency, displayUnits)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ChartLegend({ rows }: { rows: { key: string; label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 px-1 text-xs" style={{ color: "var(--viz-text-secondary)" }}>
      {rows.map((row) => (
        <span key={row.key} className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-0.5 w-4" style={{ background: row.color }} />
          {row.label}
        </span>
      ))}
    </div>
  );
}

export function ChartDataTable({
  caption,
  periods,
  rows,
  currency,
  displayUnits,
}: {
  caption: string;
  periods: string[];
  rows: { key: string; label: string; valueByPeriod: Record<string, number> }[];
  currency: string;
  displayUnits: DisplayUnits;
}) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
        View as table
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b">
              <th scope="col" className="p-1.5 text-left font-medium">
                Series
              </th>
              {periods.map((p) => (
                <th key={p} scope="col" className="p-1.5 text-right font-medium">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b last:border-0">
                <th scope="row" className="p-1.5 text-left font-normal text-muted-foreground">
                  {row.label}
                </th>
                {periods.map((p) => (
                  <td key={p} className="p-1.5 text-right tabular-nums">
                    {formatCurrency(row.valueByPeriod[p] ?? 0, currency, displayUnits)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
