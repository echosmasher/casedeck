import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { IndexedDbStorageAdapter } from "./indexedDbAdapter";
import { parseSnapshot, serializeSnapshot } from "./snapshot";
import type { Project } from "@/engine/model";
import type { StoredActualEntry } from "./types";
import project001 from "../../demo/projects/001-intranet-relaunch.json";

function freshDbName(): string {
  return `casedeck-test-${Math.random().toString(36).slice(2)}`;
}

describe("IndexedDbStorageAdapter — create, edit, reload", () => {
  it("persists a saved project across a simulated reload (new adapter instance, same db)", async () => {
    const dbName = freshDbName();
    const adapter1 = new IndexedDbStorageAdapter(dbName);
    const project = project001 as Project;

    await adapter1.saveProject(project);
    await adapter1.saveProject({ ...project, name: "Intranet Relaunch (renamed)" });

    // Simulate a page reload: a brand new adapter instance pointed at the same IndexedDB database.
    const adapter2 = new IndexedDbStorageAdapter(dbName);
    const reloaded = await adapter2.getProject(project.id);

    expect(reloaded?.name).toBe("Intranet Relaunch (renamed)");
    expect(reloaded?.costs).toEqual(project.costs);
  });

  it("lists projects as summaries, sorted by id", async () => {
    const dbName = freshDbName();
    const adapter = new IndexedDbStorageAdapter(dbName);
    await adapter.saveProject({ ...(project001 as Project), id: "003" });
    await adapter.saveProject({ ...(project001 as Project), id: "001" });

    const summaries = await adapter.listProjects();
    expect(summaries.map((s) => s.id)).toEqual(["001", "003"]);
    expect(summaries[0]).toEqual({
      id: "001",
      name: (project001 as Project).name,
      type: (project001 as Project).type,
      status: (project001 as Project).status,
      stakeholders: (project001 as Project).stakeholders,
    });
  });

  it("deleting a project also deletes its actuals", async () => {
    const dbName = freshDbName();
    const adapter = new IndexedDbStorageAdapter(dbName);
    const project = project001 as Project;
    await adapter.saveProject(project);
    await adapter.saveActuals([
      { id: "a1", projectId: project.id, period: "2026-01", category: "salary", amount: 100, description: "x", source: "manual" },
    ]);

    await adapter.deleteProject(project.id);

    expect(await adapter.getProject(project.id)).toBeUndefined();
    expect(await adapter.listActuals(project.id)).toEqual([]);
  });
});

describe("IndexedDbStorageAdapter — nextProjectId", () => {
  it("returns 001 for an empty database", async () => {
    const adapter = new IndexedDbStorageAdapter(freshDbName());
    expect(await adapter.nextProjectId()).toBe("001");
  });

  it("continues the sequence past the highest existing numeric id", async () => {
    const adapter = new IndexedDbStorageAdapter(freshDbName());
    await adapter.saveProject({ ...(project001 as Project), id: "001" });
    await adapter.saveProject({ ...(project001 as Project), id: "003" });
    expect(await adapter.nextProjectId()).toBe("004");
  });
});

describe("Snapshot export/import round trip — byte-stable modulo exportedAt", () => {
  const actuals: StoredActualEntry[] = [
    { id: "a2", projectId: "001", period: "2026-02", category: "consultancy", amount: 86000, description: "b", source: "csv", sourceFile: "x.csv", sourceRow: 2 },
    { id: "a1", projectId: "001", period: "2026-01", category: "salary", amount: 124200, description: "a", source: "csv" },
  ];

  it("re-importing an exported snapshot into a fresh db reproduces it exactly, except exportedAt", async () => {
    const source = new IndexedDbStorageAdapter(freshDbName());
    await source.saveProject(project001 as Project);
    await source.saveActuals(actuals);

    const snapshot1 = await source.exportSnapshot();
    const json1 = serializeSnapshot(snapshot1);

    const target = new IndexedDbStorageAdapter(freshDbName());
    await target.importSnapshot(parseSnapshot(json1));

    const snapshot2 = await target.exportSnapshot();
    const json2 = serializeSnapshot(snapshot2);

    const normalize = (s: string) => s.replace(/"exportedAt": ".*?"/, '"exportedAt": "<ts>"');
    expect(normalize(json2)).toBe(normalize(json1));
  });

  it("normalizes array order regardless of insertion order", () => {
    const snapshotA = {
      schemaVersion: "1",
      exportedAt: "2026-01-01T00:00:00.000Z",
      projects: [],
      actuals: [actuals[0], actuals[1]],
      categoryMappingOverrides: [],
    };
    const snapshotB = {
      schemaVersion: "1",
      exportedAt: "2026-01-01T00:00:00.000Z",
      projects: [],
      actuals: [actuals[1], actuals[0]],
      categoryMappingOverrides: [],
    };
    expect(serializeSnapshot(snapshotA)).toBe(serializeSnapshot(snapshotB));
  });

  it("importSnapshot replaces existing data rather than merging", async () => {
    const adapter = new IndexedDbStorageAdapter(freshDbName());
    await adapter.saveProject({ ...(project001 as Project), id: "999", name: "stale" });

    await adapter.importSnapshot({
      schemaVersion: "1",
      exportedAt: new Date().toISOString(),
      projects: [project001 as Project],
      actuals: [],
      categoryMappingOverrides: [],
    });

    expect(await adapter.getProject("999")).toBeUndefined();
    expect(await adapter.getProject((project001 as Project).id)).toBeDefined();
  });

  it("round-trips category mapping overrides through export/import", async () => {
    const source = new IndexedDbStorageAdapter(freshDbName());
    await source.saveCategoryMappingOverride({ accountCode: "6234", category: "other_direct" });

    const target = new IndexedDbStorageAdapter(freshDbName());
    await target.importSnapshot(await source.exportSnapshot());

    expect(await target.listCategoryMappingOverrides()).toEqual([
      { accountCode: "6234", category: "other_direct" },
    ]);
  });
});

describe("IndexedDbStorageAdapter — category mapping overrides", () => {
  it("persists and lists overrides, org-level (not project-scoped)", async () => {
    const adapter = new IndexedDbStorageAdapter(freshDbName());
    await adapter.saveCategoryMappingOverride({ accountCode: "6234", category: "other_direct" });
    await adapter.saveCategoryMappingOverride({ accountCode: "7000", category: "travel" });

    expect(await adapter.listCategoryMappingOverrides()).toEqual(
      expect.arrayContaining([
        { accountCode: "6234", category: "other_direct" },
        { accountCode: "7000", category: "travel" },
      ]),
    );
  });

  it("overwrites an existing override for the same account code", async () => {
    const adapter = new IndexedDbStorageAdapter(freshDbName());
    await adapter.saveCategoryMappingOverride({ accountCode: "6234", category: "travel" });
    await adapter.saveCategoryMappingOverride({ accountCode: "6234", category: "other_direct" });

    const overrides = await adapter.listCategoryMappingOverrides();
    expect(overrides).toEqual([{ accountCode: "6234", category: "other_direct" }]);
  });

  it("persists across a simulated reload", async () => {
    const dbName = freshDbName();
    const adapter1 = new IndexedDbStorageAdapter(dbName);
    await adapter1.saveCategoryMappingOverride({ accountCode: "6234", category: "other_direct" });

    const adapter2 = new IndexedDbStorageAdapter(dbName);
    expect(await adapter2.listCategoryMappingOverrides()).toEqual([
      { accountCode: "6234", category: "other_direct" },
    ]);
  });
});

describe("IndexedDbStorageAdapter — deleteActual", () => {
  it("removes a single actual entry without touching the rest", async () => {
    const adapter = new IndexedDbStorageAdapter(freshDbName());
    await adapter.saveActuals([
      { id: "a1", projectId: "001", period: "2026-01", category: "salary", amount: 100, description: "x", source: "manual" },
      { id: "a2", projectId: "001", period: "2026-02", category: "salary", amount: 200, description: "y", source: "manual" },
    ]);

    await adapter.deleteActual("a1");

    const remaining = await adapter.listActuals("001");
    expect(remaining.map((a) => a.id)).toEqual(["a2"]);
  });
});

describe("parseSnapshot", () => {
  it("rejects invalid JSON", () => {
    expect(() => parseSnapshot("not json")).toThrow(/not valid JSON/);
  });

  it("rejects well-formed JSON missing the expected shape", () => {
    expect(() => parseSnapshot(JSON.stringify({ foo: "bar" }))).toThrow(/expected/);
  });
});
