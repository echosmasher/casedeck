// Actuals vs. budget, projection-to-complete, and category-level flagging (PLAN.md §6.1/§6.3).
//
// projectionToComplete = actuals for periods that have them + expected/budgeted values for the
// remaining periods (per category, independently — a category with no actuals yet projects to
// exactly its expected total).
//
// Flagging is based on how much of a category's own contingency (worst-case ceiling minus
// expected total) the projection consumes: >=100% is a hard breach (red), >=50% is a warning,
// otherwise ok. This is deliberately a per-category signal — a single overrunning category can
// (and, in the 001 demo fixture, does) turn red well before the blended project total breaches
// its own, much larger, combined ceiling.
import { periodizeCosts, projectPeriods } from "./periodize";
import { computeProjectScenarios } from "./scenarios";
import type { ActualEntry, ConfidenceBands, PeriodValues, Project } from "./model";

export type VarianceFlag = "ok" | "warning" | "red";

export interface CategoryVariance {
  category: string;
  actualToDate: number;
  budgetedToDate: number;
  projectionToComplete: number;
  expectedTotal: number;
  worstCeiling: number;
  contingency: number;
  /** Fraction of contingency consumed by the projection; can exceed 1 on a breach. */
  contingencyConsumedPct: number;
  flag: VarianceFlag;
}

export interface ProjectVariance {
  byCategory: Record<string, CategoryVariance>;
  total: CategoryVariance;
}

function flagFor(consumedPct: number): VarianceFlag {
  if (consumedPct >= 1) return "red";
  if (consumedPct >= 0.5) return "warning";
  return "ok";
}

function buildCategoryVariance(
  category: string,
  actualToDate: number,
  budgetedToDate: number,
  projectionToComplete: number,
  expectedTotal: number,
  worstCeiling: number,
): CategoryVariance {
  const contingency = worstCeiling - expectedTotal;
  const overage = projectionToComplete - expectedTotal;
  const contingencyConsumedPct =
    contingency > 0 ? overage / contingency : overage > 0 ? Number.POSITIVE_INFINITY : 0;
  return {
    category,
    actualToDate,
    budgetedToDate,
    projectionToComplete,
    expectedTotal,
    worstCeiling,
    contingency,
    contingencyConsumedPct,
    flag: flagFor(contingencyConsumedPct),
  };
}

export function computeVariance(
  project: Project,
  actualEntries: ActualEntry[],
  bands: ConfidenceBands,
): ProjectVariance {
  const periods = projectPeriods(project);
  const budgeted = periodizeCosts(project);
  const scenarios = computeProjectScenarios(project, bands);
  const budgetedByCategory = budgeted.byCategory as Record<string, PeriodValues>;
  const budgetedTotalByCategory = budgeted.totalByCategory as Record<string, number>;
  const worstByCategory = scenarios.costByCategory as Record<string, { worst: number }>;

  const actualsByCategory = new Map<string, ActualEntry[]>();
  for (const entry of actualEntries) {
    const list = actualsByCategory.get(entry.category) ?? [];
    list.push(entry);
    actualsByCategory.set(entry.category, list);
  }

  const categories = new Set<string>([
    ...Object.keys(budgeted.totalByCategory),
    ...actualsByCategory.keys(),
  ]);

  const byCategory: Record<string, CategoryVariance> = {};
  let totalActual = 0;
  let totalBudgetedToDate = 0;
  let totalProjection = 0;
  let totalExpected = 0;
  let totalWorst = 0;

  for (const category of categories) {
    const entries = actualsByCategory.get(category) ?? [];
    const actualByPeriod: PeriodValues = {};
    for (const entry of entries) {
      actualByPeriod[entry.period] = (actualByPeriod[entry.period] ?? 0) + entry.amount;
    }
    const closedPeriods = new Set(Object.keys(actualByPeriod));
    const budgetedByPeriod = budgetedByCategory[category];

    const actualToDate = sum(Object.values(actualByPeriod));
    let budgetedToDate = 0;
    let remaining = 0;
    for (const period of periods) {
      const budgetedValue = budgetedByPeriod?.[period] ?? 0;
      if (closedPeriods.has(period)) {
        budgetedToDate += budgetedValue;
      } else {
        remaining += budgetedValue;
      }
    }
    const projectionToComplete = actualToDate + remaining;
    const expectedTotal = budgetedTotalByCategory[category] ?? 0;
    const worstCeiling = worstByCategory[category]?.worst ?? 0;

    const variance = buildCategoryVariance(
      category,
      actualToDate,
      budgetedToDate,
      projectionToComplete,
      expectedTotal,
      worstCeiling,
    );
    byCategory[category] = variance;

    totalActual += actualToDate;
    totalBudgetedToDate += budgetedToDate;
    totalProjection += projectionToComplete;
    totalExpected += expectedTotal;
    totalWorst += worstCeiling;
  }

  const total = buildCategoryVariance(
    "__total__",
    totalActual,
    totalBudgetedToDate,
    totalProjection,
    totalExpected,
    totalWorst,
  );

  return { byCategory, total };
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
