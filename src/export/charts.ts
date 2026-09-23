// Pure-function SVG chart generator for the business-case export (PLAN.md §6.4 DECISION). Emits
// static <svg> markup directly from the same typed engine output the live dashboard consumes — no
// Recharts, no React runtime, no DOM/browser APIs required to run this file. This is what lets the
// export open from file:// with the network disabled: nothing needs to execute client-side to
// produce the visuals. Colors are literal hex (not CSS custom properties) so the chart renders
// identically regardless of what stylesheet, if any, ends up wrapping it.
import type { DisplayUnits, PeriodKey, ScenarioByPeriod } from "@/engine/model";

const COLOR = {
  worst: "#e34948",
  best: "#2a78d6",
  expected: "#0b0b0b",
  band: "#2a78d6",
  gridline: "#e1e0d9",
  baseline: "#c3c2b7",
  textMuted: "#898781",
};

export function formatChartCurrency(value: number, currency: string, displayUnits: DisplayUnits): string {
  const displayValue = displayUnits === "thousands" ? value / 1000 : value;
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(displayValue);
  return `${formatted}${displayUnits === "thousands" ? "k" : ""} ${currency}`;
}

/** Short axis-tick label ("1.0M NOK", "-250k NOK") so wide numbers don't collide with the legend
 * or plot edges. Exact values stay available in the data table / tooltip via
 * `formatChartCurrency` — this is for tick labels only. In "thousands" display mode the value is
 * already expressed in thousands (per `formatChartCurrency`'s convention), so it's left as-is
 * rather than compacted a second time. */
export function formatCompactChartCurrency(value: number, currency: string, displayUnits: DisplayUnits): string {
  if (displayUnits === "thousands") {
    return formatChartCurrency(value, currency, displayUnits);
  }
  const abs = Math.abs(value);
  const [scaled, suffix] = abs >= 1_000_000 ? [value / 1_000_000, "M"] : abs >= 1_000 ? [value / 1_000, "k"] : [value, ""];
  const decimals = suffix === "M" ? 1 : 0;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(scaled);
  return `${formatted}${suffix} ${currency}`;
}

export interface BandChartOptions {
  width?: number;
  height?: number;
  currency: string;
  displayUnits: DisplayUnits;
}

interface Row {
  period: PeriodKey;
  worst: number;
  expected: number;
  best: number;
}

function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) return [min];
  const span = max - min;
  const rawStep = span / (count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const niceNormalized = normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10;
  const step = niceNormalized * magnitude;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Renders the worst/expected/best band across the project lifetime — the same chart shape as
 * the live dashboard's ScenarioChart, as static SVG. */
export function renderBandChartSvg(
  periods: PeriodKey[],
  byPeriod: ScenarioByPeriod,
  options: BandChartOptions,
): string {
  const rows: Row[] = periods.map((period) => ({ period, ...byPeriod[period] }));
  return renderRows(rows, options);
}

/** Renders a cumulative running total of the same band data — the export's Cumulative P&L chart. */
export function renderCumulativeChartSvg(
  periods: PeriodKey[],
  byPeriod: ScenarioByPeriod,
  options: BandChartOptions,
): string {
  const rows = periods.reduce<Row[]>((acc, period) => {
    const v = byPeriod[period];
    const prev = acc[acc.length - 1];
    acc.push({
      period,
      worst: (prev?.worst ?? 0) + v.worst,
      expected: (prev?.expected ?? 0) + v.expected,
      best: (prev?.best ?? 0) + v.best,
    });
    return acc;
  }, []);
  return renderRows(rows, options);
}

function renderRows(rows: Row[], options: BandChartOptions): string {
  const width = options.width ?? 640;
  const height = options.height ?? 320;
  // The legend gets its own reserved band above the plot so it can never collide with the top
  // gridline/tick label — the two used to share the same top margin.
  const legendHeight = 24;
  const margin = { top: 20, right: 32, bottom: 32, left: 90 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const allValues = rows.flatMap((r) => [r.worst, r.expected, r.best]);
  const rawMin = Math.min(...allValues, 0);
  const rawMax = Math.max(...allValues, 0);
  const pad = (rawMax - rawMin) * 0.1 || 1;
  // Ticks are generated first, then the scale domain is fit to the ticks themselves (not the
  // raw padded range) — niceTicks() rounds outward past [rawMin - pad, rawMax + pad], so fitting
  // the scale to the unrounded range let the outermost tick land outside the plot, overlapping
  // the legend above and the x-axis labels below.
  const ticks = niceTicks(rawMin - pad, rawMax + pad);
  const min = ticks[0];
  const max = ticks[ticks.length - 1];

  const x = (i: number) => margin.left + (rows.length <= 1 ? plotWidth / 2 : (i / (rows.length - 1)) * plotWidth);
  const y = (v: number) => margin.top + plotHeight - ((v - min) / (max - min)) * plotHeight;

  const gridlines = ticks
    .map(
      (t) =>
        `<line x1="${margin.left}" y1="${y(t).toFixed(1)}" x2="${width - margin.right}" y2="${y(t).toFixed(1)}" stroke="${COLOR.gridline}" stroke-width="1" />` +
        `<text x="${margin.left - 8}" y="${y(t).toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="11" fill="${COLOR.textMuted}">${formatCompactChartCurrency(t, options.currency, options.displayUnits)}</text>`,
    )
    .join("");

  const zeroLine =
    min < 0 && max > 0
      ? `<line x1="${margin.left}" y1="${y(0).toFixed(1)}" x2="${width - margin.right}" y2="${y(0).toFixed(1)}" stroke="${COLOR.baseline}" stroke-width="1.5" />`
      : "";

  const xLabels = rows
    .map(
      (r, i) =>
        `<text x="${x(i).toFixed(1)}" y="${height - 8}" text-anchor="middle" font-size="11" fill="${COLOR.textMuted}">${escapeXml(r.period)}</text>`,
    )
    .join("");

  const bandPoints =
    rows.map((r, i) => `${x(i).toFixed(1)},${y(r.worst).toFixed(1)}`).join(" ") +
    " " +
    [...rows]
      .reverse()
      .map((r, i) => `${x(rows.length - 1 - i).toFixed(1)},${y(r.best).toFixed(1)}`)
      .join(" ");

  function linePath(values: number[]): string {
    return values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  }

  const worstLine = linePath(rows.map((r) => r.worst));
  const bestLine = linePath(rows.map((r) => r.best));
  const expectedLine = linePath(rows.map((r) => r.expected));

  const expectedDots = rows
    .map((r, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(r.expected).toFixed(1)}" r="4" fill="${COLOR.expected}" stroke="#fcfcfb" stroke-width="2" />`)
    .join("");

  // Sits in its own [0, legendHeight) band, entirely above the translated plot group below —
  // never sharing vertical space with the plot's top gridline/tick label.
  const legend = `
    <g font-size="11" fill="${COLOR.textMuted}">
      <line x1="0" y1="12" x2="16" y2="12" stroke="${COLOR.worst}" stroke-width="2" /><text x="20" y="16">Worst case</text>
      <line x1="100" y1="12" x2="116" y2="12" stroke="${COLOR.expected}" stroke-width="2" /><text x="120" y="16">Expected</text>
      <line x1="190" y1="12" x2="206" y2="12" stroke="${COLOR.best}" stroke-width="2" /><text x="210" y="16">Best case</text>
    </g>`;

  return `<svg viewBox="0 0 ${width} ${legendHeight + height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Scenario band chart">
  ${legend}
  <g transform="translate(0, ${legendHeight})">
    ${gridlines}
    ${zeroLine}
    <polygon points="${bandPoints}" fill="${COLOR.band}" fill-opacity="0.1" />
    <path d="${worstLine}" fill="none" stroke="${COLOR.worst}" stroke-width="2" />
    <path d="${bestLine}" fill="none" stroke="${COLOR.best}" stroke-width="2" />
    <path d="${expectedLine}" fill="none" stroke="${COLOR.expected}" stroke-width="2" />
    ${expectedDots}
    ${xLabels}
  </g>
</svg>`;
}
