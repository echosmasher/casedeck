// Blends actuals with projections into a single best/expected/worst series (PLAN.md ticket 11).
// Closed periods (`project.closedPeriods`) use actual cost (every cost category) with a zero-width
// band — expected = best = worst, since a closed period's cost is a fact, not a forecast. Revenue
// in a closed period is the recorded `revenue` actuals when any exist for that period, and
// otherwise stays the planned (projected) revenue: v1 reconciles costs, not revenue receipts
// (demo/README.md scope note), so a closed period with no revenue recorded must not read as zero
// income. Open periods are exactly `computeProjectScenarios`'s projected numbers. Also returns the
// budgeted values per period (tickets 12/13's "actuals vs. budget" markers) and warnings for closed
// periods with no cost actuals, whose cost is treated as zero rather than silently dropped
// (CLAUDE.md rule 4).
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

export const REVENUE_CATEGORY = "revenue";

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
  /** Budgeted revenue minus budgeted cost per period — the dashboard's dashed "Budgeted" line
   * (ticket 12), kept as an engine output rather than recomputed in a component. */
  budgetedMarginByPeriod: PeriodValues;
  /** Expected minus budgeted, per period: a closed period's actual against its plan (zero for an
   * open period, whose expected value is the plan). Drawn as bars once a project is finished. */
  costVsBudgetByPeriod: PeriodValues;
  marginVsBudgetByPeriod: PeriodValues;
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
      if (!hasCost) {
        warnings.push(`${period} is closed but has no cost actuals, so its cost counts as zero`);
      }
      costByPeriod[period] = actualScenarioValue(actualCostByPeriod[period] ?? 0);
      revenueByPeriod[period] = hasRevenue
        ? actualScenarioValue(actualRevenueByPeriod[period])
        : (scenarios.revenueByPeriod[period] ?? ZERO_SCENARIO);
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

  const budgetedMarginByPeriod: PeriodValues = Object.fromEntries(
    periods.map((p) => [p, (budgetedRevenue.byPeriod[p] ?? 0) - (budgetedCost.totalByPeriod[p] ?? 0)]),
  );

  const costVsBudgetByPeriod: PeriodValues = Object.fromEntries(
    periods.map((p) => [p, costByPeriod[p].expected - (budgetedCost.totalByPeriod[p] ?? 0)]),
  );
  const marginVsBudgetByPeriod: PeriodValues = Object.fromEntries(
    periods.map((p) => [p, marginByPeriod[p].expected - budgetedMarginByPeriod[p]]),
  );

  return {
    periods,
    costByPeriod,
    revenueByPeriod,
    marginByPeriod,
    budgetedCostByPeriod: budgetedCost.totalByPeriod,
    budgetedRevenueByPeriod: budgetedRevenue.byPeriod,
    budgetedMarginByPeriod,
    costVsBudgetByPeriod,
    marginVsBudgetByPeriod,
    totals: { cost: totalCost, revenue: totalRevenue, margin: totalMargin },
    lastClosedPeriod,
    warnings,
  };
}
