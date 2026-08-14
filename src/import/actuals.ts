// The actuals import pipeline (PLAN.md §6.2): parse -> validate -> apply category mapping ->
// preview. Nothing is written to storage from here — this module only produces a typed result the
// UI renders as a preview and commits explicitly. Pure: no React/Next/DOM.
import { detectDelimiter, detectDecimal, parseRows, parseLocaleNumber, type DetectedConvention } from "./csv";
import { formatImportRowError } from "@/engine/validate";
import type { CategoryMappingEntry } from "@/engine/model";

const EXPECTED_COLUMNS = ["period", "account_code", "description", "amount"] as const;
const AMOUNT_COLUMN_INDEX = 3;

export interface AcceptedActualRow {
  rowNumber: number;
  period: string;
  accountCode: string;
  category: string;
  amount: number;
  description: string;
}

export interface RejectedActualRow {
  rowNumber: number;
  message: string;
}

export interface UnmappedCode {
  accountCode: string;
  rowNumbers: number[];
  sampleDescription: string;
}

export interface ActualsImportResult {
  file: string;
  convention: DetectedConvention;
  totalDataRows: number;
  accepted: AcceptedActualRow[];
  rejected: RejectedActualRow[];
  ignored: number;
  unmapped: UnmappedCode[];
  totalsByCategory: Record<string, number>;
}

export function parseActualsFile(
  file: string,
  text: string,
  categoryMapping: CategoryMappingEntry[],
): ActualsImportResult {
  const delimiter = detectDelimiter(text);
  const delimiterName = delimiter === ";" ? "semicolon" : "comma";
  const allRows = parseRows(text, delimiter);
  const [, ...dataRows] = allRows;

  const decimal = detectDecimal(
    delimiter,
    dataRows.map((r) => r[AMOUNT_COLUMN_INDEX]).filter((v): v is string => v !== undefined),
  );

  const mappingByCode = new Map(categoryMapping.map((m) => [m.accountCode, m.category]));

  const accepted: AcceptedActualRow[] = [];
  const rejected: RejectedActualRow[] = [];
  const unmappedByCode = new Map<string, UnmappedCode>();
  let ignored = 0;

  dataRows.forEach((row, index) => {
    const rowNumber = index + 1;

    if (row.length !== EXPECTED_COLUMNS.length) {
      rejected.push({
        rowNumber,
        message: formatImportRowError({
          file,
          row: rowNumber,
          expected: `${EXPECTED_COLUMNS.length} columns (${delimiterName}-delimited), got ${row.length} — check for a stray delimiter`,
        }),
      });
      return;
    }

    const [period, accountCodeRaw, description, amountRaw] = row;
    const accountCode = accountCodeRaw.trim();

    const amount = parseLocaleNumber(amountRaw, decimal);
    if (amount === null) {
      rejected.push({
        rowNumber,
        message: formatImportRowError({
          file,
          row: rowNumber,
          column: "amount",
          expected: "a number (comma or point decimals)",
          got: amountRaw,
        }),
      });
      return;
    }

    const category = mappingByCode.get(accountCode);
    if (category === undefined) {
      rejected.push({
        rowNumber,
        message: formatImportRowError({
          file,
          row: rowNumber,
          column: "account_code",
          expected: "a known account code (present in category mapping)",
          got: accountCode,
        }),
      });
      const entry = unmappedByCode.get(accountCode) ?? {
        accountCode,
        rowNumbers: [],
        sampleDescription: description,
      };
      entry.rowNumbers.push(rowNumber);
      unmappedByCode.set(accountCode, entry);
      return;
    }

    if (category === "ignore") {
      ignored += 1;
      return;
    }

    accepted.push({ rowNumber, period, accountCode, category, amount, description });
  });

  const totalsByCategory: Record<string, number> = {};
  for (const row of accepted) {
    totalsByCategory[row.category] = (totalsByCategory[row.category] ?? 0) + row.amount;
  }

  return {
    file,
    convention: { delimiter, decimal },
    totalDataRows: dataRows.length,
    accepted,
    rejected,
    ignored,
    unmapped: [...unmappedByCode.values()],
    totalsByCategory,
  };
}
