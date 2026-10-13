// Display labels shared by the app and the business-case export. Lives in src/export (framework-
// free) because export code may not import from src/app, while src/app may import from here — the
// same arrangement as `formatCompactChartCurrency` (src/app/_lib/format.ts).
import type { Periodization, ProjectStatus } from "@/engine/model";
import type { VarianceFlag } from "@/engine/variance";

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planning",
  ready_for_approval: "Ready for approval",
  approved: "Approved",
  in_progress: "In progress",
  completed: "Completed",
  on_hold: "On hold",
};

/** Label for a project status, falling back to the raw value for anything unmapped (e.g. a
 * snapshot written by a newer version) rather than rendering nothing. */
export function statusLabel(status: string): string {
  return STATUS_LABEL[status as ProjectStatus] ?? status;
}

export const PERIODIZATION_LABEL: Record<Periodization, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  total: "Single period",
};

/** Variance flag labels (`src/engine/variance.ts`), shared by the dashboard and the export. They
 * name where a category's projection sits against its own range, never the gap to budget: "Over
 * budget" here collided with the headline's "79k over budget", which measures something else.
 * Tense-neutral, so the same words serve a running project and a finished one. */
export const VARIANCE_FLAG_LABEL: Record<VarianceFlag, string> = {
  ok: "Within range",
  warning: "Near its ceiling",
  red: "Past its ceiling",
};
