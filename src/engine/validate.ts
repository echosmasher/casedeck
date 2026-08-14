// Model validation (typed errors, never NaN propagation) and the import-error formatter that
// produces the exact "file, row, column: expected X, got Y" strings from DATA_REQUIREMENTS.md.
// CLAUDE.md rule 4: fail loudly and specifically, no silent skips.
import { projectPeriods } from "./periodize";
import type { CostLineItem, Project } from "./model";

export interface ModelValidationError {
  field: string;
  message: string;
}

const EPSILON = 0.01;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function checkLine(line: CostLineItem, index: number): ModelValidationError[] {
  const errors: ModelValidationError[] = [];
  const prefix = `costs[${index}] (${line.id})`;

  if (line.category === "salary") {
    if (!isFiniteNumber(line.ratePerHour) || line.ratePerHour < 0) {
      errors.push({ field: `${prefix}.ratePerHour`, message: "must be a non-negative number" });
    }
    for (const [period, hours] of Object.entries(line.hoursPerPeriod)) {
      if (!isFiniteNumber(hours) || hours < 0) {
        errors.push({
          field: `${prefix}.hoursPerPeriod.${period}`,
          message: "must be a non-negative number",
        });
      }
    }
  } else {
    for (const [period, value] of Object.entries(line.valuesPerPeriod)) {
      if (!isFiniteNumber(value) || value < 0) {
        errors.push({
          field: `${prefix}.valuesPerPeriod.${period}`,
          message: "must be a non-negative number",
        });
      }
    }
  }

  return errors;
}

/** Structural/business-rule checks beyond what JSON Schema can express — run before any
 * computation (periodize/scenarios/variance), per PLAN.md §6.1. */
export function validateProjectInvariants(project: Project): ModelValidationError[] {
  const errors: ModelValidationError[] = [];
  const periods = new Set(projectPeriods(project));

  project.costs.forEach((line, index) => {
    errors.push(...checkLine(line, index));
  });

  const model = project.pricingModel;
  if (model?.type === "fixed") {
    if (!isFiniteNumber(model.amount) || model.amount < 0) {
      errors.push({ field: "pricingModel.amount", message: "must be a non-negative number" });
    }
    if (model.allocation.type === "at_period" && !periods.has(model.allocation.period)) {
      errors.push({
        field: "pricingModel.allocation.period",
        message: `"${model.allocation.period}" is outside the project lifetime (${project.startPeriod}..${project.endPeriod})`,
      });
    }
    if (model.allocation.type === "custom") {
      const sum = Object.values(model.allocation.values).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - model.amount) > EPSILON) {
        errors.push({
          field: "pricingModel.allocation.values",
          message: `must sum to pricingModel.amount (${model.amount}), got ${sum}`,
        });
      }
    }
  } else if (model?.type === "hourly") {
    if (!isFiniteNumber(model.ratePerHour) || model.ratePerHour < 0) {
      errors.push({ field: "pricingModel.ratePerHour", message: "must be a non-negative number" });
    }
    for (const [period, hours] of Object.entries(model.hoursPerPeriod)) {
      if (!isFiniteNumber(hours) || hours < 0) {
        errors.push({
          field: `pricingModel.hoursPerPeriod.${period}`,
          message: "must be a non-negative number",
        });
      }
    }
  }

  if (!isFiniteNumber(project.loadedCostMultiplier) || project.loadedCostMultiplier <= 0) {
    errors.push({ field: "loadedCostMultiplier", message: "must be a positive number" });
  }

  return errors;
}

/** A single rejected row from a CSV import, carrying full traceability (CLAUDE.md rule 4). */
export interface ImportRowError {
  file: string;
  row: number;
  column?: string;
  expected: string;
  got?: string;
}

/** Formats exactly per DATA_REQUIREMENTS.md: with a column, quote both the column and the
 * offending value; without one, the row itself is malformed (e.g. wrong delimiter). */
export function formatImportRowError(err: ImportRowError): string {
  if (err.column) {
    const gotPart = err.got !== undefined ? `, got "${err.got}"` : "";
    return `${err.file}, row ${err.row}, column "${err.column}": expected ${err.expected}${gotPart}`;
  }
  return `${err.file}, row ${err.row}: expected ${err.expected}`;
}
