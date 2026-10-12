"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "../_lib/format";
import { activeConfig } from "../_lib/activeConfig";
import { useEffectiveConfig } from "../_lib/EffectiveConfigProvider";
import { computeVariance, type CategoryVariance } from "@/engine/variance";
import { lineScenarioTotal, type ProjectScenarios } from "@/engine/scenarios";
import type { ActualEntry, CostLineItem, Project, ScenarioValue } from "@/engine/model";
import { blendedFlagLabel, CATEGORY_LABEL, FLAG_META, flagLabel } from "./shared";

/** Anchor for the section; the headline's reason links here (QA-ROUND-3-PLAN.md Phase 4). */
export const VARIANCE_SECTION_ID = "budget-vs-actual";

/** Moves to a category's row — scrolled into view and its expand control focused — in whichever
 * layout (table or phone list) is showing. The headline's reason line calls this. */
export function revealVarianceRow(category: string) {
  const targets = document.querySelectorAll<HTMLElement>(`[data-variance-row="${CSS.escape(category)}"]`);
  const visible = [...targets].find((el) => el.offsetParent !== null);
  if (!visible) return false;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  visible.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
  visible.focus({ preventScroll: true });
  return true;
}

/** One list of cost categories, in config order, merging what used to be "Budget vs. actual" and
 * "Cost by category". With actuals, each category carries its variance status and projection;
 * without, its budgeted range. Either way a category expands to the line items behind it. */
export function VarianceSection({
  project,
  actuals,
  scenarios,
}: {
  project: Project;
  actuals: ActualEntry[];
  scenarios: ProjectScenarios;
}) {
  const { config } = useEffectiveConfig();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const { currency, displayUnits } = project;
  const money = (v: number) => formatCurrency(v, currency, displayUnits);

  const variance = actuals.length > 0 ? computeVariance(project, actuals, config.confidenceBands) : null;
  const budgeted = scenarios.costByCategory as Record<string, ScenarioValue>;
  const present = new Set([...Object.keys(budgeted), ...Object.keys(variance?.byCategory ?? {})]);
  const configOrder = activeConfig.categories.map((c) => c.id);
  const categories = [
    ...configOrder.filter((c) => present.has(c)),
    ...[...present].filter((c) => !configOrder.includes(c)).sort(),
  ];

  const rows = categories.map((category) => ({
    category,
    label: CATEGORY_LABEL[category] ?? category,
    budget: budgeted[category] ?? { expected: 0, best: 0, worst: 0 },
    variance: variance?.byCategory[category] ?? null,
    lines: project.costs
      .filter((l) => l.category === category)
      .map((line) => ({ line, total: lineScenarioTotal(line, project.loadedCostMultiplier, config.confidenceBands) })),
  }));

  function toggle(category: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  const hasVariance = variance !== null;
  // Every period closed: the projection is just the actual, so the table reports the outcome.
  const complete = hasVariance && scenarios.periods.every((p) => project.closedPeriods.includes(p));

  return (
    <Card id={VARIANCE_SECTION_ID} className="scroll-mt-4">
      <CardHeader>
        <CardTitle>
          <h2>{hasVariance ? "Budget vs. actual" : "Cost by category"}</h2>
        </CardTitle>
        <CardDescription>
          {complete
            ? "Each category's actual cost against its budget and worst-case ceiling. Expand a category for its lines."
            : hasVariance
            ? "Projection to complete is the actuals so far plus the budget for the remaining periods, checked against each category's worst-case ceiling. Expand a category for its lines."
            : "Budgeted total per category, with its best and worst case. Expand a category for its lines."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cost lines yet.</p>
        ) : (
          <>
            {/* Below `md` each category stacks as its own block (six columns fit neither a phone
                nor a desktop at 200% zoom); the table takes over from `md` up. Only one is
                visible at a time, and `hidden` removes the other from the accessibility tree. */}
            <ul className="flex flex-col md:hidden">
              {rows.map((row) => {
                const open = expanded.has(row.category);
                const listId = `variance-lines-m-${row.category}`;
                return (
                  <li key={row.category} className="border-b py-3 first:pt-0">
                    <div className="flex items-center justify-between gap-3">
                      <ExpandButton
                        category={row.category}
                        label={row.label}
                        lineCount={row.lines.length}
                        open={open}
                        controls={listId}
                        onToggle={() => toggle(row.category)}
                      />
                      {row.variance && <FlagBadge row={row.variance} complete={complete} />}
                    </div>
                    <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm tabular-nums">
                      <Figures variance={row.variance} budget={row.budget} money={money} complete={complete} />
                    </dl>
                    {open && (
                      <ul id={listId} className="mt-2 flex flex-col gap-1.5 border-l pl-3">
                        {row.lines.map(({ line, total }) => (
                          <li key={line.id} className="flex items-start justify-between gap-4 text-sm">
                            <LineLabel line={line} />
                            <span className="flex shrink-0 flex-col items-end whitespace-nowrap tabular-nums">
                              <span>{money(total.expected)}</span>
                              <span className="text-xs text-muted-foreground">ceiling {money(total.worst)}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
              <li className="border-t-2 pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">Total</span>
                  {variance && (
                    <span className="text-sm text-muted-foreground">{blendedFlagLabel(variance.total.flag)}</span>
                  )}
                </div>
                <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm tabular-nums">
                  <Figures variance={variance?.total ?? null} budget={scenarios.totals.cost} money={money} complete={complete} />
                </dl>
              </li>
            </ul>

            <Table containerClassName="hidden md:block">
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  {hasVariance ? (
                    <>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">{complete ? "Actual" : "Actual to date"}</TableHead>
                      {!complete && <TableHead className="text-right">Projection to complete</TableHead>}
                    </>
                  ) : (
                    <TableHead className="text-right">Best case</TableHead>
                  )}
                  <TableHead className="text-right">Budgeted total</TableHead>
                  <TableHead className="text-right">Worst-case ceiling</TableHead>
                </TableRow>
              </TableHeader>
              {rows.map((row) => {
                const open = expanded.has(row.category);
                const lineIds = row.lines.map(({ line }) => `variance-line-${line.id}`).join(" ");
                return (
                  <TableBody key={row.category} className="[&_tr:last-child]:border-b">
                    <TableRow>
                      <TableCell>
                        <ExpandButton
                          category={row.category}
                          label={row.label}
                          lineCount={row.lines.length}
                          open={open}
                          controls={lineIds}
                          onToggle={() => toggle(row.category)}
                        />
                      </TableCell>
                      {row.variance ? (
                        <>
                          <TableCell>
                            <FlagBadge row={row.variance} complete={complete} />
                          </TableCell>
                          <TableCell
                            className="text-right tabular-nums"
                            style={{ color: complete && row.variance.flag !== "ok" ? FLAG_META[row.variance.flag].ink : undefined }}
                          >
                            {money(row.variance.actualToDate)}
                          </TableCell>
                          {!complete && (
                            <TableCell
                              className="text-right tabular-nums"
                              style={{ color: row.variance.flag === "ok" ? undefined : FLAG_META[row.variance.flag].ink }}
                            >
                              {money(row.variance.projectionToComplete)}
                            </TableCell>
                          )}
                        </>
                      ) : (
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {money(row.budget.best)}
                        </TableCell>
                      )}
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {money(row.variance?.expectedTotal ?? row.budget.expected)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {money(row.variance?.worstCeiling ?? row.budget.worst)}
                      </TableCell>
                    </TableRow>
                    {open &&
                      row.lines.map(({ line, total }) => (
                        <TableRow key={line.id} id={`variance-line-${line.id}`} className="bg-muted/40 text-sm">
                          <TableCell className="pl-9">
                            <LineLabel line={line} />
                          </TableCell>
                          {hasVariance ? (
                            <>
                              <TableCell />
                              <TableCell />
                              {!complete && <TableCell />}
                            </>
                          ) : (
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {money(total.best)}
                            </TableCell>
                          )}
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {money(total.expected)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {money(total.worst)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                );
              })}
              <TableBody>
                <TableRow className="border-t-2">
                  <TableCell className="font-semibold">Total</TableCell>
                  {variance ? (
                    <>
                      <TableCell className="text-sm text-muted-foreground">
                        {blendedFlagLabel(variance.total.flag)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {money(variance.total.actualToDate)}
                      </TableCell>
                      {!complete && (
                        <TableCell className="text-right tabular-nums font-semibold">
                          {money(variance.total.projectionToComplete)}
                        </TableCell>
                      )}
                    </>
                  ) : (
                    <TableCell className="text-right tabular-nums font-semibold text-muted-foreground">
                      {money(scenarios.totals.cost.best)}
                    </TableCell>
                  )}
                  <TableCell className="text-right tabular-nums font-semibold text-muted-foreground">
                    {money(variance?.total.expectedTotal ?? scenarios.totals.cost.expected)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-muted-foreground">
                    {money(variance?.total.worstCeiling ?? scenarios.totals.cost.worst)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ExpandButton({
  category,
  label,
  lineCount,
  open,
  controls,
  onToggle,
}: {
  category: string;
  label: string;
  lineCount: number;
  open: boolean;
  controls: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-variance-row={category}
      className="-mx-1 flex items-center gap-1.5 rounded-sm px-1 text-left font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-default"
      aria-expanded={lineCount > 0 ? open : undefined}
      aria-controls={open && lineCount > 0 ? controls : undefined}
      disabled={lineCount === 0}
      onClick={onToggle}
    >
      {lineCount > 0 &&
        (open ? (
          <ChevronDown aria-hidden className="size-4 shrink-0" />
        ) : (
          <ChevronRight aria-hidden className="size-4 shrink-0" />
        ))}
      {label}
      <span className="text-xs font-normal text-muted-foreground">
        ({lineCount} {lineCount === 1 ? "line" : "lines"})
      </span>
    </button>
  );
}

function FlagBadge({ row, complete }: { row: CategoryVariance; complete: boolean }) {
  const meta = FLAG_META[row.flag];
  return (
    <Badge variant={meta.variant} dot>
      {flagLabel(row.flag, complete)}
    </Badge>
  );
}

/** The phone layout's figures for one category (or the total), matching the table's columns. */
function Figures({
  variance,
  budget,
  money,
  complete,
}: {
  variance: CategoryVariance | null;
  budget: ScenarioValue;
  money: (v: number) => string;
  /** Every period closed: show the actual alone, with no projection beside it. */
  complete: boolean;
}) {
  const flagged = variance && variance.category !== "__total__" && variance.flag !== "ok";
  return (
    <>
      {variance ? (
        <>
          <dt className="text-muted-foreground">{complete ? "Actual" : "Actual to date"}</dt>
          <dd className="text-right" style={{ color: complete && flagged ? FLAG_META[variance.flag].ink : undefined }}>
            {money(variance.actualToDate)}
          </dd>
          {!complete && (
            <>
              <dt className="text-muted-foreground">Projection to complete</dt>
              <dd className="text-right" style={{ color: flagged ? FLAG_META[variance.flag].ink : undefined }}>
                {money(variance.projectionToComplete)}
              </dd>
            </>
          )}
        </>
      ) : (
        <>
          <dt className="text-muted-foreground">Best case</dt>
          <dd className="text-right text-muted-foreground">{money(budget.best)}</dd>
        </>
      )}
      <dt className="text-muted-foreground">Budgeted total</dt>
      <dd className="text-right text-muted-foreground">{money(variance?.expectedTotal ?? budget.expected)}</dd>
      <dt className="text-muted-foreground">Worst-case ceiling</dt>
      <dd className="text-right text-muted-foreground">{money(variance?.worstCeiling ?? budget.worst)}</dd>
    </>
  );
}

function LineLabel({ line }: { line: CostLineItem }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="whitespace-normal">{line.label}</span>
      <span className="text-xs text-muted-foreground">
        {line.category === "salary" ? `${line.role} · ${line.ratePerHour}/h · ` : null}
        {line.confidence}
      </span>
    </span>
  );
}
