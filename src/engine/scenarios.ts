// Confidence -> best/expected/worst scenario bands (PLAN.md §4). Pure functions; every scenario
// value is computed independently per line/period at its own resolved confidence, then summed —
// "worst" means every cost line simultaneously at its own high band and revenue at its own low
// band, not a single blended band applied to the total.
import { lineValuesPerPeriod, projectPeriods } from "./periodize";
import type {
  Confidence,
  ConfidenceBands,
  ConfidencePerPeriod,
  CostCategory,
  CostLineItem,
  PeriodKey,
  Project,
  ScenarioByPeriod,
  ScenarioValue,
} from "./model";

const ZERO: ScenarioValue = { expected: 0, best: 0, worst: 0 };

export function bandFraction(confidence: Confidence, bands: ConfidenceBands): number {
  return bands[confidence].bandPct / 100;
}

export function resolveConfidence(
  base: Confidence,
  overrides: ConfidencePerPeriod | undefined,
  period: PeriodKey,
): Confidence {
  return overrides?.[period] ?? base;
}

/** worst = value + band (costs go up in the worst case); best = value - band. */
export function costScenarioValue(
  value: number,
  confidence: Confidence,
  bands: ConfidenceBands,
): ScenarioValue {
  const b = bandFraction(confidence, bands);
  return { expected: value, best: value * (1 - b), worst: value * (1 + b) };
}

/** worst = value - band (revenue goes down in the worst case); best = value + band. */
export function revenueScenarioValue(
  value: number,
  confidence: Confidence,
  bands: ConfidenceBands,
): ScenarioValue {
  const b = bandFraction(confidence, bands);
  return { expected: value, best: value * (1 + b), worst: value * (1 - b) };
}

function addScenario(a: ScenarioValue, b: ScenarioValue): ScenarioValue {
  return { expected: a.expected + b.expected, best: a.best + b.best, worst: a.worst + b.worst };
}

export function lineScenarioByPeriod(
  line: CostLineItem,
  loadedCostMultiplier: number,
  bands: ConfidenceBands,
): ScenarioByPeriod {
  const values = lineValuesPerPeriod(line, loadedCostMultiplier);
  const result: ScenarioByPeriod = {};
  for (const [period, value] of Object.entries(values)) {
    const confidence = resolveConfidence(line.confidence, line.confidencePerPeriod, period);
    result[period] = costScenarioValue(value, confidence, bands);
  }
  return result;
}

/** A single cost line's expected/best/worst total across its whole lifetime — used for
 * dashboard drill-down (PLAN.md §6.3: "per-category breakdown with drill-down to the
 * underlying input lines"). */
export function lineScenarioTotal(
  line: CostLineItem,
  loadedCostMultiplier: number,
  bands: ConfidenceBands,
): ScenarioValue {
  const byPeriod = lineScenarioByPeriod(line, loadedCostMultiplier, bands);
  return Object.values(byPeriod).reduce(addScenario, ZERO);
}

function revenueScenarioByPeriod(project: Project, bands: ConfidenceBands): ScenarioByPeriod {
  const periods = projectPeriods(project);
  const result: ScenarioByPeriod = Object.fromEntries(periods.map((p) => [p, ZERO]));
  const model = project.pricingModel;
  if (model === null) return result;

  if (model.type === "hourly") {
    for (const period of periods) {
      const value = (model.hoursPerPeriod[period] ?? 0) * model.ratePerHour;
      const confidence = resolveConfidence(model.confidence, model.confidencePerPeriod, period);
      result[period] = revenueScenarioValue(value, confidence, bands);
    }
    return result;
  }

  // fixed
  for (const period of periods) {
    let value = 0;
    switch (model.allocation.type) {
      case "even":
        value = model.amount / periods.length;
        break;
      case "at_period":
        value = period === model.allocation.period ? model.amount : 0;
        break;
      case "custom":
        value = model.allocation.values[period] ?? 0;
        break;
    }
    result[period] = revenueScenarioValue(value, model.confidence, bands);
  }
  return result;
}

export interface ProjectScenarios {
  periods: PeriodKey[];
  costByPeriod: ScenarioByPeriod;
  revenueByPeriod: ScenarioByPeriod;
  marginByPeriod: ScenarioByPeriod;
  costByCategory: Record<CostCategory, ScenarioValue>;
  totals: { cost: ScenarioValue; revenue: ScenarioValue; margin: ScenarioValue };
}

export function computeProjectScenarios(
  project: Project,
  bands: ConfidenceBands,
): ProjectScenarios {
  const periods = projectPeriods(project);
  const costByPeriod: ScenarioByPeriod = Object.fromEntries(periods.map((p) => [p, ZERO]));
  const costByCategory: Record<string, ScenarioValue> = {};

  for (const line of project.costs) {
    const lineScenario = lineScenarioByPeriod(line, project.loadedCostMultiplier, bands);
    costByCategory[line.category] ??= ZERO;
    for (const period of periods) {
      const sv = lineScenario[period] ?? ZERO;
      costByPeriod[period] = addScenario(costByPeriod[period], sv);
      costByCategory[line.category] = addScenario(costByCategory[line.category], sv);
    }
  }

  const revenueByPeriod = revenueScenarioByPeriod(project, bands);

  const marginByPeriod: ScenarioByPeriod = {};
  for (const period of periods) {
    const rev = revenueByPeriod[period] ?? ZERO;
    const cost = costByPeriod[period] ?? ZERO;
    marginByPeriod[period] = {
      expected: rev.expected - cost.expected,
      best: rev.best - cost.best,
      worst: rev.worst - cost.worst,
    };
  }

  const totalCost = periods.reduce((acc, p) => addScenario(acc, costByPeriod[p]), ZERO);
  const totalRevenue = periods.reduce((acc, p) => addScenario(acc, revenueByPeriod[p]), ZERO);
  const totalMargin: ScenarioValue = {
    expected: totalRevenue.expected - totalCost.expected,
    best: totalRevenue.best - totalCost.best,
    worst: totalRevenue.worst - totalCost.worst,
  };

  return {
    periods,
    costByPeriod,
    revenueByPeriod,
    marginByPeriod,
    costByCategory: costByCategory as Record<CostCategory, ScenarioValue>,
    totals: { cost: totalCost, revenue: totalRevenue, margin: totalMargin },
  };
}
