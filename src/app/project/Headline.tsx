"use client";

import { Badge } from "@/components/ui/badge";
import type { HeadlineSummary } from "@/engine/headline";
import type { ConfidenceBands, PeriodKey, Project, ScenarioValue } from "@/engine/model";
import type { SpreadDrivers } from "@/engine/spread";
import { formatCompactAmount, formatCurrency, formatPercent, formatRange } from "../_lib/format";
import { headlineCopy, spreadCopy } from "./headlineCopy";
import { CATEGORY_LABEL, FLAG_META, NOT_STARTED_META } from "./shared";
import { revealVarianceRow, VARIANCE_SECTION_ID } from "./VarianceSection";

/** The dashboard's lead: status and its reason, a one-sentence verdict, the scenario band as a
 * strip, and where the numbers come from — then the supporting tiles
 * (.impeccable/briefs/project-dashboard-headline.md, option B). All figures come from
 * `computeHeadline`; this component only lays them out. */
export function Headline({
  project,
  headline,
  totals,
  spread,
  bands,
  endedOpenPeriods,
  hasRevenueActuals,
  onOpenActuals,
}: {
  project: Project;
  headline: HeadlineSummary;
  totals: { cost: ScenarioValue; revenue: ScenarioValue };
  spread: SpreadDrivers;
  bands: ConfidenceBands;
  endedOpenPeriods: PeriodKey[];
  /** Whether any revenue actuals were recorded; without them revenue counts as planned. */
  hasRevenueActuals: boolean;
  onOpenActuals: () => void;
}) {
  const { currency, displayUnits } = project;
  const categoryLabel = (c: string) => CATEGORY_LABEL[c] ?? c;
  const copy = headlineCopy(headline, currency, displayUnits, categoryLabel, endedOpenPeriods);
  const driver = spreadCopy(spread, bands, displayUnits, categoryLabel, headline.lastClosedPeriod !== null);
  const finished = headline.stage === "finished";
  // Nothing closed means nothing has been measured yet, so "On track" would be a claim without
  // evidence; the pill says so instead, and the reason carries any risk (003: worst case is a loss).
  const flag = headline.stage === "not_started" ? NOT_STARTED_META : FLAG_META[headline.status];

  return (
    <section aria-labelledby="dashboard-verdict" className="flex flex-col pt-4">
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
        <Badge variant={flag.variant} dot={flag.variant !== "outline"}>
          {flag.label}
        </Badge>
        <span>
          {headline.driver ? (
            // The evidence for the status: jump to the driving category's row in Budget vs. actual.
            <a
              href={`#${VARIANCE_SECTION_ID}`}
              className="underline decoration-[var(--viz-text-muted)] underline-offset-[3px] hover:decoration-current"
              onClick={(e) => {
                if (headline.driver && revealVarianceRow(headline.driver)) e.preventDefault();
              }}
            >
              {copy.reason}
            </a>
          ) : (
            copy.reason
          )}
          {copy.reasonNote && ` ${copy.reasonNote}`}
        </span>
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
      {driver && (
        // What the range is made of: the confidence behind the widest source, linked to its lines.
        <p className="mt-3 text-sm tabular-nums">
          {driver.category ? (
            <a
              href={`#${VARIANCE_SECTION_ID}`}
              className="underline decoration-[var(--viz-text-muted)] underline-offset-[3px] hover:decoration-current"
              onClick={(e) => {
                if (driver.category && revealVarianceRow(driver.category)) e.preventDefault();
              }}
            >
              {driver.label}
            </a>
          ) : (
            driver.label
          )}
          {driver.detail}
        </p>
      )}
      <p className={`${driver ? "mt-1" : "mt-3"} text-sm text-muted-foreground tabular-nums`}>
        {keepPeriodsWhole(copy.source)}
      </p>
      {copy.missing && (
        // Ended periods without actuals are the next thing to do, so the note offers the way there.
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm tabular-nums">
          <span>
            <span
              aria-hidden="true"
              className="mr-1.5 inline-block size-1.5 -translate-y-px rounded-full"
              style={{ backgroundColor: "var(--viz-status-warning)" }}
            />
            {keepPeriodsWhole(copy.missing)}
          </span>
          <button
            type="button"
            className="font-medium underline decoration-[var(--viz-text-muted)] underline-offset-[3px] hover:decoration-current"
            onClick={onOpenActuals}
          >
            Record actuals
          </button>
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {project.type === "customer" && finished ? (
          // A finished project reports its outcome: what came in, what it cost, what it made.
          <>
            <Tile label="Revenue" value={formatCurrency(totals.revenue.expected, currency, displayUnits)}>
              {hasRevenueActuals ? "Recorded revenue" : "As planned; no revenue actuals recorded"}
            </Tile>
            <Tile label="Cost" value={formatCurrency(totals.cost.expected, currency, displayUnits)}>
              Recorded cost, every period closed
            </Tile>
            <Tile
              label={headline.value.expected < 0 ? "Final loss" : "Final margin"}
              value={formatCurrency(Math.abs(headline.value.expected), currency, displayUnits)}
              negative={headline.value.expected < 0 || headline.gapFlagged}
            >
              {finalMarginNote(headline, currency, displayUnits)}
            </Tile>
          </>
        ) : project.type === "customer" ? (
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
          // The verdict already states the gap to budget; the tiles add what it doesn't say: how
          // spending so far compares with its plan, and how much budget is left for the rest.
          <>
            <Tile
              label={finished ? "Final cost" : "Spent to date"}
              value={formatCurrency(headline.costActualToDate, currency, displayUnits)}
            >
              {finished ? "Recorded cost, every period closed" : spentToDateNote(headline, currency, displayUnits)}
            </Tile>
            <Tile label="Budget" value={formatCurrency(headline.budget, currency, displayUnits)}>
              Planned total cost
            </Tile>
            {finished ? (
              <Tile
                label="Against budget"
                value={headline.deltaPct === null ? "No budget" : signedPercent(headline.deltaPct)}
                negative={headline.gapFlagged}
              >
                Final cost compared with the planned total
              </Tile>
            ) : (
              <Tile
                label={headline.costBudgetLeft < 0 ? "Spent past budget" : "Left in budget"}
                value={formatCurrency(Math.abs(headline.costBudgetLeft), currency, displayUnits)}
                negative={headline.costBudgetLeft < headline.costBudgetedRemaining && headline.gapFlagged}
              >
                {budgetLeftNote(headline, currency, displayUnits)}
              </Tile>
            )}
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
  if (!h.lastClosedPeriod) return "No actuals recorded yet";
  return `Against ${formatCurrency(h.costBudgetedToDate, currency, units)} planned to date`;
}

/** Whether what is left covers what the open periods were budgeted at; the shortfall itself is the
 * verdict's gap, so it isn't repeated here. */
function budgetLeftNote(h: HeadlineSummary, currency: string, units: Project["displayUnits"]) {
  if (!h.projectedFrom || !h.projectedTo) return "No periods left to plan";
  const planned = formatCurrency(h.costBudgetedRemaining, currency, units);
  const periods = h.projectedFrom === h.projectedTo ? h.projectedFrom : `${h.projectedFrom}–${h.projectedTo}`;
  const short = h.costBudgetLeft < h.costBudgetedRemaining;
  return keepPeriodsWhole(`${short ? "Short of the" : "Covers the"} ${planned} planned for ${periods}`);
}

function signedPercent(pct: number) {
  const sign = pct > 0 ? "+" : pct < 0 ? "\u2212" : "";
  return `${sign}${formatPercent(Math.abs(pct))}`;
}

function finalMarginNote(h: HeadlineSummary, currency: string, units: Project["displayUnits"]) {
  const budget = formatCurrency(h.budget, currency, units);
  if (formatCompactAmount(Math.abs(h.deltaVsBudget), units) === "0") return `Matches the ${budget} budget`;
  const amount = formatCurrency(Math.abs(h.deltaVsBudget), currency, units);
  return `${amount} ${h.deltaVsBudget < 0 ? "below" : "above"} the ${budget} budget`;
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
