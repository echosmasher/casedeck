"use client";

import { useEffectiveConfig } from "../_lib/EffectiveConfigProvider";
import { validateProjectInvariants, type ModelValidationError } from "@/engine/validate";
import { computeProjectScenarios } from "@/engine/scenarios";
import { computeBlendedTotals } from "@/engine/blended";
import { computeHeadline } from "@/engine/headline";
import type { ActualEntry, Project } from "@/engine/model";
import { ScenarioChart } from "./ScenarioChart";
import { CumulativeChart } from "./CumulativeChart";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { VarianceSection } from "./VarianceSection";
import { Headline } from "./Headline";
import { computeActualsBoundary } from "./actualsBoundary";

export function Dashboard({ project, actuals }: { project: Project; actuals: ActualEntry[] }) {
  const { config } = useEffectiveConfig();
  const errors = validateProjectInvariants(project);
  if (errors.length > 0) {
    return <ValidationErrorList errors={errors} />;
  }

  const scenarios = computeProjectScenarios(project, config.confidenceBands);
  const blended = computeBlendedTotals(project, actuals, config.confidenceBands);
  const headline = computeHeadline(project, actuals, config.confidenceBands);
  const { currency, displayUnits } = project;
  // Charts follow the headline's measure: an internal project plots cost, never margin.
  const isCost = headline.measure === "cost";
  const chartByPeriod = isCost ? blended.costByPeriod : blended.marginByPeriod;
  const actualsOverlay = {
    boundary: computeActualsBoundary(blended.periods, project.closedPeriods),
    budgetedByPeriod: isCost ? blended.budgetedCostByPeriod : blended.budgetedMarginByPeriod,
  };

  return (
    <div className="flex flex-col gap-6">
      {blended.warnings.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--viz-warning-border)",
            backgroundColor: "var(--viz-warning-bg)",
          }}
        >
          <ul className="list-disc space-y-1 pl-5 text-sm marker:text-[var(--viz-status-warning)]">
            {blended.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <Headline
        project={project}
        headline={headline}
        totals={blended.totals}
      />

      <ScenarioChart
        measure={headline.measure}
        periods={blended.periods}
        byPeriod={chartByPeriod}
        actualsOverlay={actualsOverlay}
        currency={currency}
        displayUnits={displayUnits}
      />

      <CumulativeChart
        measure={headline.measure}
        budgetTotal={headline.budget}
        periods={blended.periods}
        byPeriod={chartByPeriod}
        actualsOverlay={actualsOverlay}
        currency={currency}
        displayUnits={displayUnits}
      />

      <VarianceSection project={project} actuals={actuals} />

      <CategoryBreakdown project={project} scenarios={scenarios} />
    </div>
  );
}

function ValidationErrorList({ errors }: { errors: ModelValidationError[] }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
      <h2 className="text-base font-semibold text-destructive">
        This project can&apos;t be shown on the dashboard yet
      </h2>
      <p className="mt-1 text-sm text-destructive/90">
        Fix the following on the Inputs tab, then come back — the dashboard never renders partial
        or approximate numbers for an invalid model.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-destructive">
        {errors.map((e) => (
          <li key={`${e.field}-${e.message}`}>
            <span className="font-mono text-xs">{translateField(e.field)}</span>: {e.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function translateField(field: string): string {
  const match = /^costs\[(\d+)\]/.exec(field);
  if (!match) return field;
  return field.replace(/^costs\[\d+\]/, `cost line ${Number(match[1]) + 1}`);
}
