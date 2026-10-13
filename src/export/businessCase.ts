// The business-case export (PLAN.md §6.4): a single self-contained HTML file for a CFO to open
// from an email — no login, no link rot, works offline and from file://. Pure function: no
// DOM/browser APIs, no React runtime. Inline CSS, inline SVG, zero external requests.
import { validateProjectInvariants, type ModelValidationError } from "@/engine/validate";
import { computeProjectScenarios } from "@/engine/scenarios";
import { computeBlendedTotals } from "@/engine/blended";
import { computeHeadline } from "@/engine/headline";
import { computeVariance } from "@/engine/variance";
import type { ActualEntry, ConfidenceBands, Project } from "@/engine/model";
import { formatChartCurrency, renderBandChartSvg, renderCumulativeChartSvg } from "./charts";
import { statusLabel, VARIANCE_FLAG_LABEL } from "./labels";
import { totalStatusNote } from "./varianceCopy";
import { effectiveStatus } from "@/engine/status";
import { headlineCopy } from "./headlineCopy";

export interface BusinessCaseInput {
  project: Project;
  bands: ConfidenceBands;
  actuals: ActualEntry[];
  executiveSummary?: string;
  riskCommentary?: string;
  generatedAt: Date;
}

export type BusinessCaseResult =
  | { ok: true; html: string }
  | { ok: false; errors: ModelValidationError[] };

const CATEGORY_LABEL: Record<string, string> = {
  salary: "Salary",
  consultancy: "Consultancy",
  it_systems: "IT Systems",
  travel: "Travel",
  other_direct: "Other direct costs",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Refuses (returns the validation error list) rather than emit a file with broken numbers —
 * PLAN.md §6.4 failure behavior, the same rule the live Dashboard enforces. */
export function renderBusinessCase(input: BusinessCaseInput): BusinessCaseResult {
  const errors = validateProjectInvariants(input.project);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const { project, bands, actuals } = input;
  const scenarios = computeProjectScenarios(project, bands);
  const blended = computeBlendedTotals(project, actuals, bands);
  // Internal projects have no revenue by design: like the dashboard, they lead with cost and chart
  // cost against budget, so an expected negative margin is never framed as a loss.
  const headline = computeHeadline(project, actuals, bands);
  const measure = headline.measure;
  const isCost = measure === "cost";
  const chartByPeriod = isCost ? blended.costByPeriod : blended.marginByPeriod;
  const budgetTotal = headline.budget;
  const actualsOverlay = {
    closedPeriods: project.closedPeriods,
    budgetedByPeriod: isCost ? blended.budgetedCostByPeriod : blended.budgetedMarginByPeriod,
  };
  const variance = actuals.length > 0 ? computeVariance(project, actuals, bands) : null;
  const fmt = (v: number) => formatChartCurrency(v, project.currency, project.displayUnits);
  const categoryLabel = (c: string) => CATEGORY_LABEL[c] ?? c;
  // Same wording as the dashboard's verdict. No calendar here, so no "ended open periods" note.
  const verdict = headlineCopy(headline, project.currency, project.displayUnits, categoryLabel);
  const verdictStatus =
    headline.stage === "not_started" ? "No actuals yet" : VARIANCE_FLAG_LABEL[headline.status];
  const verdictClass = headline.stage === "not_started" ? "" : { ok: "good", warning: "warning", red: "critical" }[headline.status];

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(project.name)} — Business Case</title>
<style>${STYLES}</style>
</head>
<body>
<div class="doc">

<header class="header">
  <div>
    <h1>${escapeHtml(project.name)} <span class="code">${escapeHtml(project.code)}</span></h1>
    <p class="meta">
      ${statusLabel(effectiveStatus(project))} · ${escapeHtml(project.id)} ·
      ${escapeHtml(project.periodization)} · ${escapeHtml(project.startPeriod)}–${escapeHtml(project.endPeriod)} ·
      ${escapeHtml(project.currency)} (${project.displayUnits === "thousands" ? "thousands" : "whole units"})
    </p>
  </div>
  <p class="meta">Generated ${input.generatedAt.toISOString().slice(0, 10)}</p>
</header>

${
  blended.warnings.length > 0
    ? `<section class="card">
  <p class="warning-banner"><strong>Data warning:</strong></p>
  <ul class="warning-banner">
    ${blended.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}
  </ul>
</section>`
    : ""
}

<section class="card verdict">
  <p class="status"><span class="pill ${verdictClass}">${escapeHtml(verdictStatus)}</span> ${escapeHtml(verdict.reason)}${verdict.reasonNote ? ` ${escapeHtml(verdict.reasonNote)}` : ""}</p>
  <p class="verdict-line">${verdict.verdict.map((seg) => (seg.negative ? `<span class="critical">${escapeHtml(seg.text)}</span>` : escapeHtml(seg.text))).join("")}</p>
  <p class="note">${escapeHtml(verdict.source)}.</p>
</section>

${
  input.executiveSummary
    ? `<section class="card">
  <h2>Executive summary</h2>
  <p>${escapeHtml(input.executiveSummary).replace(/\n/g, "<br />")}</p>
</section>

`
    : ""
}<section class="card">
  <h2>Scenario summary</h2>
  <p class="lead">${
    isCost
      ? `
    Expected cost <strong>${fmt(blended.totals.cost.expected)}</strong> against a budget of ${fmt(budgetTotal)}
    — range ${fmt(Math.min(blended.totals.cost.worst, blended.totals.cost.best))} to ${fmt(Math.max(blended.totals.cost.worst, blended.totals.cost.best))}.`
      : `
    Expected margin <strong class="${blended.totals.margin.expected >= 0 ? "good" : "critical"}">${fmt(blended.totals.margin.expected)}</strong>
    — range ${fmt(Math.min(blended.totals.margin.worst, blended.totals.margin.best))} to ${fmt(Math.max(blended.totals.margin.worst, blended.totals.margin.best))}.`
  }
  </p>
  ${blended.lastClosedPeriod ? `<p class="note">Actuals through ${escapeHtml(blended.lastClosedPeriod)}, projected after.</p>` : ""}
  <table class="totals">
    <thead><tr><th></th><th>Worst case</th><th>Expected</th><th>Best case</th></tr></thead>
    <tbody>
      <tr><th>Cost</th><td>${fmt(blended.totals.cost.worst)}</td><td>${fmt(blended.totals.cost.expected)}</td><td>${fmt(blended.totals.cost.best)}</td></tr>
      ${
        isCost
          ? ""
          : `<tr><th>Revenue</th><td>${fmt(blended.totals.revenue.worst)}</td><td>${fmt(blended.totals.revenue.expected)}</td><td>${fmt(blended.totals.revenue.best)}</td></tr>
      <tr class="emphasis"><th>Margin</th><td>${fmt(blended.totals.margin.worst)}</td><td>${fmt(blended.totals.margin.expected)}</td><td>${fmt(blended.totals.margin.best)}</td></tr>`
      }
    </tbody>
  </table>

  <h3>Confidence bands</h3>
  <table class="bands">
    <thead><tr><th>Confidence</th><th>Band</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td>Committed</td><td>±${bands.committed.bandPct}%</td><td>Contracted or price agreed</td></tr>
      <tr><td>Estimated</td><td>±${bands.estimated.bandPct}%</td><td>Informed estimate</td></tr>
      <tr><td>Rough</td><td>±${bands.rough.bandPct}%</td><td>Placeholder / early guess</td></tr>
    </tbody>
  </table>
  <p class="note">Worst case = costs at the upper band, revenue at the lower band. Best case is the
  mirror. A <code>committed</code> figure carries no band — its worst and best case equal its
  expected value.</p>
</section>

<section class="card chart-section">
  <h2>Scenario bands — ${measure} by period</h2>
  ${renderBandChartSvg(blended.periods, chartByPeriod, { currency: project.currency, displayUnits: project.displayUnits, actualsOverlay, measure })}
</section>

<section class="card chart-section">
  <h2>${isCost ? "Cumulative cost against budget" : "Cumulative P&amp;L"}</h2>
  ${renderCumulativeChartSvg(blended.periods, chartByPeriod, { currency: project.currency, displayUnits: project.displayUnits, actualsOverlay, measure, budgetTotal })}
</section>

<section class="card">
  <h2>Per-period detail</h2>
  <table class="periods">
    <thead>
      <tr><th>Period</th>${blended.periods.map((p) => `<th>${escapeHtml(p)}${project.closedPeriods.includes(p) ? " (Actual)" : ""}</th>`).join("")}</tr>
    </thead>
    <tbody>
      <tr><th>Cost</th>${blended.periods.map((p) => `<td>${fmt(blended.costByPeriod[p].expected)}</td>`).join("")}</tr>
      ${
        isCost
          ? `<tr class="emphasis"><th>Budgeted cost</th>${blended.periods.map((p) => `<td>${fmt(blended.budgetedCostByPeriod[p] ?? 0)}</td>`).join("")}</tr>`
          : `<tr><th>Revenue</th>${blended.periods.map((p) => `<td>${fmt(blended.revenueByPeriod[p].expected)}</td>`).join("")}</tr>
      <tr class="emphasis"><th>Margin</th>${blended.periods.map((p) => `<td>${fmt(blended.marginByPeriod[p].expected)}</td>`).join("")}</tr>`
      }
    </tbody>
  </table>
  <p class="note">Expected values shown above; see the scenario band chart for the worst/best range
  per period. Closed periods show actual results, not a forecast.</p>
</section>

<section class="card">
  <h2>Cost by category</h2>
  <table class="totals">
    <thead><tr><th>Category</th><th>Worst case</th><th>Expected</th><th>Best case</th></tr></thead>
    <tbody>
      ${Object.entries(scenarios.costByCategory)
        .map(
          ([category, v]) =>
            `<tr><th>${CATEGORY_LABEL[category] ?? escapeHtml(category)}</th><td>${fmt(v.worst)}</td><td>${fmt(v.expected)}</td><td>${fmt(v.best)}</td></tr>`,
        )
        .join("")}
    </tbody>
  </table>
  ${
    blended.lastClosedPeriod
      ? `<p class="note">Budgeted figures — the engine has no actual breakdown by category.${
          variance ? ` See "Budget vs. actual" below for actual-to-date by category.` : ""
        } See the Scenario summary above for the blended cost total.</p>`
      : ""
  }
</section>

${variance ? renderVarianceSection(variance, fmt, input.riskCommentary, blended.periods.every((p) => project.closedPeriods.includes(p))) : ""}

<section class="card">
  <h2>Assumptions &amp; dependencies</h2>
  ${
    project.dependencies.length > 0
      ? `<ul>${project.dependencies.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`
      : "<p><em>No dependencies recorded.</em></p>"
  }
</section>

<footer class="footer">
  <p>Generated by CaseDeck on ${input.generatedAt.toISOString()}. Figures computed deterministically
  from the project's raw budget and confidence markers — see the Confidence bands table above for
  exactly how the worst/best range is derived.</p>
</footer>

</div>
</body>
</html>`;

  return { ok: true, html };
}

function renderVarianceSection(
  variance: ReturnType<typeof computeVariance>,
  fmt: (v: number) => string,
  riskCommentary: string | undefined,
  complete: boolean,
): string {
  const note = totalStatusNote(variance, fmt, complete);
  const flagClass: Record<string, string> = { ok: "good", warning: "warning", red: "critical" };

  return `<section class="card">
  <h2>Budget vs. actual</h2>
  ${riskCommentary ? `<p>${escapeHtml(riskCommentary).replace(/\n/g, "<br />")}</p>` : ""}
  <table class="totals">
    <thead><tr><th>Category</th><th>Status</th><th>Actual to date</th><th>Projection to complete</th><th>Budgeted total</th><th>Worst-case ceiling</th></tr></thead>
    <tbody>
      ${Object.entries(variance.byCategory)
        .map(
          ([category, row]) =>
            `<tr><th>${CATEGORY_LABEL[category] ?? escapeHtml(category)}</th><td class="${flagClass[row.flag]}">${VARIANCE_FLAG_LABEL[row.flag]}</td><td>${fmt(row.actualToDate)}</td><td>${fmt(row.projectionToComplete)}</td><td>${fmt(row.expectedTotal)}</td><td>${fmt(row.worstCeiling)}</td></tr>`,
        )
        .join("")}
      <tr class="emphasis"><th>Total</th><td>${VARIANCE_FLAG_LABEL[variance.total.flag]}</td><td>${fmt(variance.total.actualToDate)}</td><td>${fmt(variance.total.projectionToComplete)}</td><td>${fmt(variance.total.expectedTotal)}</td><td>${fmt(variance.total.worstCeiling)}</td></tr>
    </tbody>
  </table>
  ${note ? `<p class="note">${escapeHtml(note)}</p>` : ""}
</section>`;
}

const STYLES = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #0b0b0b;
    background: #f9f9f7;
    margin: 0;
    padding: 2rem 1rem;
  }
  .doc { max-width: 860px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }
  .header { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; flex-wrap: wrap; border-bottom: 1px solid #e1e0d9; padding-bottom: 1rem; }
  .header h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
  .header h1 .code { font-family: ui-monospace, monospace; font-size: 0.85rem; font-weight: 400; color: #75746f; }
  .meta { color: #52514e; font-size: 0.85rem; margin: 0; }
  .card { background: #fcfcfb; border: 1px solid #e1e0d9; border-radius: 12px; padding: 1.25rem 1.5rem; page-break-inside: avoid; }
  .card h2 { margin-top: 0; font-size: 1.1rem; }
  .card h3 { font-size: 0.95rem; margin-bottom: 0.5rem; }
  .lead { font-size: 1.05rem; }
  .verdict .status { margin: 0 0 0.5rem; font-size: 0.9rem; }
  .verdict .pill { display: inline-block; border: 1px solid currentColor; border-radius: 999px; padding: 0.05rem 0.6rem; margin-right: 0.4rem; font-size: 0.8rem; font-weight: 600; }
  .verdict .verdict-line { margin: 0 0 0.5rem; font-size: 1.5rem; line-height: 1.25; font-weight: 600; }
  table { border-collapse: collapse; width: 100%; font-size: 0.85rem; }
  table.periods { display: block; overflow-x: auto; white-space: nowrap; }
  th, td { text-align: right; padding: 0.4rem 0.6rem; border-bottom: 1px solid #e1e0d9; }
  th:first-child, td:first-child { text-align: left; }
  thead th { color: #898781; font-weight: 500; }
  tr.emphasis th, tr.emphasis td { font-weight: 600; border-top: 2px solid #c3c2b7; }
  .good { color: #006300; }
  .critical { color: #d03b3b; }
  .warning { color: #a35b00; }
  .warning-banner { color: #a35b00; margin: 0; padding-left: 1.2rem; }
  p.warning-banner { padding-left: 0; }
  .note { color: #898781; font-size: 0.8rem; }
  .chart-section svg { width: 100%; height: auto; }
  .footer { color: #898781; font-size: 0.75rem; text-align: center; padding: 1rem 0; }
  ul { padding-left: 1.2rem; }
  @media print {
    body { background: #fff; padding: 0; }
    .card { border: none; box-shadow: none; page-break-after: auto; }
    .doc { max-width: none; }
  }
`;
