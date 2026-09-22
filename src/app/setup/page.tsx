"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getStorage } from "../_lib/storage";
import { useRole } from "../_lib/RoleProvider";
import { activeConfig } from "../_lib/activeConfig";
import { useEffectiveConfig } from "../_lib/EffectiveConfigProvider";
import { validateProjectInvariants } from "@/engine/validate";
import type {
  Allocation,
  Confidence,
  Periodization,
  PricingModel,
  Project,
  ProjectStatus,
  ProjectType,
  Stakeholder,
} from "@/engine/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const STATUS_OPTIONS: { id: ProjectStatus; label: string }[] = activeConfig.statuses;

const PERIOD_PATTERNS: Record<Periodization, RegExp> = {
  monthly: /^\d{4}-(0[1-9]|1[0-2])$/,
  quarterly: /^\d{4}-Q[1-4]$/,
  total: /^\d{4}$/,
};

const PERIOD_HINT: Record<Periodization, string> = {
  monthly: "YYYY-MM, e.g. 2026-01",
  quarterly: "YYYY-Qn, e.g. 2026-Q1",
  total: "YYYY, e.g. 2026",
};

type PricingKind = "none" | "fixed" | "hourly";
type FixedAllocationKind = "even" | "at_period";

export default function SetupPage() {
  const router = useRouter();
  const { role } = useRole();

  if (role === "viewer") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-destructive">
          Viewer role is read-only — switch to Planner to create a project.
        </p>
        <Link href="/" className="text-sm underline">
          Back to projects
        </Link>
      </div>
    );
  }

  return <SetupForm router={router} />;
}

function SetupForm({ router }: { router: ReturnType<typeof useRouter> }) {
  const { config } = useEffectiveConfig();
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("internal");
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [currency, setCurrency] = useState(activeConfig.currency);
  const [displayUnits, setDisplayUnits] = useState<"whole" | "thousands">(
    activeConfig.displayUnitsDefault,
  );
  const [periodization, setPeriodization] = useState<Periodization>("monthly");
  const [startPeriod, setStartPeriod] = useState("");
  const [endPeriod, setEndPeriod] = useState("");
  const [loadedCostMultiplier, setLoadedCostMultiplier] = useState(
    String(config.loadedCostMultiplier),
  );

  const [pricingKind, setPricingKind] = useState<PricingKind>("none");
  const [fixedAmount, setFixedAmount] = useState("");
  const [fixedAllocationKind, setFixedAllocationKind] = useState<FixedAllocationKind>("even");
  const [fixedAtPeriod, setFixedAtPeriod] = useState("");
  const [fixedConfidence, setFixedConfidence] = useState<Confidence>("estimated");
  const [hourlyRate, setHourlyRate] = useState("");
  const [hourlyConfidence, setHourlyConfidence] = useState<Confidence>("estimated");

  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [dependencies, setDependencies] = useState<string[]>([]);

  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function addStakeholder() {
    setStakeholders((rows) => [...rows, { role: "", name: "", email: "", viewer: false }]);
  }
  function updateStakeholder(index: number, patch: Partial<Stakeholder>) {
    setStakeholders((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function removeStakeholder(index: number) {
    setStakeholders((rows) => rows.filter((_, i) => i !== index));
  }

  function addDependency() {
    setDependencies((rows) => [...rows, ""]);
  }
  function updateDependency(index: number, value: string) {
    setDependencies((rows) => rows.map((row, i) => (i === index ? value : row)));
  }
  function removeDependency(index: number) {
    setDependencies((rows) => rows.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const formErrors: string[] = [];

    if (!name.trim()) formErrors.push("Name is required.");
    if (!PERIOD_PATTERNS[periodization].test(startPeriod)) {
      formErrors.push(`Start period must match ${PERIOD_HINT[periodization]}.`);
    }
    if (!PERIOD_PATTERNS[periodization].test(endPeriod)) {
      formErrors.push(`End period must match ${PERIOD_HINT[periodization]}.`);
    }
    if (type === "customer" && pricingKind === "none") {
      formErrors.push("Customer projects need a pricing model (fixed price or hourly).");
    }
    if (
      type === "customer" &&
      pricingKind === "fixed" &&
      fixedAllocationKind === "at_period" &&
      !PERIOD_PATTERNS[periodization].test(fixedAtPeriod)
    ) {
      formErrors.push(`Allocation period must match ${PERIOD_HINT[periodization]}.`);
    }

    let pricingModel: PricingModel = null;
    if (type === "customer") {
      if (pricingKind === "fixed") {
        const allocation: Allocation =
          fixedAllocationKind === "even"
            ? { type: "even" }
            : { type: "at_period", period: fixedAtPeriod };
        pricingModel = {
          type: "fixed",
          amount: Number(fixedAmount),
          allocation,
          confidence: fixedConfidence,
        };
      } else if (pricingKind === "hourly") {
        pricingModel = {
          type: "hourly",
          ratePerHour: Number(hourlyRate),
          hoursPerPeriod: {},
          confidence: hourlyConfidence,
        };
      }
    }

    if (formErrors.length > 0) {
      setErrors(formErrors);
      return;
    }

    const storage = getStorage();
    const id = await storage.nextProjectId();
    const project: Project = {
      id,
      name: name.trim(),
      type,
      status,
      currency,
      displayUnits,
      periodization,
      startPeriod,
      endPeriod,
      loadedCostMultiplier: Number(loadedCostMultiplier),
      pricingModel,
      costs: [],
      stakeholders,
      dependencies: dependencies.filter((d) => d.trim().length > 0),
    };

    const modelErrors = validateProjectInvariants(project);
    if (modelErrors.length > 0) {
      setErrors(modelErrors.map((e) => `${e.field}: ${e.message}`));
      return;
    }

    setSubmitting(true);
    await storage.saveProject(project);
    router.push(`/project?id=${id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
        <p className="text-sm text-muted-foreground">
          Set up the project&apos;s identity and timeline. Cost and revenue line items are entered
          next, on the project page.
        </p>
      </div>

      {errors.length > 0 && (
        <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <ul className="list-disc pl-4">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="name">Project name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-sm font-medium">Type</legend>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="type"
                  value="internal"
                  checked={type === "internal"}
                  onChange={() => {
                    setType("internal");
                    setPricingKind("none");
                  }}
                />
                Internal
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="type"
                  value="customer"
                  checked={type === "customer"}
                  onChange={() => setType("customer")}
                />
                Customer
              </label>
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className={selectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={currency}
              maxLength={3}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayUnits">Display units</Label>
            <select
              id="displayUnits"
              className={selectClass}
              value={displayUnits}
              onChange={(e) => setDisplayUnits(e.target.value as "whole" | "thousands")}
            >
              <option value="whole">Whole units</option>
              <option value="thousands">Thousands</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="loadedCostMultiplier">Loaded-cost multiplier</Label>
            <Input
              id="loadedCostMultiplier"
              type="number"
              step="0.01"
              min="0"
              value={loadedCostMultiplier}
              onChange={(e) => setLoadedCostMultiplier(e.target.value)}
              onBlur={(e) => {
                // The browser's native stepUp()/stepDown() (spinner arrows, arrow keys) does
                // fractional-step arithmetic in floating point and can leave a value like
                // "1.350000023841858" for a clean 1.35 — normalize on blur rather than mid-typing,
                // so this doesn't fight the user while they're entering digits.
                if (Number.isFinite(e.target.valueAsNumber)) {
                  setLoadedCostMultiplier(String(Math.round(e.target.valueAsNumber * 1e6) / 1e6));
                }
              }}
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="periodization">Periodization</Label>
            <select
              id="periodization"
              className={selectClass}
              value={periodization}
              onChange={(e) => setPeriodization(e.target.value as Periodization)}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="total">Total (single period)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="startPeriod">Start period</Label>
            <Input
              id="startPeriod"
              value={startPeriod}
              placeholder={PERIOD_HINT[periodization]}
              onChange={(e) => setStartPeriod(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="endPeriod">End period</Label>
            <Input
              id="endPeriod"
              value={endPeriod}
              placeholder={PERIOD_HINT[periodization]}
              onChange={(e) => setEndPeriod(e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      {type === "customer" && (
        <Card>
          <CardHeader>
            <CardTitle>Pricing model</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-sm font-medium">Pricing</legend>
              <div className="flex gap-4">
                {(["fixed", "hourly"] as const).map((kind) => (
                  <label key={kind} className="flex items-center gap-2 text-sm capitalize">
                    <input
                      type="radio"
                      name="pricingKind"
                      value={kind}
                      checked={pricingKind === kind}
                      onChange={() => setPricingKind(kind)}
                    />
                    {kind === "fixed" ? "Fixed price" : "Hourly"}
                  </label>
                ))}
              </div>
            </fieldset>

            {pricingKind === "fixed" && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fixedAmount">Amount ({currency})</Label>
                  <Input
                    id="fixedAmount"
                    type="number"
                    min="0"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fixedAllocation">Allocation</Label>
                  <select
                    id="fixedAllocation"
                    className={selectClass}
                    value={fixedAllocationKind}
                    onChange={(e) => setFixedAllocationKind(e.target.value as FixedAllocationKind)}
                  >
                    <option value="even">Even across the lifetime</option>
                    <option value="at_period">Recognized at a single period</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Custom per-period allocation isn&apos;t available in this form yet — import a
                    snapshot to set one.
                  </p>
                </div>
                {fixedAllocationKind === "at_period" && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fixedAtPeriod">Recognition period</Label>
                    <Input
                      id="fixedAtPeriod"
                      value={fixedAtPeriod}
                      placeholder={PERIOD_HINT[periodization]}
                      onChange={(e) => setFixedAtPeriod(e.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fixedConfidence">Confidence</Label>
                  <select
                    id="fixedConfidence"
                    className={selectClass}
                    value={fixedConfidence}
                    onChange={(e) => setFixedConfidence(e.target.value as Confidence)}
                  >
                    <option value="committed">Committed</option>
                    <option value="estimated">Estimated</option>
                    <option value="rough">Rough</option>
                  </select>
                </div>
              </div>
            )}

            {pricingKind === "hourly" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="hourlyRate">Rate per hour ({currency})</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    min="0"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="hourlyConfidence">Confidence</Label>
                  <select
                    id="hourlyConfidence"
                    className={selectClass}
                    value={hourlyConfidence}
                    onChange={(e) => setHourlyConfidence(e.target.value as Confidence)}
                  >
                    <option value="committed">Committed</option>
                    <option value="estimated">Estimated</option>
                    <option value="rough">Rough</option>
                  </select>
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Hours per period are entered on the project page, alongside cost lines.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Stakeholders</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {stakeholders.map((stakeholder, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto_auto] sm:items-end">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`stakeholder-role-${index}`}>Role</Label>
                <Input
                  id={`stakeholder-role-${index}`}
                  value={stakeholder.role}
                  onChange={(e) => updateStakeholder(index, { role: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`stakeholder-name-${index}`}>Name</Label>
                <Input
                  id={`stakeholder-name-${index}`}
                  value={stakeholder.name}
                  onChange={(e) => updateStakeholder(index, { name: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`stakeholder-email-${index}`}>Email</Label>
                <Input
                  id={`stakeholder-email-${index}`}
                  type="email"
                  value={stakeholder.email}
                  onChange={(e) => updateStakeholder(index, { email: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={stakeholder.viewer}
                  onChange={(e) => updateStakeholder(index, { viewer: e.target.checked })}
                />
                Viewer
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove stakeholder ${index + 1}`}
                onClick={() => removeStakeholder(index)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addStakeholder} className="w-fit">
            Add stakeholder
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dependencies</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {dependencies.map((dependency, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor={`dependency-${index}`}>Dependency {index + 1}</Label>
                <Input
                  id={`dependency-${index}`}
                  value={dependency}
                  onChange={(e) => updateDependency(index, e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove dependency ${index + 1}`}
                onClick={() => removeDependency(index)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addDependency} className="w-fit">
            Add dependency
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create project"}
        </Button>
      </div>
    </form>
  );
}
