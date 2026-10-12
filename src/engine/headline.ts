// The dashboard's headline verdict (DASHBOARD-CRITIQUE-PLAN.md Phase 3a,
// .impeccable/briefs/project-dashboard-headline.md). One pure summary the UI only formats:
//
// - What leads: a customer project leads with its blended margin; an internal project (no revenue
//   by design) leads with its blended cost, so an expected negative margin is never framed as a loss.
// - Against what: the budgeted total of that same measure (budgeted margin, or budgeted cost).
// - Status: the *worst* category flag from `computeVariance`, not the blended total's own flag — a
//   single category breaching its worst-case ceiling is exactly what the product exists to surface
//   before the total shows it (variance.ts header). Same thresholds; none are invented here.
import { computeBlendedTotals } from "./blended";
import { computeVariance, type VarianceFlag } from "./variance";
import type { ActualEntry, ConfidenceBands, PeriodKey, Project, ScenarioValue } from "./model";

export type HeadlineMeasure = "margin" | "cost";

export interface HeadlineSummary {
  measure: HeadlineMeasure;
  /** Blended best/expected/worst for the measure (actuals for closed periods, projections after). */
  value: ScenarioValue;
  /** Budgeted total for the measure: budgeted revenue − budgeted cost, or budgeted cost. */
  budget: number;
  /** `value.expected − budget`. */
  deltaVsBudget: number;
  /** `deltaVsBudget / |budget|`; null when the budget is zero (no meaningful percentage). */
  deltaPct: number | null;
  /** True when the expected value is worse than budget: cost above it, or margin below it. */
  unfavourable: boolean;
  /** Worst category flag; "ok" when there are no cost categories at all. */
  status: VarianceFlag;
  /** The category driving a non-ok status (highest contingency consumed among the worst flag). */
  driver: string | null;
  /** Recorded cost actuals to date, and the budgeted cost for the same periods. */
  costActualToDate: number;
  costBudgetedToDate: number;
  /** Last closed period, or null when nothing is closed. */
  lastClosedPeriod: PeriodKey | null;
  /** First and last open (projected) periods, or null when every period is closed. */
  projectedFrom: PeriodKey | null;
  projectedTo: PeriodKey | null;
  /** True when the margin's worst case is below zero (a possible loss); always false for cost. */
  worstCaseBelowZero: boolean;
}

const FLAG_RANK: Record<VarianceFlag, number> = { ok: 0, warning: 1, red: 2 };

export function computeHeadline(
  project: Project,
  actualEntries: ActualEntry[],
  bands: ConfidenceBands,
): HeadlineSummary {
  const blended = computeBlendedTotals(project, actualEntries, bands);
  const variance = computeVariance(project, actualEntries, bands);

  const measure: HeadlineMeasure = project.type === "customer" ? "margin" : "cost";
  const budgetedCost = sum(Object.values(blended.budgetedCostByPeriod));
  const budgetedRevenue = sum(Object.values(blended.budgetedRevenueByPeriod));
  const value = measure === "margin" ? blended.totals.margin : blended.totals.cost;
  const budget = measure === "margin" ? budgetedRevenue - budgetedCost : budgetedCost;
  const deltaVsBudget = value.expected - budget;

  let status: VarianceFlag = "ok";
  let driver: string | null = null;
  let driverPct = -Infinity;
  for (const row of Object.values(variance.byCategory)) {
    const rank = FLAG_RANK[row.flag];
    if (rank > FLAG_RANK[status] || (rank === FLAG_RANK[status] && rank > 0 && row.contingencyConsumedPct > driverPct)) {
      status = row.flag;
      driver = row.flag === "ok" ? null : row.category;
      driverPct = row.contingencyConsumedPct;
    }
  }

  const closed = new Set(project.closedPeriods);
  const open = blended.periods.filter((p) => !closed.has(p));

  return {
    measure,
    value,
    budget,
    deltaVsBudget,
    deltaPct: budget === 0 ? null : deltaVsBudget / Math.abs(budget),
    unfavourable: measure === "cost" ? deltaVsBudget > 0 : deltaVsBudget < 0,
    status,
    driver,
    costActualToDate: variance.total.actualToDate,
    costBudgetedToDate: variance.total.budgetedToDate,
    lastClosedPeriod: blended.lastClosedPeriod,
    projectedFrom: open[0] ?? null,
    projectedTo: open.at(-1) ?? null,
    worstCaseBelowZero: measure === "margin" && Math.min(value.worst, value.best) < 0,
  };
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
