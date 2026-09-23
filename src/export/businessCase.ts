// The business-case export (PLAN.md §6.4): a single self-contained HTML file for a CFO to open
// from an email — no login, no link rot, works offline and from file://. Pure function: no
// DOM/browser APIs, no React runtime. Inline CSS, inline SVG, zero external requests.
import { validateProjectInvariants, type ModelValidationError } from "@/engine/validate";
import { computeProjectScenarios } from "@/engine/scenarios";
import { computeVariance } from "@/engine/variance";
import type { ActualEntry, ConfidenceBands, Project } from "@/engine/model";
import { formatChartCurrency, renderBandChartSvg, renderCumulativeChartSvg } from "./charts";

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
  other_direct: "Other Direct Costs",
};

const STATUS_LABEL: Record<string, string> = {
  planning: "Planning",
  ready_for_approval: "Ready for Approval",
  approved: "Approved",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
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
  const variance = actuals.length > 0 ? computeVariance(project, actuals, bands) : null;
  const fmt = (v: number) => formatChartCurrency(v, project.currency, project.displayUnits);

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
      ${STATUS_LABEL[project.status] ?? project.status} · ${escapeHtml(project.id)} ·
      ${escapeHtml(project.periodization)} · ${escapeHtml(project.startPeriod)}–${escapeHtml(project.endPeriod)} ·
      ${escapeHtml(project.currency)} (${project.displayUnits === "thousands" ? "thousands" : "whole units"})
    </p>
  </div>
  <p class="meta">Generated ${input.generatedAt.toISOString().slice(0, 10)}</p>
</header>

<section class="card">
  <h2>Executive summary</h2>
  <p>${input.executiveSummary ? escapeHtml(input.executiveSummary).replace(/\n/g, "<br />") : "<em>No executive summary provided.</em>"}</p>
</section>

<section class="card">
  <h2>Scenario summary</h2>
  <p class="lead">
    Expected margin <strong class="${scenarios.totals.margin.expected >= 0 ? "good" : "critical"}">${fmt(scenarios.totals.margin.expected)}</strong>
    — range ${fmt(Math.min(scenarios.totals.margin.worst, scenarios.totals.margin.best))} to ${fmt(Math.max(scenarios.totals.margin.worst, scenarios.totals.margin.best))}.
  </p>
  <table class="totals">
    <thead><tr><th></th><th>Worst case</th><th>Expected</th><th>Best case</th></tr></thead>
    <tbody>
      <tr><th>Cost</th><td>${fmt(scenarios.totals.cost.worst)}</td><td>${fmt(scenarios.totals.cost.expected)}</td><td>${fmt(scenarios.totals.cost.best)}</td></tr>
      <tr><th>Revenue</th><td>${fmt(scenarios.totals.revenue.worst)}</td><td>${fmt(scenarios.totals.revenue.expected)}</td><td>${fmt(scenarios.totals.revenue.best)}</td></tr>
      <tr class="emphasis"><th>Margin</th><td>${fmt(scenarios.totals.margin.worst)}</td><td>${fmt(scenarios.totals.margin.expected)}</td><td>${fmt(scenarios.totals.margin.best)}</td></tr>
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
  <h2>Scenario bands by period</h2>
  ${renderBandChartSvg(scenarios.periods, scenarios.marginByPeriod, { currency: project.currency, displayUnits: project.displayUnits })}
</section>

<section class="card chart-section">
  <h2>Cumulative P&amp;L</h2>
  ${renderCumulativeChartSvg(scenarios.periods, scenarios.marginByPeriod, { currency: project.currency, displayUnits: project.displayUnits })}
</section>

<section class="card">
  <h2>Per-period detail</h2>
  <table class="periods">
    <thead>
      <tr><th>Period</th>${scenarios.periods.map((p) => `<th>${escapeHtml(p)}</th>`).join("")}</tr>
    </thead>
    <tbody>
      <tr><th>Cost</th>${scenarios.periods.map((p) => `<td>${fmt(scenarios.costByPeriod[p].expected)}</td>`).join("")}</tr>
      <tr><th>Revenue</th>${scenarios.periods.map((p) => `<td>${fmt(scenarios.revenueByPeriod[p].expected)}</td>`).join("")}</tr>
      <tr class="emphasis"><th>Margin</th>${scenarios.periods.map((p) => `<td>${fmt(scenarios.marginByPeriod[p].expected)}</td>`).join("")}</tr>
    </tbody>
  </table>
  <p class="note">Expected values shown above; see the scenario band chart for the worst/best range
  per period.</p>
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
</section>

${variance ? renderVarianceSection(variance, fmt, input.riskCommentary) : ""}

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
): string {
  const flagLabel: Record<string, string> = { ok: "On track", warning: "Watch", red: "Over budget" };
  const flagClass: Record<string, string> = { ok: "good", warning: "warning", red: "critical" };

  return `<section class="card">
  <h2>Budget vs. actual</h2>
  ${riskCommentary ? `<p>${escapeHtml(riskCommentary).replace(/\n/g, "<br />")}</p>` : ""}
  <table class="totals">
    <thead><tr><th>Category</th><th>Status</th><th>Actual to date</th><th>Projection to complete</th><th>Expected total</th><th>Worst-case ceiling</th></tr></thead>
    <tbody>
      ${Object.entries(variance.byCategory)
        .map(
          ([category, row]) =>
            `<tr><th>${CATEGORY_LABEL[category] ?? escapeHtml(category)}</th><td class="${flagClass[row.flag]}">${flagLabel[row.flag]}</td><td>${fmt(row.actualToDate)}</td><td>${fmt(row.projectionToComplete)}</td><td>${fmt(row.expectedTotal)}</td><td>${fmt(row.worstCeiling)}</td></tr>`,
        )
        .join("")}
      <tr class="emphasis"><th>Total</th><td class="${flagClass[variance.total.flag]}">${flagLabel[variance.total.flag]}</td><td>${fmt(variance.total.actualToDate)}</td><td>${fmt(variance.total.projectionToComplete)}</td><td>${fmt(variance.total.expectedTotal)}</td><td>${fmt(variance.total.worstCeiling)}</td></tr>
    </tbody>
  </table>
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
  table { border-collapse: collapse; width: 100%; font-size: 0.85rem; }
  table.periods { display: block; overflow-x: auto; white-space: nowrap; }
  th, td { text-align: right; padding: 0.4rem 0.6rem; border-bottom: 1px solid #e1e0d9; }
  th:first-child, td:first-child { text-align: left; }
  thead th { color: #898781; font-weight: 500; }
  tr.emphasis th, tr.emphasis td { font-weight: 600; border-top: 2px solid #c3c2b7; }
  .good { color: #006300; }
  .critical { color: #d03b3b; }
  .warning { color: #a35b00; }
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
