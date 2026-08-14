# Implementation Report — CaseDeck Phase 3 (Storage + App Shell + Input)

**Plan**: PLAN.md §9 Phase 3   **Branch**: main (direct commits, no PR — solo project, no remote yet)
**Status**: COMPLETE

## Summary

Built the `StorageAdapter` interface and its IndexedDB (Dexie) implementation, a byte-stable JSON
snapshot format for export/import, and the first real UI: an app shell, a project list with
export/import, a setup wizard covering every `Project` field except cost lines, and a per-period
input grid with confidence markers and keyboard-accessible quick-adjust controls. All three Phase 3
accept criteria were verified — two by automated test, one by manual browser testing that also
caught and fixed a real crash bug (see Issues encountered).

## Tasks completed

- `src/storage/types.ts` (CREATE) — `ProjectSummary`, `StoredActualEntry`, `Snapshot`
- `src/storage/storageAdapter.ts` (CREATE) — the `StorageAdapter` interface per PLAN.md §3
- `src/storage/indexedDbAdapter.ts` (CREATE) — Dexie-backed implementation
- `src/storage/snapshot.ts` (CREATE) — canonical, key-ordered `serializeSnapshot`/`parseSnapshot`
- `src/storage/indexedDbAdapter.test.ts` (CREATE) — 12 tests using `fake-indexeddb`
- shadcn/ui init (base-ui primitives, per PLAN.md §3's "Radix/base-ui" allowance) + `dexie`,
  `fake-indexeddb` (CREATE/UPDATE deps)
- `src/app/layout.tsx` (UPDATE) — header nav, real metadata
- `src/app/page.tsx` (UPDATE) — project list, export/import snapshot buttons
- `src/app/setup/page.tsx` (CREATE) — the setup wizard
- `src/app/project/page.tsx` (CREATE) — the input grid, revenue section, add-cost-line form
- `src/components/number-cell.tsx` (CREATE) — the reusable quick-adjust numeric cell
- `src/app/_lib/{storage,activeConfig,download}.ts` (CREATE) — small app-local helpers

## Tests added

10 new storage-layer tests (`fake-indexeddb`, real Dexie code paths, no mocking of the adapter
itself):

- **Create → edit → reload persists**: save a project, "edit" it (a second `saveProject` call),
  then construct a *new* `IndexedDbStorageAdapter` instance against the same database name
  (simulating a page reload, since a reload always constructs a fresh adapter) and confirm the
  edited state reads back.
- **Byte-stable round trip**: export a populated database to JSON, import that JSON into a second,
  empty database, export again, and assert the two JSON strings are identical after normalizing
  only the `exportedAt` timestamp. A second test confirms array order (project/actuals insertion
  order) doesn't affect the serialized output.
- `nextProjectId` sequencing, cascade-delete of a project's actuals, `importSnapshot` replacing
  rather than merging, and `parseSnapshot`'s error paths (invalid JSON, wrong shape).

All 67 project tests (57 from Phase 2 + 10 storage) pass; engine coverage remains
100%/95.86%/100%/100%, unaffected by this phase (storage isn't in the coverage scope, matching
Phase 2's engine-only threshold).

## Validation results

- `pnpm lint` → pass
- `pnpm typecheck` → pass
- `pnpm lint:boundaries` → pass, 0 violations (59 modules, 129 dependencies — up from 23/45 in
  Phase 2, confirming `src/storage` and `src/app` don't leak into the engine-purity boundary)
- `pnpm test:coverage` → 67/67 tests pass, engine coverage unchanged (100/95.86/100/100)
- `pnpm validate:demo` → unaffected, still passes
- `pnpm build` → pass, static export produced for all 4 routes (`/`, `/setup`, `/project`, plus
  `/_not-found`)
- **Manual browser verification** (agent-browser, real headless Chrome — not just unit tests): full
  flow exercised end-to-end — empty state → setup wizard → project created → salary cost line added
  → keyboard-only entry (Tab order: input → increase button → decrease button → next period's
  input, confirmed via `document.activeElement`; typed values via real keystrokes, not
  `fill`/paste) → nudge button activated with `Enter` → full browser reload → both entered values
  (75, 40) still present → project list shows the created project → export button produces no
  console errors. Screenshot saved and reviewed for visual sanity.

Phase 3 Accept criteria: create → edit → reload persists ✓ (both automated and manual); snapshot
export/import round-trips byte-stable modulo timestamps ✓ (automated); keyboard-only entry works in
the grid ✓ (manual, with exact Tab order verified).

## Deviations from the plan

- **Routing uses `?id=` query params, not Next.js dynamic segments** (`/project?id=001`, not
  `/project/[id]`). PLAN.md's file tree just says `app/ # Next.js routes` without specifying shape.
  `output: 'export'` static export can't `generateStaticParams()` for project ids that only exist in
  a user's browser IndexedDB (they don't exist at build time) — query params sidestep this
  entirely and keep the static export simple. This convention should carry forward to Phase 4/5/6
  routes (e.g. a future `?tab=variance`).
- **Setup wizard is a single scrollable form with sections, not a multi-step wizard.** PLAN.md
  says "setup wizard (all Project fields)" without mandating multi-step. All `Project` fields
  except `costs` (added afterward, on the project page) and `id` (auto-assigned) are covered.
  Custom per-period fixed-price allocation isn't exposed in the form (only `even`/`at_period`) —
  the schema/engine still support it; it's stated in the UI as importable via snapshot instead.
  Create-only: there's no metadata-edit mode yet, only cost-line and pricing-model editing on the
  project page.
- **Config is a direct import of `demo/example-group.config.json`**, not yet a formal "demo mode"
  concept — Phase 6 formalizes the role switcher and reset ceremony on top of this same
  build-time-bundled-config mechanism (each deployment is built for one org, per PLAN.md's local-first
  design — there's no backend to fetch config from at runtime).
- **Persist-on-blur/discrete-action, not persist-on-every-keystroke.** Not explicitly specified by
  the plan either way; chosen after the incident below made the cost of the naive approach concrete.

## Issues encountered

**A real crash, found only through manual browser testing — exactly the kind unit tests can't
catch.** Initial implementation called `storage.saveProject()` (an IndexedDB write) on every
keystroke inside the grid's number inputs. During the keyboard-only-entry verification, the browser
tab crashed to `about:blank` mid-test, losing all in-memory state; the dev server log showed
`unhandledRejection: AbortError: QuotaExceededError`. Root-caused to the write-per-keystroke design
(each character typed opened a new Dexie/IndexedDB transaction) and fixed by splitting the grid's
change handling into two paths: keystroke-level `onChange` now only updates local React state
(instant visual feedback, zero IndexedDB writes), while `onBlur` and discrete actions (confidence
select, quick-adjust buttons, add/remove line) call the actual persist path. Also wrapped the
persist call in try/catch with a visible inline error banner, so a future write failure degrades
gracefully instead of crashing the tab. Re-ran the full manual verification twice more afterward
(fresh browser sessions, deliberately isolated single-field reproductions) with no recurrence.
Residual uncertainty: I could not produce a minimal, deterministic repro of the exact
`QuotaExceededError` after the fix (a couple of subsequent `about:blank` blips during the
investigation appeared unrelated to typing — the fix was validated by the crash's absence across
several clean full runs post-fix, not by confirming the original trigger precisely). Given the fix
is independently good practice (fewer writes, graceful failure handling) regardless of the exact
root cause, shipping it was the right call rather than continuing to chase an intermittent repro.

**Base UI console warning**: `<Button render={<Link .../>}>` needs an explicit `nativeButton={false}`
prop when the rendered element isn't a real `<button>` (base-ui, unlike Radix's `asChild`, defaults
to assuming the render target is a native button and warns otherwise). Fixed both occurrences in
`src/app/page.tsx`; caught by console-log inspection during manual testing, not by lint or
typecheck.

## Next

- Phase 4 (Dashboard): headline cards, scenario band chart, cumulative P&L, per-category
  drill-down — the first real consumer of `computeProjectScenarios` in the UI.
- Check back in before starting Phase 4, per the user's chosen incremental scope.
