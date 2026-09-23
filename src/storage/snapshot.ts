// Canonical JSON (de)serialization for the full-database snapshot. Pure — no IndexedDB, no
// browser APIs — so it can be unit-tested and used from a download/upload UI without touching
// storage. Array ordering is normalized here because Dexie/IndexedDB iteration order isn't
// guaranteed to be stable across runs; nested object field order is preserved by structured
// clone as long as importSnapshot/exportSnapshot never rebuild an object with reordered fields.
import type { Project } from "@/engine/model";
import { DEFAULT_SETTINGS_OVERRIDES } from "./types";
import type { CategoryMappingOverride, Snapshot, StoredActualEntry } from "./types";

function sortedProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => a.id.localeCompare(b.id));
}

/** Older snapshots (pre-ticket-05) don't carry a project `code` — default to `id`, same
 * backward-compat pattern as `categoryMappingOverrides`/`settingsOverrides` below. */
function withFallbackCodes(projects: Project[]): Project[] {
  return projects.map((project) =>
    project.code && project.code.trim() ? project : { ...project, code: project.id },
  );
}

/** Older snapshots (pre-ticket-10) don't carry `closedPeriods` — default to an empty set (nothing
 * closed), same backward-compat pattern as `code` above. */
function withFallbackClosedPeriods(projects: Project[]): Project[] {
  return projects.map((project) =>
    Array.isArray(project.closedPeriods) ? project : { ...project, closedPeriods: [] },
  );
}

/** Fails loudly (CLAUDE.md rule 4) on a case-insensitive code collision, naming the conflicting
 * project rather than silently overwriting one of them. */
function assertUniqueCodes(projects: Project[]): void {
  const seen = new Map<string, Project>();
  for (const project of projects) {
    const key = project.code.trim().toLowerCase();
    const conflict = seen.get(key);
    if (conflict) {
      throw new Error(
        `Invalid snapshot file: duplicate project code "${project.code}" — used by both ` +
          `"${conflict.name}" (${conflict.id}) and "${project.name}" (${project.id})`,
      );
    }
    seen.set(key, project);
  }
}

function sortedActuals(actuals: StoredActualEntry[]): StoredActualEntry[] {
  return [...actuals].sort((a, b) => {
    if (a.projectId !== b.projectId) return a.projectId.localeCompare(b.projectId);
    if (a.period !== b.period) return a.period.localeCompare(b.period);
    return a.id.localeCompare(b.id);
  });
}

function sortedOverrides(overrides: CategoryMappingOverride[]): CategoryMappingOverride[] {
  return [...overrides].sort((a, b) => a.accountCode.localeCompare(b.accountCode));
}

/** Deterministic key order and array order. Two snapshots with the same content, imported and
 * re-exported, produce the same string modulo `exportedAt`. */
export function serializeSnapshot(snapshot: Snapshot): string {
  const canonical: Snapshot = {
    schemaVersion: snapshot.schemaVersion,
    exportedAt: snapshot.exportedAt,
    projects: sortedProjects(snapshot.projects),
    actuals: sortedActuals(snapshot.actuals),
    categoryMappingOverrides: sortedOverrides(snapshot.categoryMappingOverrides),
    settingsOverrides: {
      rateCardOverrides: [...snapshot.settingsOverrides.rateCardOverrides].sort((a, b) =>
        a.role.localeCompare(b.role),
      ),
      loadedCostMultiplierOverride: snapshot.settingsOverrides.loadedCostMultiplierOverride,
      confidenceBandOverrides: snapshot.settingsOverrides.confidenceBandOverrides,
    },
  };
  return JSON.stringify(canonical, null, 2);
}

export function parseSnapshot(json: string): Snapshot {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("Invalid snapshot file: not valid JSON");
  }
  if (
    typeof data !== "object" ||
    data === null ||
    !("projects" in data) ||
    !("actuals" in data) ||
    !Array.isArray((data as Snapshot).projects) ||
    !Array.isArray((data as Snapshot).actuals)
  ) {
    throw new Error(
      "Invalid snapshot file: expected { schemaVersion, exportedAt, projects: [], actuals: [] }",
    );
  }
  const snapshot = data as Snapshot;
  // Older snapshots (pre-Phase-5) don't carry category mapping overrides — default to empty
  // rather than rejecting a still-otherwise-valid backup file.
  if (!Array.isArray(snapshot.categoryMappingOverrides)) {
    snapshot.categoryMappingOverrides = [];
  }
  // Older snapshots (pre-Phase-C) don't carry settings overrides — default rather than reject.
  if (typeof snapshot.settingsOverrides !== "object" || snapshot.settingsOverrides === null) {
    snapshot.settingsOverrides = DEFAULT_SETTINGS_OVERRIDES;
  }
  snapshot.projects = withFallbackClosedPeriods(withFallbackCodes(snapshot.projects));
  assertUniqueCodes(snapshot.projects);
  return snapshot;
}
