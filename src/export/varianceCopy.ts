// Words for the Budget vs. actual table, shared by the dashboard and the business-case export.
// Every number comes from `computeVariance` (src/engine/variance.ts); this module only phrases it.
import type { ProjectVariance, VarianceFlag } from "@/engine/variance";

const SEVERITY: Record<VarianceFlag, number> = { ok: 0, warning: 1, red: 2 };

/** One line under the table when a category is flagged harder than the total — the 001 case, where
 * Consultancy is past its ceiling while the total sits inside its own. Without it the red category
 * beside a calmer Total row reads as a contradiction; the line says why both are true. Null when
 * the total is flagged at least as hard as every category, since there is nothing to reconcile. */
export function totalStatusNote(
  variance: ProjectVariance,
  money: (v: number) => string,
  /** Every period closed: the total is a recorded cost, not a projection. */
  complete: boolean,
): string | null {
  const categories = Object.values(variance.byCategory);
  const worst = Math.max(...categories.map((c) => SEVERITY[c.flag]));
  if (categories.length === 0 || worst <= SEVERITY[variance.total.flag]) return null;

  const { projectionToComplete, expectedTotal, worstCeiling } = variance.total;
  const gap = projectionToComplete - expectedTotal;
  const subject = complete ? "The total cost" : "The projected total";
  const position =
    gap === 0
      ? "is on budget and"
      : gap > 0
        ? `is ${money(gap)} over budget but still`
        : `is ${money(-gap)} under budget and`;
  return (
    `${subject} ${position} inside its ${money(worstCeiling)} worst-case ceiling. ` +
    "Each category is checked against its own ceiling, so one can be flagged before the total is."
  );
}
