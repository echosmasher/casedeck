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

/** Recorded actuals summed per period, cost and revenue apart. A period with no entries is absent
 * (not zero), so "nothing recorded" stays distinguishable from "recorded 0". */
function sumActualsByPeriod(actualEntries: ActualEntry[]): { cost: PeriodValues; revenue: PeriodValues } {
  const cost: PeriodValues = {};
  const revenue: PeriodValues = {};
  for (const entry of actualEntries) {
    const bucket = entry.category === REVENUE_CATEGORY ? revenue : cost;
    bucket[entry.period] = (bucket[entry.period] ?? 0) + entry.amount;
  }
  return { cost, revenue };
}

export interface PeriodActuals {
  /** Recorded cost per period, open or closed; absent when nothing is recorded. */
  recordedCostByPeriod: PeriodValues;
  /** Recorded revenue per period; absent when none is recorded (planned revenue is kept). */
  recordedRevenueByPeriod: PeriodValues;
  budgetedCostByPeriod: PeriodValues;
  /** Recorded minus budgeted cost, only for periods with recorded cost. */
  recordedCostVsBudgetByPeriod: PeriodValues;
}

/** What the Actuals tab reviews before closing: each period's recorded cost against its budget,
 * whether or not the period is closed yet (closing is the step this check informs). */
export function computePeriodActuals(project: Project, actualEntries: ActualEntry[]): PeriodActuals {
  const { cost, revenue } = sumActualsByPeriod(actualEntries);
  const budgeted = periodizeCosts(project).totalByPeriod;
  const recordedCostVsBudgetByPeriod: PeriodValues = Object.fromEntries(
    Object.entries(cost).map(([p, v]) => [p, v - (budgeted[p] ?? 0)]),
  );
  return {
    recordedCostByPeriod: cost,
    recordedRevenueByPeriod: revenue,
    budgetedCostByPeriod: budgeted,
    recordedCostVsBudgetByPeriod,
  };
}

/** Budgeted cost categories with no actuals in a period that does have other cost actuals, sorted.
 * Closing such a period counts those categories' cost as zero. A period with no cost actuals at all
 * is reported separately, so it returns nothing here. */
export function missingCostCategories(
  project: Project,
  actualEntries: { period: string; category: string }[],
  period: string,
): string[] {
  const recorded = new Set(
    actualEntries.filter((a) => a.period === period && a.category !== REVENUE_CATEGORY).map((a) => a.category),
  );
  if (recorded.size === 0) return [];
  const byCategory = periodizeCosts(project).byCategory as Record<string, PeriodValues>;
  return Object.keys(byCategory)
    .filter((category) => (byCategory[category]?.[period] ?? 0) > 0 && !recorded.has(category))
    .sort();
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

  const { cost: actualCostByPeriod, revenue: actualRevenueByPeriod } = sumActualsByPeriod(actualEntries);

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
      for (const category of missingCostCategories(project, actualEntries, period)) {
        warnings.push(`${period} is closed but has no ${category} actuals, so its ${category} cost counts as zero`);
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
