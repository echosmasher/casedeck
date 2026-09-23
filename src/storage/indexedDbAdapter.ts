// The v1 StorageAdapter implementation: IndexedDB via Dexie. Everything lives in the browser —
// no backend, no accounts (CLAUDE.md rule 5).
import Dexie, { type Table } from "dexie";
import type { Project } from "@/engine/model";
import type { StorageAdapter } from "./storageAdapter";
import {
  DEFAULT_SETTINGS_OVERRIDES,
  SNAPSHOT_SCHEMA_VERSION,
  type CategoryMappingOverride,
  type ProjectSummary,
  type SettingsOverrides,
  type Snapshot,
  type StoredActualEntry,
} from "./types";

/** Singleton row id — settings overrides are org-level, not keyed by anything else. */
const SETTINGS_ROW_ID = "singleton";
type StoredSettingsOverrides = SettingsOverrides & { id: string };

class CaseDeckDatabase extends Dexie {
  projects!: Table<Project, string>;
  actuals!: Table<StoredActualEntry, string>;
  categoryMappingOverrides!: Table<CategoryMappingOverride, string>;
  settings!: Table<StoredSettingsOverrides, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      projects: "id",
      actuals: "id, projectId, [projectId+period]",
    });
    this.version(2).stores({
      projects: "id",
      actuals: "id, projectId, [projectId+period]",
      categoryMappingOverrides: "accountCode",
    });
    this.version(3).stores({
      projects: "id",
      actuals: "id, projectId, [projectId+period]",
      categoryMappingOverrides: "accountCode",
      settings: "id",
    });
    // v4: `code` added to Project (ticket 05). Backfill code = id on existing rows so nothing is
    // blank — this is the permanent value for legacy projects, since code is locked after creation.
    this.version(4)
      .stores({
        projects: "id",
        actuals: "id, projectId, [projectId+period]",
        categoryMappingOverrides: "accountCode",
        settings: "id",
      })
      .upgrade((tx) =>
        tx
          .table("projects")
          .toCollection()
          .modify((project: Project) => {
            if (!project.code || !project.code.trim()) {
              project.code = project.id;
            }
          }),
      );
  }
}

export class IndexedDbStorageAdapter implements StorageAdapter {
  private db: CaseDeckDatabase;

  constructor(databaseName = "casedeck") {
    this.db = new CaseDeckDatabase(databaseName);
  }

  async listProjects(): Promise<ProjectSummary[]> {
    const projects = await this.db.projects.toArray();
    return projects
      .map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        type: p.type,
        status: p.status,
        stakeholders: p.stakeholders,
        periodization: p.periodization,
        endPeriod: p.endPeriod,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.db.projects.get(id);
  }

  async saveProject(project: Project): Promise<void> {
    await this.db.projects.put(project);
  }

  async deleteProject(id: string): Promise<void> {
    await this.db.transaction("rw", this.db.projects, this.db.actuals, async () => {
      await this.db.projects.delete(id);
      await this.db.actuals.where("projectId").equals(id).delete();
    });
  }

  async listActuals(projectId: string): Promise<StoredActualEntry[]> {
    return this.db.actuals.where("projectId").equals(projectId).toArray();
  }

  async saveActuals(entries: StoredActualEntry[]): Promise<void> {
    await this.db.actuals.bulkPut(entries);
  }

  async deleteActual(id: string): Promise<void> {
    await this.db.actuals.delete(id);
  }

  async listCategoryMappingOverrides(): Promise<CategoryMappingOverride[]> {
    return this.db.categoryMappingOverrides.toArray();
  }

  async saveCategoryMappingOverride(entry: CategoryMappingOverride): Promise<void> {
    await this.db.categoryMappingOverrides.put(entry);
  }

  async getSettingsOverrides(): Promise<SettingsOverrides> {
    const row = await this.db.settings.get(SETTINGS_ROW_ID);
    if (!row) return DEFAULT_SETTINGS_OVERRIDES;
    return {
      rateCardOverrides: row.rateCardOverrides,
      loadedCostMultiplierOverride: row.loadedCostMultiplierOverride,
      confidenceBandOverrides: row.confidenceBandOverrides,
    };
  }

  async saveSettingsOverrides(overrides: SettingsOverrides): Promise<void> {
    await this.db.settings.put({ id: SETTINGS_ROW_ID, ...overrides });
  }

  /** Smallest 3-digit id not already in use, continuing the demo data's 001/002/003 sequence
   * (config/project.schema.json constrains ids to exactly 3 digits — a soft 999-project cap that's
   * not a concern for this tool's scale). */
  async nextProjectId(): Promise<string> {
    const projects = await this.db.projects.toArray();
    const maxId = projects.reduce((max, p) => {
      const n = Number(p.id);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    return String(maxId + 1).padStart(3, "0");
  }

  async importSnapshot(snapshot: Snapshot): Promise<void> {
    await this.db.transaction(
      "rw",
      this.db.projects,
      this.db.actuals,
      this.db.categoryMappingOverrides,
      this.db.settings,
      async () => {
        await this.db.projects.clear();
        await this.db.actuals.clear();
        await this.db.categoryMappingOverrides.clear();
        await this.db.settings.clear();
        await this.db.projects.bulkPut(snapshot.projects);
        await this.db.actuals.bulkPut(snapshot.actuals);
        await this.db.categoryMappingOverrides.bulkPut(snapshot.categoryMappingOverrides);
        await this.db.settings.put({ id: SETTINGS_ROW_ID, ...snapshot.settingsOverrides });
      },
    );
  }

  async exportSnapshot(): Promise<Snapshot> {
    const [projects, actuals, categoryMappingOverrides, settingsOverrides] = await Promise.all([
      this.db.projects.toArray(),
      this.db.actuals.toArray(),
      this.db.categoryMappingOverrides.toArray(),
      this.getSettingsOverrides(),
    ]);
    return {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      projects,
      actuals,
      categoryMappingOverrides,
      settingsOverrides,
    };
  }
}
