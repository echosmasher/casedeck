// The canonical Example Group demo dataset — used for first-boot (an empty database loads this
// automatically) and for the "Demo data — reset" control (PLAN.md §5). Numbers here are the same
// ones verified independently in demo/README.md, the Phase 2 engine fixture tests, and the Phase 5
// import-pipeline tests against the real CSV files — this module doesn't introduce new figures, it
// just packages the already-verified planted stories as a loadable Snapshot. sourceFile/sourceRow
// on each actual entry match the real row numbers in demo/actuals/ (1-indexed data rows, excluding
// the header), so this looks exactly like what actually importing those files would produce.
import type { Project } from "@/engine/model";
import { SNAPSHOT_SCHEMA_VERSION, type Snapshot, type StoredActualEntry } from "@/storage/types";
import project001 from "../../../demo/projects/001-intranet-relaunch.json";
import project002 from "../../../demo/projects/002-booking-integration-example-hotel-a.json";
import project003 from "../../../demo/projects/003-erp-data-migration.json";

function actual(
  id: string,
  projectId: string,
  period: string,
  category: string,
  amount: number,
  description: string,
  sourceFile: string,
  sourceRow: number,
): StoredActualEntry {
  return { id, projectId, period, category, amount, description, source: "csv", sourceFile, sourceRow };
}

// demo/actuals/001-actuals-2026-0{1..4}.csv — Story 1, the overrun.
const actuals001: StoredActualEntry[] = [
  actual("001-a1", "001", "2026-01", "salary", 124200, "Payroll run — Intranet Relaunch allocation", "001-actuals-2026-01.csv", 1),
  actual("001-a2", "001", "2026-01", "consultancy", 60000, "CMS vendor invoice #INV-1001", "001-actuals-2026-01.csv", 2),
  actual("001-a3", "001", "2026-02", "salary", 123700, "Payroll run — Intranet Relaunch allocation", "001-actuals-2026-02.csv", 1),
  actual("001-a4", "001", "2026-02", "consultancy", 86000, "CMS vendor invoice #INV-1014 (scope change — integration rework)", "001-actuals-2026-02.csv", 2),
  actual("001-a5", "001", "2026-03", "salary", 125300, "Payroll run — Intranet Relaunch allocation", "001-actuals-2026-03.csv", 1),
  actual("001-a6", "001", "2026-03", "consultancy", 87500, "CMS vendor invoice #INV-1029", "001-actuals-2026-03.csv", 2),
  actual("001-a7", "001", "2026-04", "salary", 124100, "Payroll run — Intranet Relaunch allocation", "001-actuals-2026-04.csv", 1),
  actual("001-a8", "001", "2026-04", "consultancy", 85000, "CMS vendor invoice #INV-1042", "001-actuals-2026-04.csv", 2),
];

// demo/actuals/002-actuals-full-lifetime.csv — Story 2, the clean case.
const actuals002: StoredActualEntry[] = [
  actual("002-a1", "002", "2025-Q1", "salary", 123000, "Lønn Q1 — Booking Integration allokering", "002-actuals-full-lifetime.csv", 1),
  actual("002-a2", "002", "2025-Q1", "consultancy", 61500, "Konsulentfaktura API-integrasjon Q1", "002-actuals-full-lifetime.csv", 2),
  actual("002-a3", "002", "2025-Q1", "travel", 8300, "Reisekostnader Q1", "002-actuals-full-lifetime.csv", 3),
  actual("002-a4", "002", "2025-Q2", "salary", 120000, "Lønn Q2 — Booking Integration allokering", "002-actuals-full-lifetime.csv", 4),
  actual("002-a5", "002", "2025-Q2", "consultancy", 64000, "Konsulentfaktura API-integrasjon Q2", "002-actuals-full-lifetime.csv", 5),
  actual("002-a6", "002", "2025-Q2", "travel", 7600, "Reisekostnader Q2", "002-actuals-full-lifetime.csv", 6),
  actual("002-a7", "002", "2025-Q3", "salary", 124000, "Lønn Q3 — Booking Integration allokering", "002-actuals-full-lifetime.csv", 7),
  actual("002-a8", "002", "2025-Q3", "consultancy", 67000, "Konsulentfaktura API-integrasjon Q3", "002-actuals-full-lifetime.csv", 8),
  actual("002-a9", "002", "2025-Q3", "travel", 5200, "Reisekostnader Q3", "002-actuals-full-lifetime.csv", 9),
  actual("002-a10", "002", "2025-Q4", "salary", 59500, "Lønn Q4 — Booking Integration allokering", "002-actuals-full-lifetime.csv", 10),
  actual("002-a11", "002", "2025-Q4", "consultancy", 24000, "Konsulentfaktura API-integrasjon Q4", "002-actuals-full-lifetime.csv", 11),
  actual("002-a12", "002", "2025-Q4", "travel", 1900, "Reisekostnader Q4", "002-actuals-full-lifetime.csv", 12),
];

export const demoSnapshot: Snapshot = {
  schemaVersion: SNAPSHOT_SCHEMA_VERSION,
  exportedAt: "2026-08-14T00:00:00.000Z",
  projects: [project001, project002, project003] as Project[],
  actuals: [...actuals001, ...actuals002],
  categoryMappingOverrides: [],
  settingsOverrides: { rateCardOverrides: [] },
};
