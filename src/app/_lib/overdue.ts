// Overdue marker for the project overview (QA round-2 ticket 07). Depends on the wall clock, so it
// lives in the UI layer, not the engine (CLAUDE.md rule 1) — callers inject `today`.
import type { PeriodKey, Periodization, ProjectStatus } from "@/engine/model";

export const OVERDUE_TOOLTIP =
  "Past end period — mark as completed or extend the end period.";

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const QUARTER_PATTERN = /^(\d{4})-Q([1-4])$/;
const YEAR_PATTERN = /^(\d{4})$/;

/** Last calendar day of `endPeriod` per the project's periodization: a monthly period ends on its
 * last day, a quarterly period on the quarter's last day, a "total" (yearly) period on Dec 31. */
function periodEndDate(periodization: Periodization, endPeriod: PeriodKey): Date {
  if (periodization === "monthly") {
    const match = MONTH_PATTERN.exec(endPeriod);
    if (!match) throw new Error(`Invalid monthly period key: "${endPeriod}"`);
    const [, year, month] = match;
    return new Date(Number(year), Number(month), 0);
  }

  if (periodization === "quarterly") {
    const match = QUARTER_PATTERN.exec(endPeriod);
    if (!match) throw new Error(`Invalid quarterly period key: "${endPeriod}"`);
    const [, year, quarter] = match;
    return new Date(Number(year), Number(quarter) * 3, 0);
  }

  const match = YEAR_PATTERN.exec(endPeriod);
  if (!match) throw new Error(`Invalid total period key: "${endPeriod}"`);
  return new Date(Number(match[1]), 12, 0);
}

function atMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** True once `today` is strictly past the end of the project's end period, and only while the
 * project is In Progress (a planned/approved/completed/on-hold project is never "overdue"). */
export function isProjectOverdue(
  status: ProjectStatus,
  periodization: Periodization,
  endPeriod: PeriodKey,
  today: Date,
): boolean {
  if (status !== "in_progress") return false;
  return atMidnight(today).getTime() > periodEndDate(periodization, endPeriod).getTime();
}
