// The status a project is shown with. Delivery progress follows the closed periods rather than a
// hand-set field, so a project can't read "In progress" with every period closed, or "Completed"
// with periods still open. The workflow states before any period closes (planning, ready for
// approval, approved) and "on hold" can't be read off the periods, so those stay as entered.
import { enumeratePeriods } from "./periodize";
import type { Project, ProjectStatus } from "./model";

type StatusInputs = Pick<Project, "status" | "closedPeriods" | "periodization" | "startPeriod" | "endPeriod">;

/** Entered status until a period closes; then "in_progress", or "completed" once every period is
 * closed. "on_hold" always stands, so a paused project stays visibly paused. */
export function effectiveStatus(project: StatusInputs): ProjectStatus {
  if (project.status === "on_hold" || project.closedPeriods.length === 0) return project.status;
  const periods = enumeratePeriods(project.startPeriod, project.endPeriod, project.periodization);
  return project.closedPeriods.length >= periods.length ? "completed" : "in_progress";
}

/** True when the status is set by the closed periods, so the edit form shouldn't offer it. */
export function isStatusDerived(project: StatusInputs): boolean {
  return project.status !== "on_hold" && project.closedPeriods.length > 0;
}
