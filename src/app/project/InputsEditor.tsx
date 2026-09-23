"use client";

import { useId, useState } from "react";
import { useEffectiveConfig } from "../_lib/EffectiveConfigProvider";
import { projectPeriods } from "@/engine/periodize";
import type { Confidence, CostLineItem, DirectCostCategory, Project } from "@/engine/model";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NumberCell } from "@/components/number-cell";
import { Trash2 } from "lucide-react";
import { selectClass, DIRECT_CATEGORIES, CATEGORY_LABEL, CONFIDENCE_OPTIONS } from "./shared";

// The Costs table pins its first two columns while period columns scroll underneath.
// LINE_COL_LEFT_OFFSET must always equal LINE_COL_WIDTH — it's the left edge the second sticky
// column docks against. LINE_COL_CONTENT_MAX_WIDTH must always equal LINE_COL_WIDTH minus the
// cell's horizontal padding (px-2 = 1rem): with table-layout "auto", a nowrap/truncated span
// with no width of its own contributes its *untruncated* text width to the column's min-content
// size, silently growing the column past LINE_COL_WIDTH and misaligning the offset above — giving
// the label wrapper its own definite max-width stops that.
const LINE_COL_WIDTH = "w-56";
const LINE_COL_LEFT_OFFSET = "left-56";
const LINE_COL_CONTENT_MAX_WIDTH = "max-w-[13rem]";
const CONFIDENCE_COL_WIDTH = "w-40";

export function InputsEditor({
  project,
  onLocalChange,
  onCommit,
  readOnly = false,
}: {
  project: Project;
  onLocalChange: (next: Project) => void;
  onCommit: (next: Project) => void | Promise<void>;
  readOnly?: boolean;
}) {
  const periods = projectPeriods(project);

  // Keystroke-level edits update local state only — nothing is written to IndexedDB until the
  // field is committed (blur, a discrete select/button action). Persisting on every keystroke
  // fires one IndexedDB write per character typed, which is unnecessary and — observed during
  // manual browser verification — can exhaust the origin's storage quota and crash the tab under
  // rapid typing. See CLAUDE.md / the Phase 3 report for the incident.
  function updateLineLocal(lineId: string, patch: Partial<CostLineItem>) {
    const costs = project.costs.map((line) =>
      line.id === lineId ? ({ ...line, ...patch } as CostLineItem) : line,
    );
    onLocalChange({ ...project, costs });
  }

  function commitLine(lineId: string, patch: Partial<CostLineItem>) {
    const costs = project.costs.map((line) =>
      line.id === lineId ? ({ ...line, ...patch } as CostLineItem) : line,
    );
    void onCommit({ ...project, costs });
  }

  function removeLine(lineId: string) {
    void onCommit({ ...project, costs: project.costs.filter((l) => l.id !== lineId) });
  }

  function addLine(line: CostLineItem) {
    void onCommit({ ...project, costs: [...project.costs, line] });
  }

  return (
    <fieldset disabled={readOnly} className="flex flex-col gap-6 border-0 p-0 m-0 min-w-0">
      {readOnly && (
        <p className="rounded-md border bg-muted px-4 py-2 text-sm text-muted-foreground">
          Viewer role — read only. Switch to Planner to edit.
        </p>
      )}
      {project.pricingModel && (
        <RevenueSection
          project={project}
          periods={periods}
          onLocalChange={onLocalChange}
          onCommit={onCommit}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Costs</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {project.costs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cost lines yet.</p>
          ) : (
            <Table containerClassName="scrollbar-always-visible">
              <TableHeader>
                <TableRow>
                  <TableHead className={cn("sticky left-0 z-20 bg-muted", LINE_COL_WIDTH)}>Line</TableHead>
                  <TableHead className={cn("sticky z-20 bg-muted", CONFIDENCE_COL_WIDTH, LINE_COL_LEFT_OFFSET)}>
                    Confidence
                  </TableHead>
                  {periods.map((p) => (
                    <TableHead key={p}>{p}</TableHead>
                  ))}
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.costs.map((line) => (
                  <CostLineRow
                    key={line.id}
                    line={line}
                    periods={periods}
                    onUpdateLocal={(patch) => updateLineLocal(line.id, patch)}
                    onCommit={(patch) => commitLine(line.id, patch)}
                    onRemove={() => removeLine(line.id)}
                  />
                ))}
              </TableBody>
            </Table>
          )}

          <AddCostLineForm periods={periods} onAdd={addLine} />
        </CardContent>
      </Card>
    </fieldset>
  );
}

function CostLineRow({
  line,
  periods,
  onUpdateLocal,
  onCommit,
  onRemove,
}: {
  line: CostLineItem;
  periods: string[];
  onUpdateLocal: (patch: Partial<CostLineItem>) => void;
  onCommit: (patch: Partial<CostLineItem>) => void;
  onRemove: () => void;
}) {
  const isSalary = line.category === "salary";

  return (
    <TableRow>
      <TableCell className={cn("sticky left-0 z-20 bg-card align-top", LINE_COL_WIDTH)}>
        <div className={cn("flex flex-col gap-1", LINE_COL_CONTENT_MAX_WIDTH)}>
          <span className="truncate font-medium">{line.label}</span>
          <span className="truncate text-xs text-muted-foreground">
            {CATEGORY_LABEL[line.category] ?? line.category}
          </span>
          {isSalary && (
            <span className="truncate text-xs text-muted-foreground">
              {line.role} · {line.ratePerHour}/h
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className={cn("sticky z-20 bg-card align-top", CONFIDENCE_COL_WIDTH, LINE_COL_LEFT_OFFSET)}>
        <select
          className={selectClass}
          aria-label={`Confidence for ${line.label}`}
          value={line.confidence}
          onChange={(e) => onCommit({ confidence: e.target.value as Confidence })}
        >
          {CONFIDENCE_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </TableCell>
      {periods.map((period) => (
        <TableCell key={period} className="align-top">
          {isSalary ? (
            <NumberCell
              id={`${line.id}-${period}`}
              label={`${line.label} hours in ${period}`}
              value={line.hoursPerPeriod[period] ?? 0}
              step={5}
              onChange={(v) =>
                onUpdateLocal({ hoursPerPeriod: { ...line.hoursPerPeriod, [period]: v } })
              }
              onCommit={(v) =>
                onCommit({ hoursPerPeriod: { ...line.hoursPerPeriod, [period]: v } })
              }
            />
          ) : (
            <NumberCell
              id={`${line.id}-${period}`}
              label={`${line.label} amount in ${period}`}
              value={line.valuesPerPeriod[period] ?? 0}
              step={line.valuesPerPeriod[period] > 0 ? Math.round(line.valuesPerPeriod[period] * 0.1) || 100 : 100}
              onChange={(v) =>
                onUpdateLocal({ valuesPerPeriod: { ...line.valuesPerPeriod, [period]: v } })
              }
              onCommit={(v) =>
                onCommit({ valuesPerPeriod: { ...line.valuesPerPeriod, [period]: v } })
              }
            />
          )}
        </TableCell>
      ))}
      <TableCell className="align-top">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove ${line.label}`}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function AddCostLineForm({
  periods,
  onAdd,
}: {
  periods: string[];
  onAdd: (line: CostLineItem) => void;
}) {
  const formId = useId();
  const { config } = useEffectiveConfig();
  const [category, setCategory] = useState<"salary" | DirectCostCategory>("consultancy");
  const [label, setLabel] = useState("");
  const [role, setRole] = useState(config.rateCard[0]?.role ?? "");
  const [ratePerHour, setRatePerHour] = useState(String(config.rateCard[0]?.ratePerHour ?? 0));
  const [confidence, setConfidence] = useState<Confidence>("estimated");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;

    const zeroedPeriods = Object.fromEntries(periods.map((p) => [p, 0]));
    const id = `${category}-${Date.now()}`;

    if (category === "salary") {
      onAdd({
        id,
        category: "salary",
        label: label.trim(),
        role,
        hoursPerPeriod: zeroedPeriods,
        ratePerHour: Number(ratePerHour),
        confidence,
      });
    } else {
      onAdd({
        id,
        category,
        label: label.trim(),
        valuesPerPeriod: zeroedPeriods,
        confidence,
      });
    }
    setLabel("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${formId}-category`}>Category</Label>
        <select
          id={`${formId}-category`}
          className={selectClass}
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
        >
          <option value="salary">Salary</option>
          {DIRECT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c] ?? c}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${formId}-label`}>Label</Label>
        <Input id={`${formId}-label`} value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      {category === "salary" && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-role`}>Role</Label>
            <select
              id={`${formId}-role`}
              className={selectClass}
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                const rate = config.rateCard.find((r) => r.role === e.target.value)?.ratePerHour;
                if (rate !== undefined) setRatePerHour(String(rate));
              }}
            >
              {config.rateCard.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.role}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-rate`}>Rate/hour</Label>
            <Input
              id={`${formId}-rate`}
              type="number"
              min="0"
              className="w-24"
              value={ratePerHour}
              onChange={(e) => setRatePerHour(e.target.value)}
            />
          </div>
        </>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${formId}-confidence`}>Confidence</Label>
        <select
          id={`${formId}-confidence`}
          className={selectClass}
          value={confidence}
          onChange={(e) => setConfidence(e.target.value as Confidence)}
        >
          {CONFIDENCE_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit">Add line</Button>
    </form>
  );
}

function RevenueSection({
  project,
  periods,
  onLocalChange,
  onCommit,
}: {
  project: Project;
  periods: string[];
  onLocalChange: (next: Project) => void;
  onCommit: (next: Project) => void | Promise<void>;
}) {
  const model = project.pricingModel;
  if (!model) return null;

  if (model.type === "fixed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue — fixed price</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {model.amount.toLocaleString()} {project.currency},{" "}
          {model.allocation.type === "even"
            ? "recognized evenly across the lifetime"
            : model.allocation.type === "at_period"
              ? `recognized entirely at ${model.allocation.period}`
              : "custom per-period allocation"}
          , confidence: {model.confidence}. Edit via the setup wizard or a snapshot import.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue — hourly</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hourlyRate">Rate/hour ({project.currency})</Label>
            <Input
              id="hourlyRate"
              type="number"
              min="0"
              className="w-28"
              value={model.ratePerHour}
              onChange={(e) =>
                onLocalChange({
                  ...project,
                  pricingModel: { ...model, ratePerHour: e.target.valueAsNumber || 0 },
                })
              }
              onBlur={(e) =>
                void onCommit({
                  ...project,
                  pricingModel: { ...model, ratePerHour: e.target.valueAsNumber || 0 },
                })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hourlyConfidence">Confidence</Label>
            <select
              id="hourlyConfidence"
              className={selectClass}
              value={model.confidence}
              onChange={(e) =>
                void onCommit({
                  ...project,
                  pricingModel: { ...model, confidence: e.target.value as Confidence },
                })
              }
            >
              {CONFIDENCE_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Table containerClassName="scrollbar-always-visible">
          <TableHeader>
            <TableRow>
              {periods.map((p) => (
                <TableHead key={p}>{p}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              {periods.map((period) => (
                <TableCell key={period}>
                  <NumberCell
                    id={`revenue-hours-${period}`}
                    label={`Billable hours in ${period}`}
                    value={model.hoursPerPeriod[period] ?? 0}
                    step={5}
                    onChange={(v) =>
                      onLocalChange({
                        ...project,
                        pricingModel: {
                          ...model,
                          hoursPerPeriod: { ...model.hoursPerPeriod, [period]: v },
                        },
                      })
                    }
                    onCommit={(v) =>
                      void onCommit({
                        ...project,
                        pricingModel: {
                          ...model,
                          hoursPerPeriod: { ...model.hoursPerPeriod, [period]: v },
                        },
                      })
                    }
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
