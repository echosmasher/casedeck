"use client";

import { useEffect, useRef, useState } from "react";
import { useEffectiveConfig } from "../_lib/EffectiveConfigProvider";
import { downloadTextFile } from "../_lib/download";
import { fieldLabel } from "../_lib/fieldLabel";
import { renderBusinessCase, type BusinessCaseResult } from "@/export/businessCase";
import { validateProjectInvariants, type ModelValidationError } from "@/engine/validate";
import type { ActualEntry, ConfidenceBands, Project } from "@/engine/model";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/** Commentary typed on the Export tab. Held by the page, not this tab, so switching tabs (which
 * unmounts the panel) doesn't wipe a draft. */
export interface ExportDraft {
  executiveSummary: string;
  riskCommentary: string;
}

export const EMPTY_EXPORT_DRAFT: ExportDraft = { executiveSummary: "", riskCommentary: "" };

/** How long typing must pause before the preview re-renders, so the frame doesn't reload per key. */
const PREVIEW_DELAY_MS = 300;

/** One rendered export plus the inputs it was rendered from. The preview shows `result.html` and
 * Download saves that same string, so what you see is byte-for-byte what you send. */
interface RenderedExport {
  project: Project;
  actuals: ActualEntry[];
  bands: ConfidenceBands;
  draft: ExportDraft;
  result: BusinessCaseResult;
}

function renderExport(project: Project, actuals: ActualEntry[], bands: ConfidenceBands, draft: ExportDraft): RenderedExport {
  const result = renderBusinessCase({
    project,
    bands,
    actuals,
    executiveSummary: draft.executiveSummary.trim() || undefined,
    riskCommentary: draft.riskCommentary.trim() || undefined,
    generatedAt: new Date(),
  });
  return { project, actuals, bands, draft, result };
}

function exportFileName(project: Project): string {
  const slugify = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return `${slugify(project.code)}-${slugify(project.name)}-business-case.html`;
}

export function ExportTab({
  project,
  actuals,
  draft,
  onDraftChange,
}: {
  project: Project;
  actuals: ActualEntry[];
  draft: ExportDraft;
  onDraftChange: (next: ExportDraft) => void;
}) {
  const { config } = useEffectiveConfig();
  const bands = config.confidenceBands;
  const { executiveSummary, riskCommentary } = draft;
  const [errors, setErrors] = useState<ModelValidationError[] | null>(null);
  const [rendered, setRendered] = useState(() => renderExport(project, actuals, bands, draft));

  const liveErrors = validateProjectInvariants(project);
  const fileName = exportFileName(project);
  const isCurrent =
    rendered.project === project && rendered.actuals === actuals && rendered.bands === bands && rendered.draft === draft;

  useEffect(() => {
    if (isCurrent) return;
    const timer = setTimeout(() => setRendered(renderExport(project, actuals, bands, draft)), PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isCurrent, project, actuals, bands, draft]);

  function handleDownload() {
    // A click inside the typing pause renders now, and the preview catches up to the same string.
    const latest = isCurrent ? rendered : renderExport(project, actuals, bands, draft);
    if (latest !== rendered) setRendered(latest);

    if (!latest.result.ok) {
      setErrors(latest.result.errors);
      return;
    }
    setErrors(null);
    downloadTextFile(fileName, latest.result.html, "text/html");
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Business case export</CardTitle>
          <CardDescription>
            A single self-contained HTML file — opens offline, from an email attachment, or from
            file:// with no network. Print it for a PDF. It carries the scenario summary and
            confidence bands, both charts, per-period detail, cost by category
            {actuals.length > 0 ? ", budget vs. actual" : ""} and your assumptions.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {liveErrors.length > 0 && (
            <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-medium">This project can&apos;t be exported yet — fix these on the Inputs tab:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {liveErrors.map((e) => (
                  <li key={`${e.field}-${e.message}`}>
                    <span className="font-medium">{fieldLabel(e.field, project)}</span>: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="executiveSummary">Executive summary (optional)</Label>
            <Textarea
              id="executiveSummary"
              rows={4}
              placeholder="Two or three sentences for whoever approves the budget: what the project is, and what its range of outcomes means for the decision."
              value={executiveSummary}
              onChange={(e) => onDraftChange({ ...draft, executiveSummary: e.target.value })}
            />
          </div>

          {actuals.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="riskCommentary">Risk / variance commentary (optional)</Label>
              <Textarea
                id="riskCommentary"
                rows={3}
                placeholder="Commentary on the budget-vs-actual picture, if any category needs explaining."
                value={riskCommentary}
                onChange={(e) => onDraftChange({ ...draft, riskCommentary: e.target.value })}
              />
            </div>
          )}

          {errors && errors.length > 0 && (
            <p role="alert" className="text-sm text-destructive">
              Export refused — the project failed validation. See the list above.
            </p>
          )}

          <Button type="button" disabled={liveErrors.length > 0} onClick={handleDownload} className="w-fit">
            Download business case <span className="text-xs opacity-80">(.html)</span>
          </Button>
        </CardContent>
      </Card>

      {liveErrors.length === 0 && rendered.result.ok && (
        <ExportPreview fileName={fileName} html={rendered.result.html} />
      )}
    </div>
  );
}

/** The export file itself, at full size. Sandboxed with no scripts (the export has none);
 * same-origin only so the frame can be sized to its document instead of scrolling inside the page. */
function ExportPreview({ fileName, html }: { fileName: string; html: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  function fitToDocument() {
    const body = frameRef.current?.contentDocument?.body;
    if (body) setHeight(body.offsetHeight);
  }

  // The document reflows when the frame's width changes (window resize, mobile), so refit then too.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(() => fitToDocument());
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <section aria-labelledby="export-preview-label" className="overflow-hidden rounded-lg border">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b bg-muted/50 px-4 py-2">
        <p id="export-preview-label" className="min-w-0 break-all font-mono text-xs text-foreground">
          {fileName}
        </p>
        <p className="text-xs text-muted-foreground">What the approver receives · updates as you type</p>
      </div>
      <iframe
        ref={frameRef}
        title={`Preview of ${fileName}`}
        srcDoc={html}
        sandbox="allow-same-origin"
        onLoad={fitToDocument}
        className="block w-full"
        style={{ height: height ?? "70vh" }}
      />
    </section>
  );
}
