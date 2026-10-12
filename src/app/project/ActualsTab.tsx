"use client";

import { useEffect, useId, useRef, useState } from "react";
import { TriangleAlert, CircleCheck, Trash2 } from "lucide-react";
import { getStorage } from "../_lib/storage";
import { activeConfig } from "../_lib/activeConfig";
import { mergeMapping } from "../_lib/categoryMapping";
import { formatCurrency } from "../_lib/format";
import { isFuturePeriod } from "../_lib/overdue";
import { parseActualsFile, type ActualsImportResult } from "@/import/actuals";
import { projectPeriods } from "@/engine/periodize";
import type { Project } from "@/engine/model";
import type { CategoryMappingOverride, StoredActualEntry } from "@/storage/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { selectClass, CATEGORY_LABEL } from "./shared";
import { previewClosePeriods } from "./closePeriodPreview";
import { joinSentences, useUndoQueue } from "./UndoQueue";

export function ActualsTab({
  project,
  actuals,
  onActualsChanged,
  onProjectChanged,
  readOnly = false,
}: {
  project: Project;
  actuals: StoredActualEntry[];
  onActualsChanged: () => void;
  /** Resolves `true` once the change is saved. */
  onProjectChanged: (next: Project) => Promise<boolean>;
  readOnly?: boolean;
}) {
  return (
    <fieldset disabled={readOnly} className="flex flex-col gap-6 border-0 p-0 m-0 min-w-0">
      {readOnly && (
        <p className="rounded-md border bg-muted px-4 py-2 text-sm text-muted-foreground">
          Viewer role — read only. Switch to Planner to import or record actuals.
        </p>
      )}
      <ClosedPeriodsCard project={project} actuals={actuals} onChanged={onProjectChanged} readOnly={readOnly} />
      <ImportCard project={project} onCommitted={onActualsChanged} />
      <ManualEntryCard project={project} onAdded={onActualsChanged} />
      <RecordedActualsCard project={project} actuals={actuals} onDeleted={onActualsChanged} />
    </fieldset>
  );
}

const NOT_CLOSED = "__not_closed__";

/** "2026-03" or "2026-03–2026-05" — the span a run of contiguous periods covers. */
function periodSpan(periods: string[]) {
  return periods.length === 1 ? periods[0] : `${periods[0]}–${periods.at(-1)}`;
}

/** Planner control for closing periods contiguously from the project start (QA-ROUND-2-PLAN.md
 * D1/D3). A single "close through" selector both closes forward and reopens backward — picking an
 * earlier period than the current close point shrinks `closedPeriods` back to it, which is exactly
 * "reopen". Picking only stages the change: the preview names every period that switches, warns
 * about periods closing with nothing recorded, and nothing is saved until Apply
 * (DASHBOARD-CRITIQUE-PLAN.md Phase 1a — arrowing through the select used to save per keypress). */
function ClosedPeriodsCard({
  project,
  actuals,
  onChanged,
  readOnly,
}: {
  project: Project;
  actuals: StoredActualEntry[];
  onChanged: (next: Project) => Promise<boolean>;
  readOnly: boolean;
}) {
  const formId = useId();
  const periods = projectPeriods(project);
  const closedThroughIndex = project.closedPeriods.length - 1;
  const closedThroughPeriod = closedThroughIndex >= 0 ? periods[closedThroughIndex] : null;
  const savedValue = closedThroughPeriod ?? NOT_CLOSED;
  // A period that hasn't started has nothing to record; closing it would count its cost as zero
  // and make the project look under budget.
  const today = new Date();
  const future = new Set(periods.filter((p) => isFuturePeriod(project.periodization, p, today)));

  const [pick, setPick] = useState<string | null>(null);
  const [confirmedEmpty, setConfirmedEmpty] = useState(false);
  const [applying, setApplying] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const preview =
    pick === null || pick === savedValue
      ? null
      : previewClosePeriods(periods, project.closedPeriods, pick === NOT_CLOSED ? null : pick, actuals);
  const closing = new Set(preview?.closing.map((c) => c.period));
  const reopening = new Set(preview?.reopening);
  const needsConfirm = (preview?.closingWithoutCost.length ?? 0) > 0;
  const isCustomer = project.type === "customer";

  function handlePick(value: string) {
    setPick(value === savedValue ? null : value);
    setConfirmedEmpty(false);
    setSavedMessage(null);
  }

  function handleCancel() {
    setPick(null);
    setConfirmedEmpty(false);
  }

  async function handleApply() {
    if (!preview || (needsConfirm && !confirmedEmpty)) return;
    if (preview.nextClosedPeriods.some((p) => future.has(p))) return;
    setApplying(true);
    const boundary = preview.nextClosedPeriods.at(-1);
    const saved = await onChanged({ ...project, closedPeriods: preview.nextClosedPeriods });
    setApplying(false);
    if (!saved) return; // the page-level alert names the storage error
    setPick(null);
    setConfirmedEmpty(false);
    setSavedMessage(
      boundary
        ? `Saved. Actuals through ${boundary}; later periods are projected.`
        : "Saved. Nothing closed; every period is projected.",
    );
  }

  const applyLabel = !preview
    ? ""
    : preview.closing.length > 0
      ? `Close through ${pick}`
      : `Reopen ${periodSpan(preview.reopening)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Closed periods</CardTitle>
        <CardDescription>
          Closed periods use recorded actuals instead of projections. Closing is contiguous from
          the project start — you can&apos;t close a later period while an earlier one is still
          open.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {readOnly ? (
          <p className="text-sm">
            {closedThroughPeriod
              ? `Closed through ${closedThroughPeriod}.`
              : "Nothing closed — all periods are projected."}
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-close-through`}>Close periods through</Label>
            <select
              id={`${formId}-close-through`}
              className={cn(selectClass, "w-fit")}
              value={pick ?? savedValue}
              disabled={applying}
              aria-describedby={`${formId}-close-hint`}
              onChange={(e) => handlePick(e.target.value)}
            >
              <option value={NOT_CLOSED}>Not closed</option>
              {periods.map((p) => (
                <option key={p} value={p} disabled={future.has(p)}>
                  {future.has(p) ? `${p} (not started)` : p}
                </option>
              ))}
            </select>
            <p id={`${formId}-close-hint`} className="text-xs text-muted-foreground">
              Pick an earlier period to reopen back to it. Nothing is saved until you apply.
              {future.size > 0 && " Periods that haven't started yet can't be closed."}
            </p>
          </div>
        )}

        {preview && (
          <section
            aria-labelledby={`${formId}-preview-title`}
            className="flex flex-col gap-3 rounded-lg border p-4 text-sm"
          >
            <h3 id={`${formId}-preview-title`} className="font-medium">
              Unsaved change
            </h3>
            {preview.closing.length > 0 && (
              <div className="flex flex-col gap-1">
                <p>These periods switch from projections to recorded actuals:</p>
                <ul className="flex flex-col gap-0.5">
                  {preview.closing.map((c) => (
                    <li key={c.period} className="tabular-nums">
                      <span className="font-medium">{c.period}</span>
                      <span className="text-muted-foreground">
                        {" — "}
                        {c.hasCost ? "cost recorded" : "no cost recorded"}
                        {isCustomer &&
                          (c.hasRevenue ? ", revenue recorded" : ", planned revenue kept")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {preview.reopening.length > 0 && (
              <p>
                <span className="font-medium whitespace-nowrap">{periodSpan(preview.reopening)}</span>{" "}
                {preview.reopening.length === 1 ? "goes" : "go"} back to projections. Recorded
                actuals stay saved and count again if you close{" "}
                {preview.reopening.length === 1 ? "it" : "them"} later.
              </p>
            )}

            {needsConfirm && (
              <div className="flex flex-col gap-2 rounded-md border border-[var(--viz-warning-border)] bg-[var(--viz-warning-bg)] p-3">
                <p className="flex gap-2">
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--viz-status-warning)]" />
                  <span>
                    <span className="font-medium">
                      {preview.closingWithoutCost.map((p, i) => (
                        <span key={p} className="whitespace-nowrap">
                          {p}
                          {i < preview.closingWithoutCost.length - 1 ? ", " : ""}
                        </span>
                      ))}{" "}
                      {preview.closingWithoutCost.length === 1 ? "has" : "have"} no cost actuals.
                    </span>{" "}
                    Closed, {preview.closingWithoutCost.length === 1 ? "its" : "their"} cost will
                    count as 0{isCustomer ? " (planned revenue is kept)" : ""}. Import or enter
                    actuals first, or confirm below.
                  </span>
                </p>
                <label className="flex items-start gap-2 pl-6">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={confirmedEmpty}
                    onChange={(e) => setConfirmedEmpty(e.target.checked)}
                  />
                  <span>
                    Close anyway and count{" "}
                    <span className="whitespace-nowrap">{periodSpan(preview.closingWithoutCost)}</span>{" "}
                    cost as zero
                  </span>
                </label>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                disabled={applying || (needsConfirm && !confirmedEmpty)}
                onClick={() => void handleApply()}
              >
                {applying ? "Saving…" : applyLabel}
              </Button>
              <Button type="button" variant="ghost" disabled={applying} onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </section>
        )}

        <p role="status" className="flex items-start gap-2 text-sm empty:hidden">
          {savedMessage && (
            <>
              <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--viz-status-good)]" />
              {savedMessage}
            </>
          )}
        </p>

        <Table stickyFirstColumn>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actual cost</TableHead>
              <TableHead>Actual revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((p, index) => {
              const { hasCost, hasRevenue } = summaryFor(actuals, p);
              const isClosed = index <= closedThroughIndex;
              return (
                <TableRow key={p}>
                  <TableCell>{p}</TableCell>
                  <TableCell>
                    {closing.has(p) ? (
                      <span className="font-medium">Open → Closed</span>
                    ) : reopening.has(p) ? (
                      <span className="font-medium">Closed → Open</span>
                    ) : isClosed ? (
                      "Closed"
                    ) : (
                      "Open"
                    )}
                  </TableCell>
                  <TableCell>{hasCost ? "Yes" : "No"}</TableCell>
                  <TableCell>{hasRevenue ? "Yes" : "No"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function summaryFor(actuals: StoredActualEntry[], period: string) {
  const forPeriod = actuals.filter((a) => a.period === period);
  return {
    hasCost: forPeriod.some((a) => a.category !== "revenue"),
    hasRevenue: forPeriod.some((a) => a.category === "revenue"),
  };
}

function useEffectiveMapping() {
  const [overrides, setOverrides] = useState<CategoryMappingOverride[] | null>(null);

  useEffect(() => {
    let ignore = false;
    void getStorage()
      .listCategoryMappingOverrides()
      .then((result) => {
        if (!ignore) setOverrides(result);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const mapping = mergeMapping(activeConfig.categoryMapping, overrides ?? []);

  async function addOverride(accountCode: string, category: string) {
    await getStorage().saveCategoryMappingOverride({ accountCode, category });
    setOverrides((prev) => [...(prev ?? []).filter((o) => o.accountCode !== accountCode), { accountCode, category }]);
  }

  return { mapping, ready: overrides !== null, addOverride };
}

function ImportCard({ project, onCommitted }: { project: Project; onCommitted: () => void }) {
  const { mapping, ready, addOverride } = useEffectiveMapping();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);
  const [result, setResult] = useState<ActualsImportResult | null>(null);
  const [importValidOnly, setImportValidOnly] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [committedMessage, setCommittedMessage] = useState<string | null>(null);

  async function handleFile(file: File) {
    const text = await file.text();
    setFileName(file.name);
    setFileText(text);
    setCommittedMessage(null);
    setResult(parseActualsFile(file.name, text, mapping));
    setImportValidOnly(false);
    setCommitError(null);
  }

  async function handleResolve(accountCode: string, category: string) {
    await addOverride(accountCode, category);
    if (fileText && fileName) {
      const nextMapping = mergeMapping(mapping, [{ accountCode, category }]);
      setResult(parseActualsFile(fileName, fileText, nextMapping));
    }
  }

  const hasIssues = (result?.rejected.length ?? 0) > 0 || (result?.unmapped.length ?? 0) > 0;
  const canCommit = result !== null && result.accepted.length > 0 && (!hasIssues || importValidOnly);

  async function handleCommit() {
    if (!result || !fileName) return;
    setCommitting(true);
    setCommitError(null);
    setCommittedMessage(null);
    try {
      const entries: StoredActualEntry[] = result.accepted.map((row) => ({
        id: crypto.randomUUID(),
        projectId: project.id,
        period: row.period,
        category: row.category,
        amount: row.amount,
        description: row.description,
        source: "csv",
        sourceFile: fileName,
        sourceRow: row.rowNumber,
      }));
      await getStorage().saveActuals(entries);
      const closedTouched = [...new Set(entries.map((e) => e.period))]
        .filter((period) => project.closedPeriods.includes(period))
        .sort();
      setCommittedMessage(
        joinSentences(
          `Saved ${entries.length} row${entries.length === 1 ? "" : "s"} from ${fileName}.`,
          closedTouched.length === 0
            ? null
            : `${closedTouched.join(", ")} ${closedTouched.length === 1 ? "is" : "are"} closed, so the dashboard headline changed.`,
        ),
      );
      setFileName(null);
      setFileText(null);
      setResult(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onCommitted();
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : "Failed to save actuals");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import actuals</CardTitle>
        <CardDescription>
          Upload a monthly actuals CSV from accounting. Nothing is saved until you commit.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={!ready}
            onClick={() => fileInputRef.current?.click()}
          >
            Choose file <span className="text-xs text-muted-foreground">(.csv)</span>
          </Button>
          <span className="text-sm text-muted-foreground">
            {fileName ?? "No file chosen"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            aria-label="Actuals CSV file"
            disabled={!ready}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </div>

        <p role="status" className="flex items-start gap-2 text-sm empty:hidden">
          {committedMessage && (
            <>
              <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--viz-status-good)]" />
              {committedMessage}
            </>
          )}
        </p>

        {result && (
          <div className="flex flex-col gap-4 rounded-lg border p-4">
            <div className="text-sm">
              <p>
                <span className="font-medium">{result.file}</span> — detected{" "}
                <span className="font-mono text-xs">
                  {result.convention.delimiter === ";" ? "semicolon" : "comma"}-delimited, decimal{" "}
                  {result.convention.decimal === "," ? "comma" : "point"}
                </span>
              </p>
              <p className="text-muted-foreground">
                {result.totalDataRows} rows: {result.accepted.length} accepted, {result.rejected.length}{" "}
                rejected, {result.ignored} ignored
              </p>
            </div>

            {Object.keys(result.totalsByCategory).length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium">Totals by category</p>
                <ul className="text-sm text-muted-foreground">
                  {Object.entries(result.totalsByCategory).map(([category, total]) => (
                    <li key={category}>
                      {CATEGORY_LABEL[category] ?? category}:{" "}
                      {formatCurrency(total, project.currency, project.displayUnits)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.unmapped.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium">Unmapped account codes</p>
                <ul className="flex flex-col gap-2">
                  {result.unmapped.map((u) => (
                    <li key={u.accountCode} className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-xs">{u.accountCode}</span>
                      <span className="text-muted-foreground">
                        &quot;{u.sampleDescription}&quot; ({u.rowNumbers.length}{" "}
                        {u.rowNumbers.length === 1 ? "row" : "rows"})
                      </span>
                      <select
                        className={selectClass}
                        aria-label={`Category for account code ${u.accountCode}`}
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) void handleResolve(u.accountCode, e.target.value);
                        }}
                      >
                        <option value="" disabled>
                          Assign category…
                        </option>
                        {activeConfig.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                        <option value="ignore">Ignore (not a project cost)</option>
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.rejected.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium">Rejected rows</p>
                <ul role="alert" className="flex flex-col gap-1 text-sm text-destructive">
                  {result.rejected.map((r) => (
                    <li key={r.rowNumber} className="font-mono text-xs">
                      {r.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {hasIssues && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={importValidOnly}
                  onChange={(e) => setImportValidOnly(e.target.checked)}
                />
                Import valid rows only — the rows above stay rejected/unmapped and won&apos;t be
                saved
              </label>
            )}

            {commitError && <p className="text-sm text-destructive">{commitError}</p>}

            <Button type="button" disabled={!canCommit || committing} onClick={() => void handleCommit()} className="w-fit">
              {committing ? "Saving…" : `Commit ${result.accepted.length} row${result.accepted.length === 1 ? "" : "s"}`}
            </Button>
            {!hasIssues ? null : !importValidOnly ? (
              <p className="text-xs text-muted-foreground">
                This file has rejected or unmapped rows — resolve them above, or check &quot;import
                valid rows only&quot; to commit just the clean rows.
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ManualEntryCard({ project, onAdded }: { project: Project; onAdded: () => void }) {
  const formId = useId();
  const periods = projectPeriods(project);
  const [period, setPeriod] = useState(periods[0] ?? "");
  const [category, setCategory] = useState(activeConfig.categories[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || !description.trim()) return;

    setSaving(true);
    setMessage(null);
    try {
      const entry: StoredActualEntry = {
        id: crypto.randomUUID(),
        projectId: project.id,
        period,
        category,
        amount: amountNumber,
        description: description.trim(),
        source: "manual",
      };
      await getStorage().saveActuals([entry]);
      setAmount("");
      setDescription("");
      setMessage({
        text: joinSentences(
          `Added ${describeEntry(entry, project.currency)}.`,
          closedPeriodConsequence(project, entry.period),
        ),
      });
      onAdded();
    } catch (err) {
      setMessage({
        text: `Couldn't add the actual: ${err instanceof Error ? err.message : "storage error"}`,
        error: true,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enter an actual manually</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-period`}>Period</Label>
            <select
              id={`${formId}-period`}
              className={selectClass}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              {periods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-category`}>Category</Label>
            <select
              id={`${formId}-category`}
              className={selectClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {activeConfig.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-amount`}>Amount ({project.currency})</Label>
            <Input
              id={`${formId}-amount`}
              type="number"
              min="0"
              className="w-32"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-description`}>Description</Label>
            <Input
              id={`${formId}-description`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Add actual"}
          </Button>
        </form>
        <p role="status" className="mt-3 flex items-start gap-2 text-sm empty:hidden">
          {message && !message.error && (
            <>
              <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--viz-status-good)]" />
              {message.text}
            </>
          )}
        </p>
        {message?.error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Period · category · amount · description — specific enough to tell two rows apart in a
 * screen-reader button label or an undo message. */
function describeEntry(entry: StoredActualEntry, currency: string) {
  return [
    entry.period,
    CATEGORY_LABEL[entry.category] ?? entry.category,
    formatCurrency(entry.amount, currency, "whole"),
    entry.description,
  ].join(" · ");
}

/** A closed period's cost is its recorded actuals, so adding, deleting or restoring one there moves
 * the dashboard's figures; say so rather than let the headline change silently. */
function closedPeriodConsequence(project: Project, period: string) {
  return project.closedPeriods.includes(period)
    ? `${period} is closed, so the dashboard headline changed.`
    : null;
}

/** Recorded actuals with one-click delete. Each delete is saved immediately but stays undoable
 * (`useUndoQueue`); Undo writes the same entry (same id) back through the StorageAdapter
 * (DASHBOARD-CRITIQUE-PLAN.md Phase 1b). */
function RecordedActualsCard({
  project,
  actuals,
  onDeleted,
}: {
  project: Project;
  actuals: StoredActualEntry[];
  onDeleted: () => void;
}) {
  const sorted = [...actuals].sort((a, b) => a.period.localeCompare(b.period));
  const undoQueue = useUndoQueue<StoredActualEntry>({
    describe: (entry) => describeEntry(entry, project.currency),
    consequence: (entry) => closedPeriodConsequence(project, entry.period),
    restore: async (entry) => {
      await getStorage().saveActuals([entry]);
      onDeleted();
    },
  });

  function handleDelete(entry: StoredActualEntry) {
    void undoQueue.remove(entry, async () => {
      await getStorage().deleteActual(entry.id);
      onDeleted();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recorded actuals</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {undoQueue.panel}

        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No actuals recorded yet.</p>
        ) : (
          <Table stickyFirstColumn stickyLastColumn>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>
                  <span className="sr-only">Delete</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.period}</TableCell>
                  <TableCell>{CATEGORY_LABEL[entry.category] ?? entry.category}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(entry.amount, project.currency, "whole")}
                  </TableCell>
                  <TableCell className="min-w-48 whitespace-normal text-muted-foreground">{entry.description}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.source === "csv" ? `${entry.sourceFile} (row ${entry.sourceRow})` : "manual"}
                  </TableCell>
                  {/* Delete stays in view at the right edge while the row scrolls on a phone. */}
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={undoQueue.isBusy(entry.id)}
                      aria-label={`Delete actual: ${describeEntry(entry, project.currency)}`}
                      onClick={() => handleDelete(entry)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
