// Storage-layer types: the persistence shapes that sit on top of the engine's Project/ActualEntry
// types (src/engine/model.ts). Nothing here is engine math — it's identity, indexing, and the
// portable JSON snapshot format for backup/portability (CLAUDE.md rule 5, PLAN.md §2.7).
import type { ActualEntry, Project, ProjectStatus, ProjectType } from "@/engine/model";

/** Lightweight row for the project list/dropdown — avoids loading every full Project. */
export interface ProjectSummary {
  id: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
}

/** An ActualEntry as stored: carries its own stable id (assigned once, at creation — never
 * reassigned) and the project it belongs to, so it can live in its own Dexie table. */
export interface StoredActualEntry extends ActualEntry {
  id: string;
  projectId: string;
}

/** A category-mapping resolution the user made during an import preview, for an account code not
 * present in the bundled org config (PLAN.md §6.2: "mapping choices persist to config, reused
 * automatically for subsequent files"). Org-level (account codes aren't project-specific), layered
 * on top of `activeConfig.categoryMapping` at read time — never mutates the bundled config file. */
export interface CategoryMappingOverride {
  accountCode: string;
  category: string;
}

export const SNAPSHOT_SCHEMA_VERSION = "1";

/** The full-database JSON export/import format (PLAN.md §2.7: JSON export/import as backup and
 * portability). Every field but `exportedAt` must be reproducible byte-for-byte on a
 * export -> import -> export round trip. */
export interface Snapshot {
  schemaVersion: string;
  exportedAt: string;
  projects: Project[];
  actuals: StoredActualEntry[];
  categoryMappingOverrides: CategoryMappingOverride[];
}
