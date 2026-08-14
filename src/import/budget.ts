// The budget import pipeline (PLAN.md §6.2, §6.5): parse -> validate -> pivot long-format rows
// into CostLineItem[] and a PricingModel. This is "the repo's import CLI" the /setup skill
// instructs Claude to run instead of eyeballing numbers — every arithmetic and structural decision
// (period sums, hours x rate, which allocation shape a set of revenue rows implies) happens here,
// deterministically. Pure: no React/Next/DOM.
import { detectDelimiter, detectDecimal, parseRows, parseLocaleNumber, type DetectedConvention } from "./csv";
import { formatImportRowError } from "@/engine/validate";
import type {
  Allocation,
  CategoryMappingEntry,
  Confidence,
  CostLineItem,
  DirectCostCategory,
  PeriodValues,
  PricingModel,
} from "@/engine/model";

const EXPECTED_COLUMNS = [
  "line_type",
  "account_code",
  "line_label",
  "category",
  "role",
  "period",
  "confidence",
  "hours",
  "rate",
  "amount",
] as const;
const AMOUNT_COLUMN_INDEX = 9;
const CONFIDENCE_VALUES: Confidence[] = ["committed", "estimated", "rough"];
const DIRECT_CATEGORIES: DirectCostCategory[] = ["consultancy", "it_systems", "travel", "other_direct"];

export interface RejectedBudgetRow {
  rowNumber: number;
  message: string;
}

export interface UnmappedBudgetCode {
  accountCode: string;
  lineType: "cost" | "revenue";
  sampleLabel: string;
  rowNumbers: number[];
}

export interface BudgetImportResult {
  file: string;
  convention: DetectedConvention;
  totalDataRows: number;
  costs: CostLineItem[];
  pricingModel: PricingModel;
  /** account_code -> category, derived from every successfully-resolved row. Ready to write
   * straight into a new org's config.json (PLAN.md §6.5). */
  categoryMapping: CategoryMappingEntry[];
  rejected: RejectedBudgetRow[];
  unmapped: UnmappedBudgetCode[];
}

interface ParsedRow {
  rowNumber: number;
  lineType: "cost" | "revenue";
  accountCode: string;
  lineLabel: string;
  category: string;
  role: string;
  period: string;
  confidence: Confidence;
  hours: number | null;
  rate: number | null;
  amount: number;
}

function mode<T>(values: T[]): T {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0];
  let bestCount = 0;
  for (const [v, count] of counts) {
    if (count > bestCount) {
      best = v;
      bestCount = count;
    }
  }
  return best;
}

function confidenceFields(rows: ParsedRow[]): { confidence: Confidence; confidencePerPeriod?: Record<string, Confidence> } {
  const base = mode(rows.map((r) => r.confidence));
  const overrides = Object.fromEntries(
    rows.filter((r) => r.confidence !== base).map((r) => [r.period, r.confidence]),
  );
  return Object.keys(overrides).length > 0
    ? { confidence: base, confidencePerPeriod: overrides }
    : { confidence: base };
}

export function parseBudgetFile(
  file: string,
  text: string,
  categoryMapping: CategoryMappingEntry[],
): BudgetImportResult {
  const delimiter = detectDelimiter(text);
  const delimiterName = delimiter === ";" ? "semicolon" : "comma";
  const allRows = parseRows(text, delimiter);
  const [, ...dataRows] = allRows;

  const decimal = detectDecimal(
    delimiter,
    dataRows.map((r) => r[AMOUNT_COLUMN_INDEX]).filter((v): v is string => v !== undefined),
  );

  const mappingByCode = new Map(categoryMapping.map((m) => [m.accountCode, m.category]));
  const rejected: RejectedBudgetRow[] = [];
  const unmappedByCode = new Map<string, UnmappedBudgetCode>();
  const resolvedRows: ParsedRow[] = [];
  const derivedMapping = new Map<string, string>();

  function reject(rowNumber: number, message: string) {
    rejected.push({ rowNumber, message });
  }

  dataRows.forEach((row, index) => {
    const rowNumber = index + 1;

    if (row.length !== EXPECTED_COLUMNS.length) {
      reject(
        rowNumber,
        formatImportRowError({
          file,
          row: rowNumber,
          expected: `${EXPECTED_COLUMNS.length} columns (${delimiterName}-delimited), got ${row.length} — check for a stray delimiter`,
        }),
      );
      return;
    }

    const [lineTypeRaw, accountCodeRaw, lineLabel, categoryRaw, role, period, confidenceRaw, hoursRaw, rateRaw, amountRaw] = row;
    const accountCode = accountCodeRaw.trim();
    const category = categoryRaw.trim();

    if (lineTypeRaw !== "cost" && lineTypeRaw !== "revenue") {
      reject(
        rowNumber,
        formatImportRowError({
          file,
          row: rowNumber,
          column: "line_type",
          expected: '"cost" or "revenue"',
          got: lineTypeRaw,
        }),
      );
      return;
    }
    const lineType = lineTypeRaw;

    if (!CONFIDENCE_VALUES.includes(confidenceRaw as Confidence)) {
      reject(
        rowNumber,
        formatImportRowError({
          file,
          row: rowNumber,
          column: "confidence",
          expected: '"committed", "estimated", or "rough"',
          got: confidenceRaw,
        }),
      );
      return;
    }
    const confidence = confidenceRaw as Confidence;

    const amount = parseLocaleNumber(amountRaw, decimal);
    if (amount === null) {
      reject(
        rowNumber,
        formatImportRowError({
          file,
          row: rowNumber,
          column: "amount",
          expected: "a number (comma or point decimals)",
          got: amountRaw,
        }),
      );
      return;
    }

    const hours = hoursRaw.trim() === "" ? null : parseLocaleNumber(hoursRaw, decimal);
    const rate = rateRaw.trim() === "" ? null : parseLocaleNumber(rateRaw, decimal);
    if (hoursRaw.trim() !== "" && hours === null) {
      reject(rowNumber, formatImportRowError({ file, row: rowNumber, column: "hours", expected: "a number, or blank", got: hoursRaw }));
      return;
    }
    if (rateRaw.trim() !== "" && rate === null) {
      reject(rowNumber, formatImportRowError({ file, row: rowNumber, column: "rate", expected: "a number, or blank", got: rateRaw }));
      return;
    }

    // A blank category falls back to an already-known mapping (e.g. supplied from a prior
    // /setup interview answer) before being treated as needing one — lets the CLI be re-run with
    // an updated mapping rather than requiring every row to be hand-edited in the CSV.
    const resolvedCategory = category || mappingByCode.get(accountCode);
    if (!resolvedCategory) {
      const key = `${lineType}:${accountCode}`;
      const entry = unmappedByCode.get(key) ?? { accountCode, lineType, sampleLabel: lineLabel, rowNumbers: [] };
      entry.rowNumbers.push(rowNumber);
      unmappedByCode.set(key, entry);
      return;
    }

    if (lineType === "cost" && !DIRECT_CATEGORIES.includes(resolvedCategory as DirectCostCategory) && resolvedCategory !== "salary") {
      reject(
        rowNumber,
        formatImportRowError({
          file,
          row: rowNumber,
          column: "category",
          expected: '"salary", "consultancy", "it_systems", "travel", or "other_direct"',
          got: resolvedCategory,
        }),
      );
      return;
    }
    if (lineType === "revenue" && resolvedCategory !== "revenue") {
      reject(
        rowNumber,
        formatImportRowError({ file, row: rowNumber, column: "category", expected: '"revenue"', got: resolvedCategory }),
      );
      return;
    }

    derivedMapping.set(accountCode, resolvedCategory);
    resolvedRows.push({
      rowNumber,
      lineType,
      accountCode,
      lineLabel,
      category: resolvedCategory,
      role: role.trim(),
      period,
      confidence,
      hours,
      rate,
      amount,
    });
  });

  // Group by (lineType, accountCode, lineLabel) -> one line item / one revenue group per key.
  const groups = new Map<string, ParsedRow[]>();
  for (const row of resolvedRows) {
    const key = `${row.lineType}:${row.accountCode}:${row.lineLabel}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  const costs: CostLineItem[] = [];
  const revenueGroups: { key: string; rows: ParsedRow[] }[] = [];

  for (const [key, rows] of groups) {
    if (rows[0].lineType === "revenue") {
      revenueGroups.push({ key, rows });
      continue;
    }

    const isSalary = rows.some((r) => r.hours !== null || r.rate !== null);
    if (isSalary) {
      const roles = new Set(rows.map((r) => r.role).filter((r) => r !== ""));
      const rates = new Set(rows.map((r) => r.rate).filter((r): r is number => r !== null));
      if (roles.size === 0) {
        reject(rows[0].rowNumber, `${file}: salary line "${rows[0].lineLabel}" is missing a role`);
        continue;
      }
      if (roles.size > 1 || rates.size > 1) {
        reject(rows[0].rowNumber, `${file}: salary line "${rows[0].lineLabel}" has inconsistent role/rate across periods`);
        continue;
      }
      const hoursPerPeriod: Record<string, number> = {};
      for (const r of rows) hoursPerPeriod[r.period] = r.hours ?? 0;
      costs.push({
        id: key,
        category: "salary",
        label: rows[0].lineLabel,
        role: [...roles][0],
        hoursPerPeriod,
        ratePerHour: [...rates][0],
        ...confidenceFields(rows),
      });
    } else {
      const valuesPerPeriod: PeriodValues = {};
      for (const r of rows) valuesPerPeriod[r.period] = r.amount;
      costs.push({
        id: key,
        category: rows[0].category as DirectCostCategory,
        label: rows[0].lineLabel,
        valuesPerPeriod,
        ...confidenceFields(rows),
      });
    }
  }

  let pricingModel: PricingModel = null;
  if (revenueGroups.length > 1) {
    reject(
      revenueGroups[1].rows[0].rowNumber,
      `${file}: multiple revenue lines found (${revenueGroups.map((g) => g.rows[0].lineLabel).join(", ")}) — a project has exactly one pricing model`,
    );
  } else if (revenueGroups.length === 1) {
    const rows = revenueGroups[0].rows;
    const isHourly = rows.some((r) => r.hours !== null || r.rate !== null);
    if (isHourly) {
      const rates = new Set(rows.map((r) => r.rate).filter((r): r is number => r !== null));
      if (rates.size !== 1) {
        reject(rows[0].rowNumber, `${file}: hourly revenue rows have inconsistent rate`);
      } else {
        const hoursPerPeriod: Record<string, number> = {};
        for (const r of rows) hoursPerPeriod[r.period] = r.hours ?? 0;
        const { confidence, confidencePerPeriod } = confidenceFields(rows);
        pricingModel = { type: "hourly", ratePerHour: [...rates][0], hoursPerPeriod, confidence, confidencePerPeriod };
      }
    } else {
      const values: PeriodValues = {};
      for (const r of rows) values[r.period] = r.amount;
      const nonZeroPeriods = Object.entries(values).filter(([, v]) => v !== 0);
      const total = Object.values(values).reduce((a, b) => a + b, 0);
      const confidence = mode(rows.map((r) => r.confidence));
      let allocation: Allocation;
      if (nonZeroPeriods.length === 1) {
        allocation = { type: "at_period", period: nonZeroPeriods[0][0] };
      } else if (new Set(nonZeroPeriods.map(([, v]) => v)).size === 1) {
        allocation = { type: "even" };
      } else {
        allocation = { type: "custom", values };
      }
      pricingModel = { type: "fixed", amount: total, allocation, confidence };
    }
  }

  return {
    file,
    convention: { delimiter, decimal },
    totalDataRows: dataRows.length,
    costs,
    pricingModel,
    categoryMapping: [...derivedMapping.entries()].map(([accountCode, category]) => ({ accountCode, category })),
    rejected,
    unmapped: [...unmappedByCode.values()],
  };
}
