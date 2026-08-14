// The v1 StorageAdapter implementation: IndexedDB via Dexie. Everything lives in the browser —
// no backend, no accounts (CLAUDE.md rule 5).
import Dexie, { type Table } from "dexie";
import type { Project } from "@/engine/model";
import type { StorageAdapter } from "./storageAdapter";
import { SNAPSHOT_SCHEMA_VERSION, type ProjectSummary, type Snapshot, type StoredActualEntry } from "./types";

class CaseDeckDatabase extends Dexie {
  projects!: Table<Project, string>;
  actuals!: Table<StoredActualEntry, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      projects: "id",
      actuals: "id, projectId, [projectId+period]",
    });
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
      .map((p) => ({ id: p.id, name: p.name, type: p.type, status: p.status }))
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
    await this.db.transaction("rw", this.db.projects, this.db.actuals, async () => {
      await this.db.projects.clear();
      await this.db.actuals.clear();
      await this.db.projects.bulkPut(snapshot.projects);
      await this.db.actuals.bulkPut(snapshot.actuals);
    });
  }

  async exportSnapshot(): Promise<Snapshot> {
    const [projects, actuals] = await Promise.all([
      this.db.projects.toArray(),
      this.db.actuals.toArray(),
    ]);
    return {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      projects,
      actuals,
    };
  }
}
