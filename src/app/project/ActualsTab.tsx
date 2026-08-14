"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { getStorage } from "../_lib/storage";
import { activeConfig } from "../_lib/activeConfig";
import { mergeMapping } from "../_lib/categoryMapping";
import { formatCurrency } from "../_lib/format";
import { parseActualsFile, type ActualsImportResult } from "@/import/actuals";
import { projectPeriods } from "@/engine/periodize";
import type { Project } from "@/engine/model";
import type { CategoryMappingOverride, StoredActualEntry } from "@/storage/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { selectClass, CATEGORY_LABEL } from "./shared";

export function ActualsTab({
  project,
  actuals,
  onActualsChanged,
}: {
  project: Project;
  actuals: StoredActualEntry[];
  onActualsChanged: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <ImportCard project={project} onCommitted={onActualsChanged} />
      <ManualEntryCard project={project} onAdded={onActualsChanged} />
      <RecordedActualsCard actuals={actuals} onDeleted={onActualsChanged} />
    </div>
  );
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

  async function handleFile(file: File) {
    const text = await file.text();
    setFileName(file.name);
    setFileText(text);
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
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          disabled={!ready}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || !description.trim()) return;

    setSaving(true);
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
      onAdded();
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
      </CardContent>
    </Card>
  );
}

function RecordedActualsCard({
  actuals,
  onDeleted,
}: {
  actuals: StoredActualEntry[];
  onDeleted: () => void;
}) {
  const sorted = [...actuals].sort((a, b) => a.period.localeCompare(b.period));

  async function handleDelete(id: string) {
    await getStorage().deleteActual(id);
    onDeleted();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recorded actuals</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No actuals recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Source</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.period}</TableCell>
                  <TableCell>{CATEGORY_LABEL[entry.category] ?? entry.category}</TableCell>
                  <TableCell className="tabular-nums">{entry.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.description}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.source === "csv" ? `${entry.sourceFile} (row ${entry.sourceRow})` : "manual"}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete actual entry for ${entry.period}`}
                      onClick={() => void handleDelete(entry.id)}
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
