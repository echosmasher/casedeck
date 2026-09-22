"use client";

// Global rate-card / loaded-cost-multiplier / confidence-band overrides (UI-QA-PLAN.md Phase C).
// Edits are stored as overrides in StorageAdapter, merged over the bundled
// demo/example-group.config.json at read time (same pattern as categoryMappingOverrides) — the
// bundled config file itself is never touched. Saving recomputes live everywhere because the
// engine is pure and every consumer reads the same EffectiveConfigProvider context.
import { useState } from "react";
import Link from "next/link";
import { useRole } from "../_lib/RoleProvider";
import { useEffectiveConfig } from "../_lib/EffectiveConfigProvider";
import { getStorage } from "../_lib/storage";
import type { ConfidenceBands, RateCardEntry } from "@/engine/model";
import type { SettingsOverrides } from "@/storage/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const BAND_LABEL: Record<keyof ConfidenceBands, string> = {
  committed: "Committed",
  estimated: "Estimated",
  rough: "Rough",
};

export default function SettingsPage() {
  const { role } = useRole();

  if (role === "viewer") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-destructive">
          Viewer role is read-only — switch to Planner to edit Settings.
        </p>
        <Link href="/" className="text-sm underline">
          Back to projects
        </Link>
      </div>
    );
  }

  return <SettingsForm />;
}

function SettingsForm() {
  const { config, loading, refresh } = useEffectiveConfig();
  const [initialized, setInitialized] = useState(false);
  const [rateCard, setRateCard] = useState<RateCardEntry[]>([]);
  const [loadedCostMultiplier, setLoadedCostMultiplier] = useState("");
  const [confidenceBands, setConfidenceBands] = useState<ConfidenceBands | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!loading && !initialized) {
    setRateCard(config.rateCard);
    setLoadedCostMultiplier(String(config.loadedCostMultiplier));
    setConfidenceBands(config.confidenceBands);
    setInitialized(true);
  }

  function updateRate(role: string, value: string) {
    setSaved(false);
    setRateCard((rows) => rows.map((r) => (r.role === role ? { ...r, ratePerHour: Number(value) } : r)));
  }

  function updateBand(key: keyof ConfidenceBands, value: string) {
    setSaved(false);
    setConfidenceBands((bands) => (bands ? { ...bands, [key]: { bandPct: Number(value) } } : bands));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!confidenceBands) return;
    setSaving(true);
    const overrides: SettingsOverrides = {
      rateCardOverrides: rateCard,
      loadedCostMultiplierOverride: Number(loadedCostMultiplier),
      confidenceBandOverrides: confidenceBands,
    };
    await getStorage().saveSettingsOverrides(overrides);
    await refresh();
    setSaving(false);
    setSaved(true);
  }

  if (!initialized || !confidenceBands) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Rate card, loaded-cost multiplier, and confidence bands. Changes apply immediately to
          every project — there are no historical rate snapshots.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rate card</CardTitle>
          <CardDescription>Rate per hour, by role. Used for salary cost lines.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {rateCard.map((entry) => (
            <div key={entry.role} className="grid grid-cols-2 items-center gap-3 sm:max-w-sm">
              <Label htmlFor={`rate-${entry.role}`}>{entry.role}</Label>
              <Input
                id={`rate-${entry.role}`}
                type="number"
                min="0"
                step="1"
                className="tabular-nums"
                value={entry.ratePerHour}
                onChange={(e) => updateRate(entry.role, e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Loaded-cost multiplier</CardTitle>
          <CardDescription>
            Applied to salary cost lines to approximate fully loaded cost (overhead, benefits).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <Label htmlFor="loadedCostMultiplier">Multiplier</Label>
            <Input
              id="loadedCostMultiplier"
              type="number"
              min="0"
              step="0.01"
              className="tabular-nums"
              value={loadedCostMultiplier}
              onChange={(e) => {
                setSaved(false);
                setLoadedCostMultiplier(e.target.value);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Confidence bands</CardTitle>
          <CardDescription>
            Best/worst-case percentage spread applied around the expected value, by confidence
            level.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(Object.keys(confidenceBands) as (keyof ConfidenceBands)[]).map((key) => (
            <div key={key} className="grid grid-cols-2 items-center gap-3 sm:max-w-sm">
              <Label htmlFor={`band-${key}`}>{BAND_LABEL[key]}</Label>
              <div className="flex items-center gap-1.5">
                <Input
                  id={`band-${key}`}
                  type="number"
                  min="0"
                  step="1"
                  className="tabular-nums"
                  value={confidenceBands[key].bandPct}
                  onChange={(e) => updateBand(key, e.target.value)}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        {saved && <p className="text-sm text-muted-foreground">Saved.</p>}
      </div>
    </form>
  );
}
