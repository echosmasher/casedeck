// What makes the headline range as wide as it is (PRODUCT.md principle 1: "show the band and what
// drives it"). Splits the blended best-to-worst width into its sources: each cost category, and
// revenue for a customer project. Uses the same rules as `computeBlendedTotals`, so the sources add
// up to the headline range exactly: a closed period's cost is an actual with no width, and a closed
// period's revenue keeps its band unless revenue actuals were recorded for it.
import { REVENUE_CATEGORY } from "./blended";
import { projectPeriods } from "./periodize";
import { computeProjectScenarios, lineScenarioByPeriod, resolveConfidence } from "./scenarios";
import type { ActualEntry, Confidence, ConfidenceBands, CostCategory, Project } from "./model";

export interface SpreadSource {
  /** A cost category id, or "revenue". */
  source: CostCategory | typeof REVENUE_CATEGORY;
  /** This source's share of the best-to-worst width, in the project currency. */
  width: number;
  /** Cost lines that contribute width; 0 for revenue, which is one pricing model. */
  lines: number;
  /** The confidence level contributing the most width within this source. */
  mainConfidence: Confidence;
  /** True when more than one confidence level contributes width. */
  mixedConfidence: boolean;
}

export interface SpreadDrivers {
  /** Best-to-worst width of the headline range: the sum of every source's width. */
  total: number;
  /** Sources with any width, widest first. Empty when the range has collapsed. */
  sources: SpreadSource[];
}

interface Accumulator {
  width: number;
  lines: Set<string>;
  byConfidence: Map<Confidence, number>;
}

export function computeSpreadDrivers(
  project: Project,
  actualEntries: ActualEntry[],
  bands: ConfidenceBands,
): SpreadDrivers {
  const periods = projectPeriods(project);
  const closed = new Set(project.closedPeriods);
  const open = periods.filter((p) => !closed.has(p));
  const acc = new Map<SpreadSource["source"], Accumulator>();

  function add(source: SpreadSource["source"], line: string | null, confidence: Confidence, width: number) {
    if (width <= 0) return;
    const entry = acc.get(source) ?? { width: 0, lines: new Set<string>(), byConfidence: new Map() };
    entry.width += width;
    if (line !== null) entry.lines.add(line);
    entry.byConfidence.set(confidence, (entry.byConfidence.get(confidence) ?? 0) + width);
    acc.set(source, entry);
  }

  for (const line of project.costs) {
    const byPeriod = lineScenarioByPeriod(line, project.loadedCostMultiplier, bands);
    for (const period of open) {
      const value = byPeriod[period];
      if (!value) continue;
      add(line.category, line.id, resolveConfidence(line.confidence, line.confidencePerPeriod, period), value.worst - value.best);
    }
  }

  // Revenue only counts toward a margin headline; an internal project's headline is cost alone.
  const model = project.pricingModel;
  if (project.type === "customer" && model !== null) {
    const revenueActualPeriods = new Set(
      actualEntries.filter((a) => a.category === REVENUE_CATEGORY).map((a) => a.period),
    );
    const revenueByPeriod = computeProjectScenarios(project, bands).revenueByPeriod;
    for (const period of periods) {
      if (closed.has(period) && revenueActualPeriods.has(period)) continue;
      const value = revenueByPeriod[period];
      const confidence: Confidence =
        model.type === "hourly" ? resolveConfidence(model.confidence, model.confidencePerPeriod, period) : model.confidence;
      add(REVENUE_CATEGORY, null, confidence, value.best - value.worst);
    }
  }

  const sources: SpreadSource[] = [...acc.entries()]
    .map(([source, entry]) => {
      const ranked = [...entry.byConfidence.entries()].sort((a, b) => b[1] - a[1]);
      return {
        source,
        width: entry.width,
        lines: entry.lines.size,
        mainConfidence: ranked[0][0],
        mixedConfidence: ranked.length > 1,
      };
    })
    .sort((a, b) => b.width - a.width);

  return { total: sources.reduce((sum, s) => sum + s.width, 0), sources };
}
