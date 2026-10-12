import { describe, expect, it } from "vitest";
import { totalStatusNote } from "./varianceCopy";
import type { CategoryVariance, ProjectVariance, VarianceFlag } from "@/engine/variance";

const money = (v: number) => `${v.toLocaleString("en-US")} NOK`;

function row(category: string, flag: VarianceFlag, projection = 100, expected = 100, ceiling = 120): CategoryVariance {
  return {
    category,
    actualToDate: 0,
    budgetedToDate: 0,
    projectionToComplete: projection,
    expectedTotal: expected,
    worstCeiling: ceiling,
    contingency: ceiling - expected,
    contingencyConsumedPct: 0,
    flag,
  };
}

function variance(categories: VarianceFlag[], total: CategoryVariance): ProjectVariance {
  return { byCategory: Object.fromEntries(categories.map((f, i) => [`c${i}`, row(`c${i}`, f)])), total };
}

describe("totalStatusNote", () => {
  it("001 shape: a category past its ceiling, the total over budget but inside its own", () => {
    const v = variance(["ok", "red"], row("__total__", "warning", 1_552_600, 1_473_600, 1_620_960));
    expect(totalStatusNote(v, money, false)).toBe(
      "The projected total is 79,000 NOK over budget but still inside its 1,620,960 NOK worst-case ceiling. " +
        "Each category is checked against its own ceiling, so one can be flagged before the total is.",
    );
  });

  it("finished project under budget says total cost, not projection", () => {
    const v = variance(["warning"], row("__total__", "ok", 90, 100, 120));
    expect(totalStatusNote(v, money, true)).toBe(
      "The total cost is 10 NOK under budget and inside its 120 NOK worst-case ceiling. " +
        "Each category is checked against its own ceiling, so one can be flagged before the total is.",
    );
  });

  it("is silent when the total is flagged as hard as any category", () => {
    expect(totalStatusNote(variance(["ok", "warning"], row("__total__", "warning")), money, false)).toBeNull();
    expect(totalStatusNote(variance(["ok"], row("__total__", "ok")), money, false)).toBeNull();
  });
});
