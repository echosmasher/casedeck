#!/usr/bin/env -S npx tsx
// The deterministic CLI the /setup skill runs (PLAN.md §6.5: "run the deterministic parser — the
// skill instructs Claude to use the repo's import CLI, not to eyeball numbers"). Three outcomes,
// nothing in between:
//   1. Structural errors  -> print the engine's exact error messages, exit 1, write nothing.
//   2. Unmapped account codes -> print a report grouped by code, exit 2, write nothing. The skill
//      relays these as interview questions; the answers go into meta.json's categoryMapping and
//      the CLI is re-run.
//   3. Clean -> validate against the JSON Schemas + engine invariants, write config.json and
//      project.json, print exactly what was written and where.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { parseBudgetFile } from "../src/import/budget";
import { validateProjectInvariants } from "../src/engine/validate";
import type { GroupConfig, Project } from "../src/engine/model";

const CATEGORY_LABEL: Record<string, string> = {
  salary: "Salary",
  consultancy: "Consultancy",
  it_systems: "IT Systems",
  travel: "Travel",
  other_direct: "Other Direct Costs",
  revenue: "Revenue",
};

interface Meta {
  orgName: string;
  currency: string;
  displayUnitsDefault: "whole" | "thousands";
  loadedCostMultiplier: number;
  rateCard: { role: string; ratePerHour: number }[];
  categoryMapping: { accountCode: string; category: string }[];
  confidenceBands?: GroupConfig["confidenceBands"];
  categories?: GroupConfig["categories"];
  statuses?: GroupConfig["statuses"];
  project: {
    id: string;
    name: string;
    type: "customer" | "internal";
    status: Project["status"];
    startPeriod: string;
    endPeriod: string;
    periodization: Project["periodization"];
    stakeholders: Project["stakeholders"];
    dependencies: string[];
  };
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const [, , budgetPath, metaPath, outDir] = process.argv;
if (!budgetPath || !metaPath || !outDir) {
  fail("usage: budget-cli.ts <budget.csv> <meta.json> <outDir>");
}

const root = resolve(import.meta.dirname, "..");
const budgetText = readFileSync(budgetPath, "utf8");
const meta: Meta = JSON.parse(readFileSync(metaPath, "utf8"));
const defaultCategories = JSON.parse(readFileSync(resolve(root, "config/default/categories.json"), "utf8"));
const defaultBands = JSON.parse(readFileSync(resolve(root, "config/default/confidence-bands.json"), "utf8"));
const defaultStatuses = JSON.parse(readFileSync(resolve(root, "config/default/statuses.json"), "utf8"));

const fileName = budgetPath.split("/").pop() ?? budgetPath;
const result = parseBudgetFile(fileName, budgetText, meta.categoryMapping ?? []);

if (result.rejected.length > 0) {
  console.error(`${fileName} failed to parse — fix these and re-run:\n`);
  for (const r of result.rejected) console.error(`  ${r.message}`);
  process.exit(1);
}

if (result.unmapped.length > 0) {
  console.error(`${fileName} has account codes with no category yet:\n`);
  for (const u of result.unmapped) {
    console.error(
      `  account ${u.accountCode} (${u.lineType}) — e.g. "${u.sampleLabel}", ${u.rowNumbers.length} row(s)`,
    );
  }
  console.error(
    `\nAsk the user which cost group each of these belongs to (one of: ${Object.values(CATEGORY_LABEL).join(", ")}),`,
  );
  console.error('add each answer to meta.json\'s "categoryMapping" array, then re-run this command.');
  process.exit(2);
}

const config: GroupConfig = {
  orgName: meta.orgName,
  currency: meta.currency,
  displayUnitsDefault: meta.displayUnitsDefault,
  loadedCostMultiplier: meta.loadedCostMultiplier,
  confidenceBands: meta.confidenceBands ?? defaultBands.confidenceBands,
  categories: meta.categories ?? defaultCategories.categories,
  statuses: meta.statuses ?? defaultStatuses.statuses,
  rateCard: meta.rateCard,
  categoryMapping: result.categoryMapping,
};

const project: Project = {
  id: meta.project.id,
  name: meta.project.name,
  type: meta.project.type,
  status: meta.project.status,
  currency: meta.currency,
  displayUnits: meta.displayUnitsDefault,
  periodization: meta.project.periodization,
  startPeriod: meta.project.startPeriod,
  endPeriod: meta.project.endPeriod,
  loadedCostMultiplier: meta.loadedCostMultiplier,
  pricingModel: result.pricingModel,
  costs: result.costs,
  stakeholders: meta.project.stakeholders,
  dependencies: meta.project.dependencies,
};

const invariantErrors = validateProjectInvariants(project);
if (invariantErrors.length > 0) {
  console.error(`${fileName} parsed, but the resulting project is invalid:\n`);
  for (const e of invariantErrors) console.error(`  ${e.field}: ${e.message}`);
  process.exit(1);
}

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const validateConfig = ajv.compile(JSON.parse(readFileSync(resolve(root, "config/config.schema.json"), "utf8")));
const validateProjectSchema = ajv.compile(JSON.parse(readFileSync(resolve(root, "config/project.schema.json"), "utf8")));

if (!validateConfig(config)) {
  console.error(`Generated config.json failed schema validation:\n`);
  for (const e of validateConfig.errors ?? []) console.error(`  ${e.instancePath || "/"} ${e.message}`);
  process.exit(1);
}
if (!validateProjectSchema(project)) {
  console.error(`Generated project.json failed schema validation:\n`);
  for (const e of validateProjectSchema.errors ?? []) console.error(`  ${e.instancePath || "/"} ${e.message}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const configPath = resolve(outDir, `${meta.orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.config.json`);
const projectPath = resolve(outDir, `${project.id}-${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`);
writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
writeFileSync(projectPath, JSON.stringify(project, null, 2) + "\n");

console.log(`Wrote:\n  ${configPath}\n  ${projectPath}`);
console.log(
  `\n${project.costs.length} cost line(s), pricing model: ${project.pricingModel ? project.pricingModel.type : "none (internal project)"}.`,
);
