// Display labels shared by the app and the business-case export. Lives in src/export (framework-
// free) because export code may not import from src/app, while src/app may import from here — the
// same arrangement as `formatCompactChartCurrency` (src/app/_lib/format.ts).
import type { Periodization, ProjectStatus } from "@/engine/model";

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planning",
  ready_for_approval: "Ready for Approval",
  approved: "Approved",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
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
