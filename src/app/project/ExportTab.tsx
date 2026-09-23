"use client";

import { useState } from "react";
import { useEffectiveConfig } from "../_lib/EffectiveConfigProvider";
import { downloadTextFile } from "../_lib/download";
import { renderBusinessCase } from "@/export/businessCase";
import { validateProjectInvariants, type ModelValidationError } from "@/engine/validate";
import type { ActualEntry, Project } from "@/engine/model";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function ExportTab({ project, actuals }: { project: Project; actuals: ActualEntry[] }) {
  const { config } = useEffectiveConfig();
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [riskCommentary, setRiskCommentary] = useState("");
  const [errors, setErrors] = useState<ModelValidationError[] | null>(null);

  const liveErrors = validateProjectInvariants(project);

  function handleDownload() {
    const result = renderBusinessCase({
      project,
      bands: config.confidenceBands,
      actuals,
      executiveSummary: executiveSummary.trim() || undefined,
      riskCommentary: riskCommentary.trim() || undefined,
      generatedAt: new Date(),
    });

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors(null);
    const fileName = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-business-case.html`;
    downloadTextFile(fileName, result.html, "text/html");
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Business case export</CardTitle>
          <CardDescription>
            A single self-contained HTML file — opens offline, from an email attachment, or from
            file:// with no network. Print it for a PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {liveErrors.length > 0 && (
            <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-medium">This project can&apos;t be exported yet — fix these on the Inputs tab:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {liveErrors.map((e) => (
                  <li key={`${e.field}-${e.message}`}>
                    <span className="font-mono text-xs">{e.field}</span>: {e.message}
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
              placeholder="Paste narrative drafted by the /business-case skill, or write your own."
              value={executiveSummary}
              onChange={(e) => setExecutiveSummary(e.target.value)}
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
                onChange={(e) => setRiskCommentary(e.target.value)}
              />
            </div>
          )}

          {errors && errors.length > 0 && (
            <p role="alert" className="text-sm text-destructive">
              Export refused — the project failed validation. See the list above.
            </p>
          )}

          <Button type="button" disabled={liveErrors.length > 0} onClick={handleDownload} className="w-fit">
            Download business case <span className="text-xs text-muted-foreground">(.html)</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
