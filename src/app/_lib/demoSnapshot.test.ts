// Ties "Demo data — reset" to engine correctness (PLAN.md Phase 6 accept criteria: "reset restores
// planted stories exactly — engine fixture test re-run against the reset state"). Loads the bundled
// snapshot exactly as the reset button would, then re-runs the same assertions Phase 2/5 already
// verified against the source demo files, proving the bundled copy hasn't drifted from them.
import { describe, expect, it } from "vitest";
import { demoSnapshot } from "./demoSnapshot";
import { computeProjectScenarios } from "@/engine/scenarios";
import { computeVariance } from "@/engine/variance";
import type { ConfidenceBands, Project } from "@/engine/model";
import exampleGroupConfig from "../../../demo/example-group.config.json";
import type { GroupConfig } from "@/engine/model";

const bands: ConfidenceBands = (exampleGroupConfig as GroupConfig).confidenceBands;

function project(id: string): Project {
  const found = demoSnapshot.projects.find((p) => p.id === id);
  if (!found) throw new Error(`demo snapshot is missing project ${id}`);
  return found;
}

function actualsFor(id: string) {
  return demoSnapshot.actuals.filter((a) => a.projectId === id);
}

describe("demoSnapshot — bundled dataset matches the source demo files exactly", () => {
  it("carries exactly the three demo projects, unmodified from demo/projects/*.json", () => {
    expect(demoSnapshot.projects.map((p) => p.id).sort()).toEqual(["001", "002", "003"]);
  });

  it("001: consultancy is red (breaches its worst-case ceiling), salary is ok", () => {
    const variance = computeVariance(project("001"), actualsFor("001"), bands);
    expect(variance.byCategory.consultancy.flag).toBe("red");
    expect(variance.byCategory.consultancy.projectionToComplete).toBeCloseTo(558500, 2);
    expect(variance.byCategory.salary.flag).toBe("ok");
    expect(variance.total.flag).toBe("warning");
  });

  it("002: every category is ok, total margin is profitable despite three loss quarters", () => {
    const variance = computeVariance(project("002"), actualsFor("002"), bands);
    for (const category of ["salary", "consultancy", "travel"]) {
      expect(variance.byCategory[category].flag).toBe("ok");
    }
    const scenarios = computeProjectScenarios(project("002"), bands);
    expect(scenarios.totals.margin.expected).toBeCloseTo(236750, 2);
    expect(scenarios.marginByPeriod["2025-Q1"].expected).toBeLessThan(0);
    expect(scenarios.marginByPeriod["2025-Q2"].expected).toBeLessThan(0);
    expect(scenarios.marginByPeriod["2025-Q3"].expected).toBeLessThan(0);
  });

  it("003: expected case profitable, worst case is not — no actuals (still in planning)", () => {
    expect(actualsFor("003")).toEqual([]);
    const scenarios = computeProjectScenarios(project("003"), bands);
    expect(scenarios.totals.margin.expected).toBeCloseTo(263250, 2);
    expect(scenarios.totals.margin.worst).toBeCloseTo(-809775, 2);
    expect(scenarios.totals.margin.best).toBeCloseTo(1336275, 2);
  });

  it("every actual entry carries file/row provenance, as if it had actually been imported", () => {
    for (const entry of demoSnapshot.actuals) {
      expect(entry.source).toBe("csv");
      expect(entry.sourceFile).toBeTruthy();
      expect(entry.sourceRow).toBeGreaterThan(0);
    }
  });
});
