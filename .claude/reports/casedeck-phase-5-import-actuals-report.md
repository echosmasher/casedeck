# Implementation Report — CaseDeck Phase 5 (Import Pipeline + Actuals)

**Plan**: PLAN.md §9 Phase 5   **Branch**: main (direct commits, no PR — solo project, no remote yet)
**Status**: COMPLETE

## Summary

Built the actuals import pipeline (PLAN.md §6.2), a full preview/resolve/commit UI, manual actuals
entry, and the budget-vs-actual variance section on the Dashboard (wired to Phase 2's
`computeVariance`, unused by any UI until now). Verified every accept criterion in a real browser
against the actual demo fixtures, not synthetic stand-ins — including watching the unmapped-code
resolution survive a full page reload and auto-apply to a re-uploaded file without re-asking.

## Tasks completed

- `src/storage/types.ts` / `storageAdapter.ts` / `indexedDbAdapter.ts` (UPDATE) — added
  `CategoryMappingOverride`, a new Dexie table (org-level, not project-scoped — account codes
  aren't project-specific), `deleteActual`, and included overrides in the `Snapshot` format
  (backward-compatible: `parseSnapshot` defaults the field to `[]` for older exports)
- `papaparse` + `@types/papaparse` (CREATE deps)
- `src/import/csv.ts` (CREATE) — delimiter detection, row parsing, and the decimal-convention rule
  from DATA_REQUIREMENTS.md (a comma-delimited file can't carry a decimal comma by construction; a
  semicolon-delimited file's decimal convention is inferred from the values)
- `src/import/actuals.ts` (CREATE) — parses + validates an actuals CSV into accepted/rejected/
  unmapped/ignored buckets, using the engine's `formatImportRowError` for the exact three
  DATA_REQUIREMENTS.md message formats
- `src/import/actuals.test.ts` (CREATE) — see Tests added
- `src/app/_lib/categoryMapping.ts` (CREATE) — merges the bundled org config with stored overrides
- `src/app/project/ActualsTab.tsx` (CREATE) — CSV import (preview, unmapped-code resolution,
  "import valid rows only", commit), manual entry form, recorded-actuals list with delete
- `src/app/project/VarianceSection.tsx` (CREATE) — budget-vs-actual table on the Dashboard, using
  `computeVariance` (built in Phase 2, had no UI consumer until now), status-token flags
  (good/warning/critical, icon + label per the `dataviz` skill's status-palette rule)
- `src/app/project/Dashboard.tsx`, `page.tsx` (UPDATE) — third "Actuals" tab, actuals state lifted
  to the page level and threaded to both Dashboard and ActualsTab
- `src/app/globals.css` (UPDATE) — added the fixed status-color tokens (`--viz-status-*`), distinct
  from the text-delta tokens Phase 4 added (palette.md documents these as two different roles that
  happen to share a "good" hex in one case — kept them as separate tokens rather than conflating)
- `vitest.config.mts` (UPDATE) — see Issues encountered: added the missing `@/*` alias resolution

## Tests added

10 new import-pipeline tests (`src/import/actuals.test.ts`), run against the real fixture files
under `demo/`, not synthetic strings:

- **`broken-example.csv` produces the three documented error messages verbatim** — byte-for-byte
  string equality against the exact text in `DATA_REQUIREMENTS.md`, plus confirms the 3 well-formed
  rows are accepted with correct category totals, and that every one of the 6 data rows is
  accounted for (accepted + rejected + ignored === total, nothing silently dropped).
- **001's four real actuals files** parse with zero rejections, and their per-month/per-category
  totals match `demo/README.md`'s numbers exactly (salary 497,300 / consultancy 318,500 across the
  four months).
- **002's Nordic-format file**: confirms `{ delimiter: ";", decimal: "," }` is detected correctly
  and the semicolon/decimal-comma rows parse to the right totals.
- **Category mapping resolution**: an `ignore`-mapped code is excluded from both accepted and
  rejected (not an error, not a cost); re-parsing the same text with an updated mapping (simulating
  what the UI does after a resolve) turns a previously-unmapped row into an accepted one.

83 total tests pass (was 73 after Phase 4's storage additions); engine coverage unchanged
(100%/95.86%/100%/100% — Phase 5 added no engine code, `computeVariance` was already tested in
Phase 2).

## Validation results

- `pnpm lint` / `pnpm typecheck` / `pnpm lint:boundaries` (76 modules, 205 dependencies, 0
  violations — `src/import/` is held to the same react/next/DOM-free boundary as `src/engine/`) /
  `pnpm test:coverage` (83/83) / `pnpm validate:demo` / `pnpm build` → all pass
- **Manual browser verification** (agent-browser, real headless Chrome), against 001's actual demo
  fixtures:
  - Imported the pre-built demo snapshot (001/002/003 + all of 001's and 002's real actuals) and
    confirmed the Dashboard's new "Budget vs. actual" table shows **Consultancy: "Over budget"**
    (red, `AlertCircle`) with actual-to-date 318,500 / projection-to-complete 558,500 / worst
    ceiling 528,000; **Salary: "On track"** (green); **Total: "Watch"** (amber) — all four numbers
    match `demo/README.md`'s hand-computed figures exactly.
  - Uploaded `broken-example.csv` through the real Actuals-tab file picker: preview showed all
    three documented error messages verbatim (confirmed by reading the rendered page, not just the
    test), the unmapped code 6234, and correct per-category totals for the 3 accepted rows.
  - Resolved 6234 → "Other Direct Costs" via the dropdown: the row moved from unmapped/rejected to
    accepted live, no re-upload needed (3 accepted → 4 accepted).
  - Checked "import valid rows only" (required — the remaining 2 rejected rows are unfixable
    without editing the source file) and committed; the new entries showed correct
    `sourceFile`/`sourceRow` provenance in the recorded-actuals list.
  - **Re-uploaded the same file** (new browser navigation, i.e. after a full page reload — not just
    revisiting React state): 6234 was accepted immediately with zero unmapped codes shown, no
    re-prompt. Confirms the mapping choice is real IndexedDB persistence, not just in-memory state,
    and auto-applies exactly as the accept criterion requires.
  - Manual entry and delete both verified working (added a manual entry, confirmed it appeared
    with `source: manual`, deleted it, confirmed it was gone).

Phase 5 Accept criteria: importing 001's four actuals files surfaces the consultancy overrun with a
red flag ✓; `broken-example.csv` produces the three documented error messages verbatim, file/row/
column named ✓; mapping choices persist and auto-apply to the next file ✓ (verified across an
actual page reload, not just a re-render).

## Deviations from the plan

- **Budget CSV parsing is deferred, not built this phase.** PLAN.md §6.2 describes "one pipeline,
  two sources," but Phase 5's accept criteria are entirely actuals-specific, and nothing in the app
  yet consumes a budget-CSV importer (project creation goes through the Phase 3 wizard + grid).
  `src/import/csv.ts`'s primitives (delimiter/decimal detection, locale number parsing) are written
  generically so a `budget.ts` sibling can reuse them without rework — but building it now, with no
  caller, would be speculative. It's a natural fit for Phase 7's `/setup` skill, which explicitly
  needs a deterministic parser to hand real budget files to.
- **Unknown account codes are simultaneously a rejection reason and an interactively-resolvable
  item.** DATA_REQUIREMENTS.md documents the unknown-code case as one of three *error* messages;
  PLAN.md §6.2 separately describes unmapped codes as something the user *resolves* in the preview.
  Implemented both: the row is rejected (with the exact documented message) *and* surfaced in a
  distinct "Unmapped account codes" section with a resolve control — resolving it re-parses the
  file (the UI already has the raw text) rather than trying to patch the previous result in place,
  which is simpler and can't drift from a fresh parse.
- **Category mapping overrides are global, not per-project** — account codes are an org-level
  concept (PLAN.md §4), matching how the bundled `activeConfig.categoryMapping` itself works.
- **Status color tokens added as a separate set from Phase 4's text-delta tokens**
  (`--viz-status-good` etc. vs. `--viz-good`), even though "good" coincidentally shares a hex value
  in dark mode — `references/palette.md` documents these as two different roles (status badges vs.
  signed-figure text), and conflating them would make a future palette update to one silently touch
  the other.

## Issues encountered

**A real, previously-invisible gap in the test setup**: `vitest.config.mts` never configured the
`@/*` alias Next.js and `tsconfig.json` both use. Every prior `@/engine/...` import in `src/storage/`
was `import type` — which TypeScript erases before module resolution ever runs — so this went
undetected through Phases 3 and 4. `src/import/actuals.ts`'s first *value* import across that alias
(`formatImportRowError`) failed immediately at test time. Fixed by adding a matching
`resolve.alias` to `vitest.config.mts`. Worth flagging because it means any future `import type`
that becomes a value import elsewhere in the codebase would have hit the same silent gap — now closed.

**Test-data artifact, not an app bug**: the scratch snapshot I built for manual verification (from
`demo/projects/*.json` + `demo/actuals/*.csv`, via a throwaway Node script) didn't set
`sourceFile`/`sourceRow` on its `ActualEntry` objects, so those rows displayed "undefined (row
undefined)" in the recorded-actuals list. Confirmed this was my test data, not the app, by
committing a real file through the actual UI and seeing correct provenance (`broken-example.csv
(row 6)`) appear immediately.

## Next

- Phase 6 (Export + demo mode): the business-case HTML export and the role switcher / demo-boot
  ceremony. This is also where the "demo mode" concept PLAN.md keeps deferring finally needs a home
  — `src/app/_lib/activeConfig.ts`'s "direct bundled-config import" comment has said "Phase 6
  formalizes this" since Phase 3.
- Check back in before starting Phase 6, per the user's chosen incremental scope.
