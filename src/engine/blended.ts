// Blends actuals with projections into a single best/expected/worst series (PLAN.md ticket 11).
// Closed periods (`project.closedPeriods`) use actual cost (every cost category) and actual
// revenue (the `revenue` mapped category) with a zero-width band — expected = best = worst, since
// a closed period is a fact, not a forecast. Open periods are exactly `computeProjectScenarios`'s
// projected numbers. Also returns the budgeted values per period (tickets 12/13's "actuals vs.
// budget" markers) and warnings for closed periods with no actuals at all, which are treated as
// zero rather than silently dropped (CLAUDE.md rule 4).
import { periodizeCosts, periodizeRevenue, projectPeriods } from "./periodize";
import { addScenario, computeProjectScenarios, subtractScenario, ZERO_SCENARIO } from "./scenarios";
import type {
  ActualEntry,
  ConfidenceBands,
  PeriodKey,
  PeriodValues,
  Project,
  ScenarioByPeriod,
  ScenarioValue,
} from "./model";

const REVENUE_CATEGORY = "revenue";

function actualScenarioValue(value: number): ScenarioValue {
  return { expected: value, best: value, worst: value };
}

export interface BlendedTotals {
  periods: PeriodKey[];
  costByPeriod: ScenarioByPeriod;
  revenueByPeriod: ScenarioByPeriod;
  marginByPeriod: ScenarioByPeriod;
  budgetedCostByPeriod: PeriodValues;
  budgetedRevenueByPeriod: PeriodValues;
  totals: { cost: ScenarioValue; revenue: ScenarioValue; margin: ScenarioValue };
  /** Chronologically last closed period, or null when nothing is closed — drives the dashboard's
   * "Actuals through <period>, projected after" caption. */
  lastClosedPeriod: PeriodKey | null;
  warnings: string[];
}

export function computeBlendedTotals(
  project: Project,
  actualEntries: ActualEntry[],
  bands: ConfidenceBands,
): BlendedTotals {
  const periods = projectPeriods(project);
  const scenarios = computeProjectScenarios(project, bands);
  const budgetedCost = periodizeCosts(project);
  const budgetedRevenue = periodizeRevenue(project);
  const closedPeriods = new Set(project.closedPeriods);

  const actualCostByPeriod: PeriodValues = {};
  const actualRevenueByPeriod: PeriodValues = {};
  for (const entry of actualEntries) {
    const bucket = entry.category === REVENUE_CATEGORY ? actualRevenueByPeriod : actualCostByPeriod;
    bucket[entry.period] = (bucket[entry.period] ?? 0) + entry.amount;
  }

  const warnings: string[] = [];
  const costByPeriod: ScenarioByPeriod = {};
  const revenueByPeriod: ScenarioByPeriod = {};

  for (const period of periods) {
    if (closedPeriods.has(period)) {
      const hasCost = actualCostByPeriod[period] !== undefined;
      const hasRevenue = actualRevenueByPeriod[period] !== undefined;
      if (!hasCost && !hasRevenue) {
        warnings.push(`${period} is closed but has no actuals`);
      }
      costByPeriod[period] = actualScenarioValue(actualCostByPeriod[period] ?? 0);
      revenueByPeriod[period] = actualScenarioValue(actualRevenueByPeriod[period] ?? 0);
    } else {
      costByPeriod[period] = scenarios.costByPeriod[period] ?? ZERO_SCENARIO;
      revenueByPeriod[period] = scenarios.revenueByPeriod[period] ?? ZERO_SCENARIO;
    }
  }

  const marginByPeriod: ScenarioByPeriod = {};
  for (const period of periods) {
    marginByPeriod[period] = subtractScenario(revenueByPeriod[period], costByPeriod[period]);
  }

  const totalCost = periods.reduce((acc, p) => addScenario(acc, costByPeriod[p]), ZERO_SCENARIO);
  const totalRevenue = periods.reduce((acc, p) => addScenario(acc, revenueByPeriod[p]), ZERO_SCENARIO);
  const totalMargin = subtractScenario(totalRevenue, totalCost);

  const lastClosedPeriod = periods.filter((p) => closedPeriods.has(p)).at(-1) ?? null;

  return {
    periods,
    costByPeriod,
    revenueByPeriod,
    marginByPeriod,
    budgetedCostByPeriod: budgetedCost.totalByPeriod,
    budgetedRevenueByPeriod: budgetedRevenue.byPeriod,
    totals: { cost: totalCost, revenue: totalRevenue, margin: totalMargin },
    lastClosedPeriod,
    warnings,
  };
}
