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
  status,
}: {
  active?: boolean;
  label?: string | number;
  rows: SeriesRow[];
  currency: string;
  displayUnits: DisplayUnits;
  /** Set when the caller knows which periods are closed (ticket 12). */
  status?: "Actual" | "Projected";
}) {
  if (!active || rows.length === 0) return null;

  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-md"
      style={{ background: "var(--viz-surface)", borderColor: "var(--viz-gridline)" }}
    >
      <p className="mb-1 flex items-center gap-1.5 font-medium" style={{ color: "var(--viz-text-secondary)" }}>
        {label}
        {status && (
          <span
            className="rounded-[0.25rem] border px-1 text-[0.65rem] font-normal"
            style={{ borderColor: "var(--viz-gridline)", color: "var(--viz-text-muted)" }}
          >
            {status}
          </span>
        )}
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

export interface LegendRow {
  key: string;
  label: string;
  color: string;
  /** Visual shape of the swatch: a thin line (default), a dashed line, or a filled area block. */
  swatch?: "line" | "dashed" | "area";
}

export function ChartLegend({ rows }: { rows: LegendRow[] }) {
  return (
    <div className="flex flex-wrap gap-4 px-1 text-xs" style={{ color: "var(--viz-text-secondary)" }}>
      {rows.map((row) => (
        <span key={row.key} className="flex items-center gap-1.5">
          <LegendSwatch color={row.color} shape={row.swatch ?? "line"} />
          {row.label}
        </span>
      ))}
    </div>
  );
}

function LegendSwatch({ color, shape }: { color: string; shape: "line" | "dashed" | "area" }) {
  if (shape === "area") {
    return (
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 rounded-[0.125rem]"
        style={{ background: color, opacity: 0.35 }}
      />
    );
  }
  if (shape === "dashed") {
    return (
      <span
        aria-hidden
        className="inline-block h-0 w-4 border-t-2 border-dashed"
        style={{ borderColor: color }}
      />
    );
  }
  return <span aria-hidden className="inline-block h-0.5 w-4" style={{ background: color }} />;
}

export function ChartDataTable({
  caption,
  periods,
  rows,
  currency,
  displayUnits,
  actualPeriods,
}: {
  caption: string;
  periods: string[];
  rows: { key: string; label: string; valueByPeriod: Record<string, number> }[];
  currency: string;
  displayUnits: DisplayUnits;
  /** Periods to mark "(actual)" in the header — set when the caller has closed periods (ticket 12). */
  actualPeriods?: Set<string>;
}) {
  const hasActuals = (actualPeriods?.size ?? 0) > 0;
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
        View as table
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-xs">
          <caption className="sr-only">
            {caption}
            {hasActuals ? " — periods marked (actual) use recorded actuals, others are projected" : ""}
          </caption>
          <thead>
            <tr className="border-b">
              <th scope="col" className="p-1.5 text-left font-medium">
                Series
              </th>
              {periods.map((p) => (
                <th key={p} scope="col" className="p-1.5 text-right font-medium">
                  {p}
                  {actualPeriods?.has(p) ? (
                    <span className="block font-normal text-muted-foreground">(actual)</span>
                  ) : null}
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
