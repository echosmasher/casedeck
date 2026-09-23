import "fake-indexeddb/auto";
import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { IndexedDbStorageAdapter } from "./indexedDbAdapter";
import { parseSnapshot, serializeSnapshot } from "./snapshot";
import type { Project } from "@/engine/model";
import type { StoredActualEntry } from "./types";
import project001 from "../../demo/projects/001-intranet-relaunch.json";

function freshDbName(): string {
  return `casedeck-test-${Math.random().toString(36).slice(2)}`;
}

/** Simulates a pre-ticket-05 project record, before `code` existed. */
function withoutCode(project: Project): Omit<Project, "code"> {
  const clone: Partial<Project> = { ...project };
  delete clone.code;
  return clone as Omit<Project, "code">;
}

/** Simulates a pre-ticket-10 project record, before `closedPeriods` existed. */
function withoutClosedPeriods(project: Project): Omit<Project, "closedPeriods"> {
  const clone: Partial<Project> = { ...project };
  delete clone.closedPeriods;
  return clone as Omit<Project, "closedPeriods">;
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
      code: (project001 as Project).code,
      name: (project001 as Project).name,
      type: (project001 as Project).type,
      status: (project001 as Project).status,
      stakeholders: (project001 as Project).stakeholders,
      periodization: (project001 as Project).periodization,
      endPeriod: (project001 as Project).endPeriod,
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

describe("IndexedDbStorageAdapter — project code migration (v3 -> v4)", () => {
  it("backfills code = id for a project stored under the pre-code schema", async () => {
    const dbName = freshDbName();

    // Simulate a pre-ticket-05 database: a v3 database with a project row that has no `code`.
    const legacyDb = new Dexie(dbName);
    legacyDb.version(3).stores({
      projects: "id",
      actuals: "id, projectId, [projectId+period]",
      categoryMappingOverrides: "accountCode",
      settings: "id",
    });
    await legacyDb.table("projects").put(withoutCode(project001 as Project));
    legacyDb.close();

    // Opening with the current adapter runs the v4 upgrade, which should backfill code = id.
    const adapter = new IndexedDbStorageAdapter(dbName);
    const migrated = await adapter.getProject((project001 as Project).id);

    expect(migrated?.code).toBe((project001 as Project).id);
  });
});

describe("IndexedDbStorageAdapter — closed periods migration (v4 -> v5)", () => {
  it("backfills an empty closedPeriods for a project stored under the pre-ticket-10 schema", async () => {
    const dbName = freshDbName();

    // Simulate a pre-ticket-10 database: a v4 database with a project row that has no
    // `closedPeriods`.
    const legacyDb = new Dexie(dbName);
    legacyDb.version(4).stores({
      projects: "id",
      actuals: "id, projectId, [projectId+period]",
      categoryMappingOverrides: "accountCode",
      settings: "id",
    });
    await legacyDb.table("projects").put(withoutClosedPeriods(project001 as Project));
    legacyDb.close();

    // Opening with the current adapter runs the v5 upgrade, which should backfill
    // closedPeriods = [].
    const adapter = new IndexedDbStorageAdapter(dbName);
    const migrated = await adapter.getProject((project001 as Project).id);

    expect(migrated?.closedPeriods).toEqual([]);
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
      settingsOverrides: { rateCardOverrides: [] },
    };
    const snapshotB = {
      schemaVersion: "1",
      exportedAt: "2026-01-01T00:00:00.000Z",
      projects: [],
      actuals: [actuals[1], actuals[0]],
      categoryMappingOverrides: [],
      settingsOverrides: { rateCardOverrides: [] },
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
      settingsOverrides: { rateCardOverrides: [] },
    });

    expect(await adapter.getProject("999")).toBeUndefined();
    expect(await adapter.getProject((project001 as Project).id)).toBeDefined();
  });

  it("round-trips the project code through export/import", async () => {
    const source = new IndexedDbStorageAdapter(freshDbName());
    await source.saveProject(project001 as Project);

    const target = new IndexedDbStorageAdapter(freshDbName());
    await target.importSnapshot(parseSnapshot(serializeSnapshot(await source.exportSnapshot())));

    expect((await target.getProject((project001 as Project).id))?.code).toBe(
      (project001 as Project).code,
    );
  });

  it("round-trips closedPeriods through export/import", async () => {
    const source = new IndexedDbStorageAdapter(freshDbName());
    await source.saveProject({ ...(project001 as Project), closedPeriods: ["2026-01", "2026-02"] });

    const target = new IndexedDbStorageAdapter(freshDbName());
    await target.importSnapshot(parseSnapshot(serializeSnapshot(await source.exportSnapshot())));

    expect((await target.getProject((project001 as Project).id))?.closedPeriods).toEqual([
      "2026-01",
      "2026-02",
    ]);
  });

  it("defaults a legacy snapshot's missing closedPeriods to an empty set", () => {
    const json = JSON.stringify({
      schemaVersion: "1",
      exportedAt: "2026-01-01T00:00:00.000Z",
      projects: [withoutClosedPeriods(project001 as Project)],
      actuals: [],
      categoryMappingOverrides: [],
      settingsOverrides: { rateCardOverrides: [] },
    });

    const snapshot = parseSnapshot(json);

    expect(snapshot.projects[0].closedPeriods).toEqual([]);
  });

  it("defaults a legacy snapshot's missing project code to its id", () => {
    const json = JSON.stringify({
      schemaVersion: "1",
      exportedAt: "2026-01-01T00:00:00.000Z",
      projects: [withoutCode(project001 as Project)],
      actuals: [],
      categoryMappingOverrides: [],
      settingsOverrides: { rateCardOverrides: [] },
    });

    const snapshot = parseSnapshot(json);

    expect(snapshot.projects[0].code).toBe((project001 as Project).id);
  });

  it("fails loudly on a case-insensitive project code collision", () => {
    const projectA = { ...(project001 as Project), id: "001", code: "PRO-2601", name: "First" };
    const projectB = { ...(project001 as Project), id: "002", code: "pro-2601", name: "Second" };
    const json = JSON.stringify({
      schemaVersion: "1",
      exportedAt: "2026-01-01T00:00:00.000Z",
      projects: [projectA, projectB],
      actuals: [],
      categoryMappingOverrides: [],
      settingsOverrides: { rateCardOverrides: [] },
    });

    expect(() => parseSnapshot(json)).toThrow(/duplicate project code/i);
    expect(() => parseSnapshot(json)).toThrow(/First/);
    expect(() => parseSnapshot(json)).toThrow(/Second/);
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

describe("IndexedDbStorageAdapter — settings overrides", () => {
  it("returns an empty rate card override by default", async () => {
    const adapter = new IndexedDbStorageAdapter(freshDbName());
    expect(await adapter.getSettingsOverrides()).toEqual({ rateCardOverrides: [] });
  });

  it("persists and reloads overrides across a simulated reload", async () => {
    const dbName = freshDbName();
    const adapter1 = new IndexedDbStorageAdapter(dbName);
    await adapter1.saveSettingsOverrides({
      rateCardOverrides: [{ role: "Senior Developer", ratePerHour: 900 }],
      loadedCostMultiplierOverride: 1.4,
      confidenceBandOverrides: {
        committed: { bandPct: 0 },
        estimated: { bandPct: 15 },
        rough: { bandPct: 35 },
      },
    });

    const adapter2 = new IndexedDbStorageAdapter(dbName);
    expect(await adapter2.getSettingsOverrides()).toEqual({
      rateCardOverrides: [{ role: "Senior Developer", ratePerHour: 900 }],
      loadedCostMultiplierOverride: 1.4,
      confidenceBandOverrides: {
        committed: { bandPct: 0 },
        estimated: { bandPct: 15 },
        rough: { bandPct: 35 },
      },
    });
  });

  it("round-trips settings overrides through export/import", async () => {
    const source = new IndexedDbStorageAdapter(freshDbName());
    await source.saveSettingsOverrides({
      rateCardOverrides: [{ role: "Designer", ratePerHour: 700 }],
    });

    const target = new IndexedDbStorageAdapter(freshDbName());
    await target.importSnapshot(await source.exportSnapshot());

    expect(await target.getSettingsOverrides()).toEqual({
      rateCardOverrides: [{ role: "Designer", ratePerHour: 700 }],
    });
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
