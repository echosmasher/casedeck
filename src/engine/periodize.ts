// Period enumeration and periodized cost/revenue expansion. Pure functions only.
import { addMonths, format } from "date-fns";
import { salaryLineLoadedCost, sumValues } from "./loadedCost";
import type {
  CostCategory,
  CostLineItem,
  PeriodKey,
  PeriodValues,
  Periodization,
  Project,
} from "./model";

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const QUARTER_PATTERN = /^(\d{4})-Q([1-4])$/;

function parseMonth(period: PeriodKey): Date {
  const match = MONTH_PATTERN.exec(period);
  if (!match) throw new Error(`Invalid monthly period key: "${period}"`);
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

function parseQuarter(period: PeriodKey): { year: number; quarter: number } {
  const match = QUARTER_PATTERN.exec(period);
  if (!match) throw new Error(`Invalid quarterly period key: "${period}"`);
  return { year: Number(match[1]), quarter: Number(match[2]) };
}

function nextQuarter(year: number, quarter: number): { year: number; quarter: number } {
  return quarter === 4 ? { year: year + 1, quarter: 1 } : { year, quarter: quarter + 1 };
}

/** Enumerate every period key from `start` to `end`, inclusive, per the project's periodization. */
export function enumeratePeriods(
  start: PeriodKey,
  end: PeriodKey,
  periodization: Periodization,
): PeriodKey[] {
  if (periodization === "total") {
    return [start];
  }

  if (periodization === "monthly") {
    const periods: PeriodKey[] = [];
    let cursor = parseMonth(start);
    const endDate = parseMonth(end);
    while (cursor.getTime() <= endDate.getTime()) {
      periods.push(format(cursor, "yyyy-MM"));
      cursor = addMonths(cursor, 1);
    }
    return periods;
  }

  // quarterly
  const periods: PeriodKey[] = [];
  let cursor = parseQuarter(start);
  const endCursor = parseQuarter(end);
  while (
    cursor.year < endCursor.year ||
    (cursor.year === endCursor.year && cursor.quarter <= endCursor.quarter)
  ) {
    periods.push(`${cursor.year}-Q${cursor.quarter}`);
    cursor = nextQuarter(cursor.year, cursor.quarter);
  }
  return periods;
}

export function projectPeriods(project: Project): PeriodKey[] {
  return enumeratePeriods(project.startPeriod, project.endPeriod, project.periodization);
}

export function lineValuesPerPeriod(line: CostLineItem, loadedCostMultiplier: number): PeriodValues {
  return line.category === "salary"
    ? salaryLineLoadedCost(line, loadedCostMultiplier)
    : line.valuesPerPeriod;
}

export interface PeriodizedCosts {
  /** category -> period -> amount */
  byCategory: Record<CostCategory, PeriodValues>;
  /** category -> total across all periods */
  totalByCategory: Record<CostCategory, number>;
  /** period -> total across all categories */
  totalByPeriod: PeriodValues;
  grandTotal: number;
}

export function periodizeCosts(project: Project): PeriodizedCosts {
  const periods = projectPeriods(project);
  const byCategory: Record<string, PeriodValues> = {};
  const totalByPeriod: PeriodValues = Object.fromEntries(periods.map((p) => [p, 0]));

  for (const line of project.costs) {
    const values = lineValuesPerPeriod(line, project.loadedCostMultiplier);
    const bucket = (byCategory[line.category] ??= Object.fromEntries(periods.map((p) => [p, 0])));
    for (const period of periods) {
      const amount = values[period] ?? 0;
      bucket[period] += amount;
      totalByPeriod[period] += amount;
    }
  }

  const totalByCategory: Record<string, number> = {};
  for (const [category, values] of Object.entries(byCategory)) {
    totalByCategory[category] = sumValues(values);
  }

  return {
    byCategory: byCategory as Record<CostCategory, PeriodValues>,
    totalByCategory: totalByCategory as Record<CostCategory, number>,
    totalByPeriod,
    grandTotal: sumValues(totalByPeriod),
  };
}

export interface PeriodizedRevenue {
  byPeriod: PeriodValues;
  total: number;
}

export function periodizeRevenue(project: Project): PeriodizedRevenue {
  const periods = projectPeriods(project);
  const byPeriod: PeriodValues = Object.fromEntries(periods.map((p) => [p, 0]));

  const model = project.pricingModel;
  if (model === null) {
    return { byPeriod, total: 0 };
  }

  if (model.type === "hourly") {
    for (const period of periods) {
      byPeriod[period] = (model.hoursPerPeriod[period] ?? 0) * model.ratePerHour;
    }
    return { byPeriod, total: sumValues(byPeriod) };
  }

  // fixed
  switch (model.allocation.type) {
    case "even": {
      const share = model.amount / periods.length;
      for (const period of periods) byPeriod[period] = share;
      break;
    }
    case "at_period": {
      if (!periods.includes(model.allocation.period)) {
        throw new Error(
          `Fixed-price allocation period "${model.allocation.period}" is outside the project lifetime`,
        );
      }
      byPeriod[model.allocation.period] = model.amount;
      break;
    }
    case "custom": {
      for (const period of periods) byPeriod[period] = model.allocation.values[period] ?? 0;
      break;
    }
  }

  return { byPeriod, total: sumValues(byPeriod) };
}
