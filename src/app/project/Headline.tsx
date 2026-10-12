"use client";

import { Badge } from "@/components/ui/badge";
import type { HeadlineSummary } from "@/engine/headline";
import type { Project, ScenarioValue } from "@/engine/model";
import { formatCompactAmount, formatCurrency, formatPercent, formatRange } from "../_lib/format";
import { headlineCopy } from "./headlineCopy";
import { CATEGORY_LABEL, FLAG_META } from "./shared";

/** The dashboard's lead: status and its reason, a one-sentence verdict, the scenario band as a
 * strip, and where the numbers come from — then the supporting tiles
 * (.impeccable/briefs/project-dashboard-headline.md, option B). All figures come from
 * `computeHeadline`; this component only lays them out. */
export function Headline({
  project,
  headline,
  totals,
}: {
  project: Project;
  headline: HeadlineSummary;
  totals: { cost: ScenarioValue; revenue: ScenarioValue };
}) {
  const { currency, displayUnits } = project;
  const copy = headlineCopy(headline, currency, displayUnits, (c) => CATEGORY_LABEL[c] ?? c);
  const flag = FLAG_META[headline.status];

  return (
    <section aria-labelledby="dashboard-verdict" className="flex flex-col pt-4">
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
        <Badge variant={flag.variant}>{flag.label}</Badge>
        <span>{copy.reason}</span>
      </p>
      <h2 id="dashboard-verdict" className="mt-3 max-w-[26ch] text-display-verdict tabular-nums">
        {copy.verdict.map((segment, i) =>
          segment.negative ? (
            <span key={i} style={{ color: "var(--viz-critical-text)" }}>
              {segment.text}
            </span>
          ) : (
            segment.text
          ),
        )}
      </h2>
      <RangeStrip headline={headline} currency={currency} displayUnits={displayUnits} />
      <p className="mt-3 text-sm text-muted-foreground tabular-nums">{keepPeriodsWhole(copy.source)}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {project.type === "customer" ? (
          <>
            <Tile label="Revenue" value={formatCurrency(totals.revenue.expected, currency, displayUnits)}>
              {rangeNote(totals.revenue, currency, displayUnits)}
            </Tile>
            <Tile label="Cost" value={formatCurrency(totals.cost.expected, currency, displayUnits)}>
              {rangeNote(totals.cost, currency, displayUnits)}
            </Tile>
            <Tile label="Budgeted margin" value={formatCurrency(headline.budget, currency, displayUnits)}>
              {budgetedMarginNote(headline, currency, displayUnits)}
            </Tile>
          </>
        ) : (
          <>
            <Tile
              label="Spent to date"
              value={formatCurrency(headline.costActualToDate, currency, displayUnits)}
            >
              {spentToDateNote(headline, currency, displayUnits)}
            </Tile>
            <Tile label="Budget" value={formatCurrency(headline.budget, currency, displayUnits)}>
              Planned total cost
            </Tile>
            <Tile
              label={headline.deltaVsBudget > 0 ? "Over budget by" : headline.deltaVsBudget < 0 ? "Under budget by" : "Against budget"}
              value={formatCurrency(Math.abs(headline.deltaVsBudget), currency, displayUnits)}
              negative={headline.unfavourable}
            >
              {headline.deltaPct === null
                ? "No budget to compare against"
                : `${headline.deltaPct > 0 ? "+" : headline.deltaPct < 0 ? "\u2212" : ""}${formatPercent(Math.abs(headline.deltaPct))} vs. budget`}
            </Tile>
          </>
        )}
      </div>
    </section>
  );
}

/** Period keys ("2026-05") contain a hyphen browsers will break at; swap in a non-breaking
 * hyphen for display so a narrow line wraps between periods, never inside one. */
function keepPeriodsWhole(text: string) {
  return text.replace(/(\d{4})-(\d{2}|Q[1-4])/g, "$1\u2011$2");
}

function rangeNote(value: ScenarioValue, currency: string, units: Project["displayUnits"]) {
  const range = formatRange(value.worst, value.best, currency, units);
  return range === formatCurrency(value.expected, currency, units) ? "No range: a fixed figure" : `${range} range`;
}

function spentToDateNote(h: HeadlineSummary, currency: string, units: Project["displayUnits"]) {
  if (!h.lastClosedPeriod && h.costActualToDate === 0) return "No actuals recorded yet";
  const diff = h.costActualToDate - h.costBudgetedToDate;
  const amount = formatCurrency(Math.abs(diff), currency, units);
  if (formatCompactAmount(Math.abs(diff), units) === "0") return "On plan for the periods recorded";
  return `${amount} ${diff > 0 ? "over" : "under"} plan for the periods recorded`;
}

function budgetedMarginNote(h: HeadlineSummary, currency: string, units: Project["displayUnits"]) {
  if (formatCompactAmount(Math.abs(h.deltaVsBudget), units) === "0") return "Expected margin matches it";
  const amount = formatCurrency(Math.abs(h.deltaVsBudget), currency, units);
  return `Expected margin is ${amount} ${h.deltaVsBudget < 0 ? "below" : "above"} it`;
}

function Tile({
  label,
  value,
  negative,
  children,
}: {
  label: string;
  value: string;
  negative?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[0.5rem] border border-border px-4 py-3">
      <p className="text-label-caps text-muted-foreground">{label}</p>
      <p
        className="mt-1 text-metric-lg tabular-nums"
        style={negative ? { color: "var(--viz-critical-text)" } : undefined}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">{children}</p>
    </div>
  );
}

/** The scenario band as one horizontal strip: best–worst band, expected dot, dashed budget tick,
 * and a zero tick when the band crosses zero. Decorative for assistive tech beyond its label — the
 * verdict sentence and source line carry every value in words. */
function RangeStrip({
  headline,
  currency,
  displayUnits,
}: {
  headline: HeadlineSummary;
  currency: string;
  displayUnits: Project["displayUnits"];
}) {
  const { value, budget, measure } = headline;
  const low = Math.min(value.best, value.worst);
  const high = Math.max(value.best, value.worst);
  const crossesZero = low < 0 && high > 0;
  const amount = (v: number) => formatCompactAmount(v, displayUnits);
  // A zero-width band (every period closed, or every line committed) has no range to draw, and
  // stretching a tiny expected-vs-budget gap across the full width would exaggerate it.
  if (amount(low) === amount(high)) return null;

  const points = [low, high, budget, value.expected, ...(crossesZero ? [0] : [])];
  let min = Math.min(...points);
  let max = Math.max(...points);
  const pad = (max - min) * 0.06;
  min -= pad;
  max += pad;
  const x = (v: number) => ((v - min) / (max - min)) * 100;

  const budgetIsExpected = amount(budget) === amount(value.expected);
  // Budget label goes below the strip when it would crowd the expected label above it.
  const budgetBelow = !budgetIsExpected && Math.abs(x(budget) - x(value.expected)) < 22;
  const lowLabel = measure === "cost" ? "Best" : "Worst";
  const highLabel = measure === "cost" ? "Worst" : "Best";

  const description = [
    `${lowLabel} ${amount(low)} to ${highLabel.toLowerCase()} ${amount(high)} ${currency}`,
    `expected ${amount(value.expected)}`,
    `budget ${amount(budget)}`,
  ].join(", ");

  return (
    <div
      role="img"
      aria-label={`Range strip: ${description}.`}
      className="relative mt-6 h-[74px] w-full max-w-[760px] text-xs tabular-nums text-muted-foreground"
    >
      <div className="absolute inset-x-0 top-[30px] h-px bg-border" />
      <div
        className="absolute top-6 h-[13px] rounded-[2px] bg-muted"
        style={{ left: `${x(low)}%`, width: `${x(high) - x(low)}%`, boxShadow: "inset 0 0 0 1px var(--border)" }}
      />
      {crossesZero && (
        <>
          <div className="absolute top-[18px] h-[25px] border-l border-[var(--viz-baseline)]" style={{ left: `${x(0)}%` }} />
          <Label at={x(0)} row="bottom">
            0
          </Label>
        </>
      )}
      <div
        className="absolute top-[18px] h-[25px] border-l-[1.5px] border-dashed border-foreground"
        style={{ left: `${x(budget)}%` }}
      />
      {!budgetIsExpected && (
        <Label at={x(budget)} row={budgetBelow ? "bottom" : "top"}>
          Budget <b className="font-semibold text-foreground">{amount(budget)}</b>
        </Label>
      )}
      <div
        className="absolute top-6 size-[13px] -translate-x-1/2 rounded-full border-2 border-background bg-foreground"
        style={{ left: `${x(value.expected)}%`, boxShadow: "0 0 0 1px var(--foreground)" }}
      />
      <Label at={x(value.expected)} row="top">
        {budgetIsExpected ? "Expected = budget" : "Expected"}{" "}
        <b className="font-semibold text-foreground">{amount(value.expected)}</b>
      </Label>
      <Label at={x(low)} row="bottom" align="start">
        {lowLabel} <b className="font-semibold text-foreground">{amount(low)}</b>
      </Label>
      <Label at={x(high)} row="bottom" align="end">
        {highLabel} <b className="font-semibold text-foreground">{amount(high)}</b>
      </Label>
    </div>
  );
}

function Label({
  at,
  row,
  align = "center",
  children,
}: {
  at: number;
  row: "top" | "bottom";
  align?: "start" | "center" | "end";
  children: React.ReactNode;
}) {
  // A centred label near either end of the strip anchors to that end instead, so it never spills
  // past the strip (and the page gutter) on a narrow screen.
  const anchor = align === "center" ? (at < 10 ? "start" : at > 90 ? "end" : "center") : align;
  const shift = anchor === "start" ? "0" : anchor === "end" ? "-100%" : "-50%";
  return (
    <span
      aria-hidden
      className={`absolute whitespace-nowrap leading-4 ${row === "top" ? "top-0" : "top-[46px]"}`}
      style={{ left: `${at}%`, transform: `translateX(${shift})` }}
    >
      {children}
    </span>
  );
}
