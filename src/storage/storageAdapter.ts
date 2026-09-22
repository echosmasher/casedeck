// The storage boundary (PLAN.md §3 "Storage adapter — DECISION"). All persistence goes through
// this interface. v1 ships exactly one implementation (IndexedDB, see indexedDbAdapter.ts) — the
// interface exists so a future multi-user adapter can be added without touching UI or engine code.
import type { Project } from "@/engine/model";
import type {
  CategoryMappingOverride,
  ProjectSummary,
  SettingsOverrides,
  Snapshot,
  StoredActualEntry,
} from "./types";

export interface StorageAdapter {
  listProjects(): Promise<ProjectSummary[]>;
  getProject(id: string): Promise<Project | undefined>;
  saveProject(project: Project): Promise<void>;
  deleteProject(id: string): Promise<void>;

  listActuals(projectId: string): Promise<StoredActualEntry[]>;
  saveActuals(entries: StoredActualEntry[]): Promise<void>;
  deleteActual(id: string): Promise<void>;

  /** Org-level, not project-scoped — see CategoryMappingOverride. */
  listCategoryMappingOverrides(): Promise<CategoryMappingOverride[]>;
  saveCategoryMappingOverride(entry: CategoryMappingOverride): Promise<void>;

  /** Org-level, not project-scoped — see SettingsOverrides. */
  getSettingsOverrides(): Promise<SettingsOverrides>;
  saveSettingsOverrides(overrides: SettingsOverrides): Promise<void>;

  /** Returns a project id not already in use — callers append it to a new Project. */
  nextProjectId(): Promise<string>;

  importSnapshot(snapshot: Snapshot): Promise<void>;
  exportSnapshot(): Promise<Snapshot>;
}
