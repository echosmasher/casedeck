// Salary cost: hours x rate, with the loaded-cost multiplier applied here by the engine —
// never pre-baked into the rate card (PLAN.md §4, CLAUDE.md rule 2).
import type { PeriodKey, PeriodValues, SalaryLineItem } from "./model";

/** Raw cost per period: hours x rate, no multiplier. */
export function salaryLineRawCost(line: SalaryLineItem): PeriodValues {
  const result: PeriodValues = {};
  for (const [period, hours] of Object.entries(line.hoursPerPeriod)) {
    result[period] = hours * line.ratePerHour;
  }
  return result;
}

/** Loaded cost per period: (hours x rate) x multiplier. This is what the engine treats as the
 * line's actual budgeted cost — the multiplier is a computation step, not stored input. */
export function salaryLineLoadedCost(
  line: SalaryLineItem,
  loadedCostMultiplier: number,
): PeriodValues {
  const raw = salaryLineRawCost(line);
  const result: PeriodValues = {};
  for (const [period, value] of Object.entries(raw)) {
    result[period] = value * loadedCostMultiplier;
  }
  return result;
}

export function salaryLineTotalLoadedCost(
  line: SalaryLineItem,
  loadedCostMultiplier: number,
): number {
  return sumValues(salaryLineLoadedCost(line, loadedCostMultiplier));
}

export function sumValues(values: PeriodValues): number {
  let total = 0;
  for (const v of Object.values(values)) total += v;
  return total;
}

export function periodsOf(values: PeriodValues): PeriodKey[] {
  return Object.keys(values);
}
