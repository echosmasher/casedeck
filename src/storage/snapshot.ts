// Canonical JSON (de)serialization for the full-database snapshot. Pure — no IndexedDB, no
// browser APIs — so it can be unit-tested and used from a download/upload UI without touching
// storage. Array ordering is normalized here because Dexie/IndexedDB iteration order isn't
// guaranteed to be stable across runs; nested object field order is preserved by structured
// clone as long as importSnapshot/exportSnapshot never rebuild an object with reordered fields.
import type { Project } from "@/engine/model";
import type { CategoryMappingOverride, Snapshot, StoredActualEntry } from "./types";

function sortedProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => a.id.localeCompare(b.id));
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
  return snapshot;
}
