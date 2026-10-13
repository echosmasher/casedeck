// "Today" for date-dependent UI checks (overdue, closable periods, missing actuals). A demo config
// pins it with `asOf` so the planted stories in demo/README.md read the same whenever the demo is
// opened; real data has no `asOf` and uses the wall clock. Lives in the UI layer, not the engine
// (CLAUDE.md rule 1): callers inject the result.
import { activeConfig } from "./activeConfig";

const AS_OF_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses a YYYY-MM-DD `asOf` as a local date; null when absent or malformed. */
export function parseAsOf(asOf: string | undefined): Date | null {
  const match = asOf ? AS_OF_PATTERN.exec(asOf) : null;
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

const pinnedToday = parseAsOf(activeConfig.asOf);

/** The pinned demo date when the config sets one, otherwise now. */
export function appToday(): Date {
  return pinnedToday ?? new Date();
}

/** "15 May 2026" when the data is pinned to a date, otherwise null. */
export const asOfLabel: string | null = pinnedToday
  ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(pinnedToday)
  : null;
