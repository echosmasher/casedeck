"use client";

import { useEffect, useRef, useState } from "react";
import { useEffectiveConfig } from "../_lib/EffectiveConfigProvider";
import { validateProjectInvariants, type ModelValidationError } from "@/engine/validate";
import { computeProjectScenarios } from "@/engine/scenarios";
import { computeBlendedTotals } from "@/engine/blended";
import { computeHeadline } from "@/engine/headline";
import { computeSpreadDrivers } from "@/engine/spread";
import type { ActualEntry, Project } from "@/engine/model";
import { ScenarioChart } from "./ScenarioChart";
import { CumulativeChart } from "./CumulativeChart";
import { VarianceSection } from "./VarianceSection";
import { Headline } from "./Headline";
import { computeActualsBoundary } from "./actualsBoundary";
import { hasPeriodEnded } from "../_lib/overdue";
import { appToday } from "../_lib/today";

export function Dashboard({
  project,
  actuals,
  onOpenActuals,
}: {
  project: Project;
  actuals: ActualEntry[];
  onOpenActuals: () => void;
}) {
  const { config } = useEffectiveConfig();
  const errors = validateProjectInvariants(project);
  if (errors.length > 0) {
    return <ValidationErrorList errors={errors} />;
  }

  const scenarios = computeProjectScenarios(project, config.confidenceBands);
  const blended = computeBlendedTotals(project, actuals, config.confidenceBands);
  const headline = computeHeadline(project, actuals, config.confidenceBands);
  const spread = computeSpreadDrivers(project, actuals, config.confidenceBands);
  const { currency, displayUnits } = project;
  // Open periods the calendar has already passed: their figures are still the budget, not a forecast.
  const today = appToday();
  const endedOpenPeriods = blended.periods.filter(
    (p) => !project.closedPeriods.includes(p) && hasPeriodEnded(project.periodization, p, today),
  );
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
        spread={spread}
        bands={config.confidenceBands}
        endedOpenPeriods={endedOpenPeriods}
        onOpenActuals={onOpenActuals}
      />

      <VarianceSection project={project} actuals={actuals} scenarios={scenarios} />

      <TrendChart
        measure={headline.measure}
        budgetTotal={headline.budget}
        periods={blended.periods}
        byPeriod={chartByPeriod}
        actualsOverlay={actualsOverlay}
        currency={currency}
        displayUnits={displayUnits}
      />
    </div>
  );
}

type TrendView = "period" | "cumulative";

/** One chart card for the trend, switching between per-period and cumulative views — the two used
 * to sit stacked as near-identical cards (QA-ROUND-3-PLAN.md Phase 4). */
function TrendChart({ budgetTotal, ...props }: Omit<React.ComponentProps<typeof CumulativeChart>, "action">) {
  const [view, setView] = useState<TrendView>("period");
  // The toggle lives in the chart's header, so switching remounts it; put focus back on the
  // pressed option instead of letting it fall to <body>.
  const buttons = useRef(new Map<TrendView, HTMLButtonElement>());
  const refocus = useRef(false);
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    buttons.current.get(view)?.focus();
  }, [view]);

  const toggle = (
    <TrendToggle
      view={view}
      buttons={buttons}
      onChange={(next) => {
        refocus.current = true;
        setView(next);
      }}
    />
  );
  return view === "cumulative" ? (
    <CumulativeChart {...props} budgetTotal={budgetTotal} action={toggle} />
  ) : (
    <ScenarioChart {...props} action={toggle} />
  );
}

function TrendToggle({
  view,
  buttons,
  onChange,
}: {
  view: TrendView;
  buttons: React.RefObject<Map<TrendView, HTMLButtonElement>>;
  onChange: (next: TrendView) => void;
}) {
  const options: { value: TrendView; label: string }[] = [
    { value: "period", label: "Per period" },
    { value: "cumulative", label: "Cumulative" },
  ];
  return (
    <div role="group" aria-label="Chart view" className="inline-flex h-8 items-center rounded-[0.375rem] border border-border bg-muted p-1">
      {options.map((option) => (
        <button
          key={option.value}
          ref={(el) => {
            if (el) buttons.current.set(option.value, el);
            else buttons.current.delete(option.value);
          }}
          type="button"
          aria-pressed={view === option.value}
          onClick={() => onChange(option.value)}
          className="inline-flex h-full items-center rounded-[0.25rem] border border-transparent px-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-pressed:border-border aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
        >
          {option.label}
        </button>
      ))}
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
