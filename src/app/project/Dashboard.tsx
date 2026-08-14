"use client";

import { activeConfig } from "../_lib/activeConfig";
import { formatCurrency, formatRange } from "../_lib/format";
import { validateProjectInvariants, type ModelValidationError } from "@/engine/validate";
import { computeProjectScenarios } from "@/engine/scenarios";
import type { Project, ScenarioValue } from "@/engine/model";
import { ScenarioChart } from "./ScenarioChart";
import { CumulativeChart } from "./CumulativeChart";
import { CategoryBreakdown } from "./CategoryBreakdown";

export function Dashboard({ project }: { project: Project }) {
  const errors = validateProjectInvariants(project);
  if (errors.length > 0) {
    return <ValidationErrorList errors={errors} />;
  }

  const scenarios = computeProjectScenarios(project, activeConfig.confidenceBands);
  const { currency, displayUnits } = project;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Total cost"
          value={scenarios.totals.cost}
          currency={currency}
          displayUnits={displayUnits}
        />
        <StatTile
          label="Total revenue"
          value={scenarios.totals.revenue}
          currency={currency}
          displayUnits={displayUnits}
        />
        <StatTile
          label="Margin"
          value={scenarios.totals.margin}
          currency={currency}
          displayUnits={displayUnits}
          polarity
        />
      </div>

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
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold" style={{ color }}>
        {formatCurrency(value.expected, currency, displayUnits)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
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
