"use client";

import { useEffectiveConfig } from "../_lib/EffectiveConfigProvider";
import { formatCurrency, formatRange } from "../_lib/format";
import { validateProjectInvariants, type ModelValidationError } from "@/engine/validate";
import { computeProjectScenarios } from "@/engine/scenarios";
import { computeBlendedTotals } from "@/engine/blended";
import type { ActualEntry, Project, ScenarioValue } from "@/engine/model";
import { ScenarioChart } from "./ScenarioChart";
import { CumulativeChart } from "./CumulativeChart";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { VarianceSection } from "./VarianceSection";

export function Dashboard({ project, actuals }: { project: Project; actuals: ActualEntry[] }) {
  const { config } = useEffectiveConfig();
  const errors = validateProjectInvariants(project);
  if (errors.length > 0) {
    return <ValidationErrorList errors={errors} />;
  }

  const scenarios = computeProjectScenarios(project, config.confidenceBands);
  const blended = computeBlendedTotals(project, actuals, config.confidenceBands);
  const { currency, displayUnits } = project;

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
          <ul
            className="list-disc space-y-1 pl-5 text-sm"
            style={{ color: "var(--viz-warning)" }}
          >
            {blended.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Total cost"
          value={blended.totals.cost}
          currency={currency}
          displayUnits={displayUnits}
        />
        <StatTile
          label="Total revenue"
          value={blended.totals.revenue}
          currency={currency}
          displayUnits={displayUnits}
        />
        <StatTile
          label="Margin"
          value={blended.totals.margin}
          currency={currency}
          displayUnits={displayUnits}
          polarity
        />
      </div>
      {blended.lastClosedPeriod && (
        <p className="-mt-2 text-caption text-muted-foreground">
          Actuals through {blended.lastClosedPeriod}, projected after
        </p>
      )}

      <ScenarioChart
        periods={scenarios.periods}
        byPeriod={scenarios.marginByPeriod}
        currency={currency}
        displayUnits={displayUnits}
      />

      <CumulativeChart
        periods={scenarios.periods}
        byPeriod={scenarios.marginByPeriod}
        currency={currency}
        displayUnits={displayUnits}
      />

      <VarianceSection project={project} actuals={actuals} />

      <CategoryBreakdown project={project} scenarios={scenarios} />
    </div>
  );
}

function StatTile({
  label,
  value,
  currency,
  displayUnits,
  polarity,
}: {
  label: string;
  value: ScenarioValue;
  currency: string;
  displayUnits: Project["displayUnits"];
  polarity?: boolean;
}) {
  const color = polarity
    ? value.expected >= 0
      ? "var(--viz-good)"
      : "var(--viz-critical)"
    : "var(--viz-text-primary)";

  return (
    <div className="rounded-[0.5rem] border border-border p-4">
      <p className="text-label-caps text-muted-foreground">{label}</p>
      <p className="mt-1 text-display-xl tabular-nums" style={{ color }}>
        {formatCurrency(value.expected, currency, displayUnits)}
      </p>
      <p className="mt-1 text-caption text-muted-foreground tabular-nums">
        {formatRange(value.worst, value.best, currency, displayUnits)} range
      </p>
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
