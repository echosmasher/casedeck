#!/usr/bin/env -S npx tsx
// The deterministic CLI the /business-case skill runs. Prints every computed figure (scenario
// totals/by-period/by-category, and variance if actuals exist) as JSON to stdout — the skill reads
// this output and cites it verbatim in the narrative it drafts. It never computes a number itself
// (PLAN.md §6.6): this script is what makes that possible, the same way budget-cli.ts is what
// makes "never eyeball numbers" possible for /setup.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { computeProjectScenarios } from "../src/engine/scenarios";
import { computeVariance } from "../src/engine/variance";
import { validateProjectInvariants } from "../src/engine/validate";
import type { ActualEntry, ConfidenceBands, GroupConfig, Project } from "../src/engine/model";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const [, , inputPath, projectIdArg, ...rest] = process.argv;
if (!inputPath) {
  fail("usage: business-case-cli.ts <project.json | snapshot.json> [projectId] [--config <groupConfig.json>]");
}

const configFlagIndex = rest.indexOf("--config");
const configPath = configFlagIndex >= 0 ? rest[configFlagIndex + 1] : undefined;

const root = resolve(import.meta.dirname, "..");
const raw = JSON.parse(readFileSync(inputPath, "utf8"));

let project: Project;
let actuals: ActualEntry[] = [];

if (Array.isArray(raw.projects)) {
  if (!projectIdArg) fail(`${inputPath} is a snapshot (multiple projects) — pass a project id as the second argument.`);
  const found = raw.projects.find((p: Project) => p.id === projectIdArg);
  if (!found) fail(`No project with id "${projectIdArg}" in ${inputPath}.`);
  project = found;
  actuals = Array.isArray(raw.actuals) ? raw.actuals.filter((a: ActualEntry & { projectId: string }) => a.projectId === projectIdArg) : [];
} else {
  project = raw as Project;
  if (projectIdArg && project.id !== projectIdArg) {
    fail(`${inputPath} is project "${project.id}", not "${projectIdArg}".`);
  }
}

const invariantErrors = validateProjectInvariants(project);
if (invariantErrors.length > 0) {
  console.error(`Project "${project.id}" fails validation — nothing computed:\n`);
  for (const e of invariantErrors) console.error(`  ${e.field}: ${e.message}`);
  process.exit(1);
}

const bands: ConfidenceBands = configPath
  ? (JSON.parse(readFileSync(configPath, "utf8")) as GroupConfig).confidenceBands
  : JSON.parse(readFileSync(resolve(root, "config/default/confidence-bands.json"), "utf8")).confidenceBands;

const scenarios = computeProjectScenarios(project, bands);
const variance = actuals.length > 0 ? computeVariance(project, actuals, bands) : null;

console.log(
  JSON.stringify(
    {
      project: {
        id: project.id,
        name: project.name,
        type: project.type,
        status: project.status,
        currency: project.currency,
        displayUnits: project.displayUnits,
        periodization: project.periodization,
        startPeriod: project.startPeriod,
        endPeriod: project.endPeriod,
        dependencies: project.dependencies,
      },
      confidenceBands: bands,
      scenarios,
      variance,
    },
    null,
    2,
  ),
);
