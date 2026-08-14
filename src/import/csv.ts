// Shared CSV primitives — delimiter/decimal convention detection, row parsing, locale-aware
// number parsing. Used by the actuals import pipeline (actuals.ts) and, later, a budget CSV
// pipeline over the same DATA_REQUIREMENTS.md conventions. Pure: no React/Next/DOM (engine-purity
// boundary, CLAUDE.md rule 1 — src/import/ is held to the same rule as src/engine/).
import Papa from "papaparse";

export type Delimiter = "," | ";";
export type Decimal = "." | ",";

export interface DetectedConvention {
  delimiter: Delimiter;
  decimal: Decimal;
}

/** Auto-detects comma vs. semicolon — the two delimiters DATA_REQUIREMENTS.md documents. */
export function detectDelimiter(text: string): Delimiter {
  const result = Papa.parse<string[]>(text, { delimitersToGuess: [",", ";"] });
  return result.meta.delimiter === ";" ? ";" : ",";
}

/** Splits CSV text into raw rows (no header mapping — callers validate column counts themselves,
 * since a mis-delimited row needs to surface as "wrong column count", not be silently absorbed
 * into a header-keyed object). */
export function parseRows(text: string, delimiter: Delimiter): string[][] {
  const result = Papa.parse<string[]>(text, { delimiter, skipEmptyLines: true });
  return result.data;
}

/** A comma-delimited file can never carry a decimal comma inside a field (the comma would already
 * have split the row) — decimal is unambiguously "." there. A semicolon-delimited file's decimal
 * convention is independent of its delimiter (DATA_REQUIREMENTS.md) and must be inferred from the
 * actual values: any comma appearing inside one of the inspected values (typically the amount
 * column) means decimal-comma for the whole file. */
export function detectDecimal(delimiter: Delimiter, valuesToInspect: string[]): Decimal {
  if (delimiter === ",") return ".";
  return valuesToInspect.some((v) => v.includes(",")) ? "," : ".";
}

export function detectConvention(text: string, amountColumnValues: string[]): DetectedConvention {
  const delimiter = detectDelimiter(text);
  const decimal = detectDecimal(delimiter, amountColumnValues);
  return { delimiter, decimal };
}

/** Parses a single numeric field per the detected decimal convention. Returns null (never NaN)
 * for anything that isn't a valid number — callers turn that into a typed ImportRowError rather
 * than letting NaN propagate (CLAUDE.md rule 4 / engine principle 6.1). */
export function parseLocaleNumber(raw: string, decimal: Decimal): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const normalized = decimal === "," ? trimmed.replace(",", ".") : trimmed;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
