import type { Project } from "@/engine/model";

/** The shared identity tagged on demo projects 001 and 003's stakeholders (see demo/README.md
 * "Demo mode"). Not a hardcoded project-id allowlist — the Viewer role derives visibility from
 * this exact stakeholder match, reusing the general-purpose Stakeholder.viewer flag (PLAN.md §4)
 * rather than inventing a separate access-control concept for the demo. */
export const DEMO_VIEWER_EMAIL = "erik.solberg@example-group.invalid";

export function isViewerVisible(project: Pick<Project, "stakeholders">): boolean {
  return project.stakeholders.some((s) => s.viewer && s.email === DEMO_VIEWER_EMAIL);
}
