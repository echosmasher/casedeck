"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, formatRange } from "../_lib/format";
import { activeConfig } from "../_lib/activeConfig";
import { lineScenarioTotal } from "@/engine/scenarios";
import type { ProjectScenarios } from "@/engine/scenarios";
import type { CostCategory, Project } from "@/engine/model";
import { CATEGORY_LABEL } from "./shared";

export function CategoryBreakdown({
  project,
  scenarios,
}: {
  project: Project;
  scenarios: ProjectScenarios;
}) {
  const categories = Object.keys(scenarios.costByCategory) as CostCategory[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost by category</CardTitle>
        <CardDescription>
          Expected total per category, with its own best/worst range. Expand a category to see
          every line item behind it.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {categories.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No cost lines yet.</p>
        ) : (
          categories.map((category) => (
            <CategoryRow
              key={category}
              category={category}
              value={scenarios.costByCategory[category]}
              lines={project.costs.filter((l) => l.category === category)}
              loadedCostMultiplier={project.loadedCostMultiplier}
              currency={project.currency}
              displayUnits={project.displayUnits}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function CategoryRow({
  category,
  value,
  lines,
  loadedCostMultiplier,
  currency,
  displayUnits,
}: {
  category: CostCategory;
  value: { expected: number; best: number; worst: number };
  lines: Project["costs"];
  loadedCostMultiplier: number;
  currency: string;
  displayUnits: Project["displayUnits"];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="py-2">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 py-1.5 text-left"
        aria-expanded={expanded}
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="flex items-center gap-1.5 font-medium">
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          {CATEGORY_LABEL[category] ?? category}
          <span className="text-xs font-normal text-muted-foreground">
            ({lines.length} {lines.length === 1 ? "line" : "lines"})
          </span>
        </span>
        <span className="flex flex-col items-end">
          <span className="tabular-nums">{formatCurrency(value.expected, currency, displayUnits)}</span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatRange(value.worst, value.best, currency, displayUnits)}
          </span>
        </span>
      </button>

      {expanded && (
        <ul className="mt-1 flex flex-col gap-1.5 pl-6">
          {lines.map((line) => {
            const total = lineScenarioTotal(line, loadedCostMultiplier, activeConfig.confidenceBands);
            return (
              <li key={line.id} className="flex items-center justify-between gap-4 text-sm">
                <span className="flex flex-col">
                  <span>{line.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {line.category === "salary" ? `${line.role} · ${line.ratePerHour}/h` : null}{" "}
                    confidence: {line.confidence}
                  </span>
                </span>
                <span className="flex flex-col items-end">
                  <span className="tabular-nums">{formatCurrency(total.expected, currency, displayUnits)}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatRange(total.worst, total.best, currency, displayUnits)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
