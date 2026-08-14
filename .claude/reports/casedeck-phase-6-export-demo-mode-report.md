# Implementation Report — CaseDeck Phase 6 (Export + Demo Mode)

**Plan**: PLAN.md §9 Phase 6   **Branch**: main (direct commits, no PR — solo project, no remote yet)
**Status**: COMPLETE

## Summary

Built the business-case HTML export (a pure, DOM-free SVG chart generator plus a self-contained
HTML renderer) and demo mode (Planner/Viewer role switcher, first-boot auto-load, "Demo data —
reset"). Verified every accept criterion in a real browser, including opening the actual downloaded
export file from `file://` with the browser's network access restricted and confirming zero
requests beyond the document itself — and caught two real, only-visible-when-rendered layout bugs
in the exported chart that no unit test could have found.

## Tasks completed

- Added a shared "demo viewer persona" (Erik Solberg, Head of Delivery) to `demo/projects/001` and
  `003`'s stakeholders, documented in `demo/README.md` — see Deviations for why this needed a small
  demo-data edit rather than being purely additive
- `src/export/charts.ts` (CREATE) — pure-function SVG generator for the scenario band chart and
  cumulative P&L chart, no DOM/browser APIs
- `src/export/businessCase.ts` (CREATE) — the full self-contained HTML renderer: header, executive
  summary slot, scenario summary with explicit band definitions, per-period table, both inline SVG
  charts, cost-by-category, budget-vs-actual (conditional on actuals existing), assumptions &
  dependencies, footer. HTML-escapes all user-provided text (project name, narrative fields).
  Refuses (returns validation errors) rather than emit broken numbers, same rule as the Dashboard.
- `src/export/charts.test.ts`, `businessCase.test.ts` (CREATE) — see Tests added
- `.dependency-cruiser.cjs` (UPDATE) — extended the engine-purity boundary to cover `src/export/`
- `src/app/_lib/demoSnapshot.ts` (CREATE) — the canonical Example Group dataset (3 projects + all
  real actuals, with correct file/row provenance) as a typed `Snapshot` constant, used for both
  first-boot and reset
- `src/app/_lib/demoSnapshot.test.ts` (CREATE) — re-runs the Phase 2/5 planted-story assertions
  against the bundled snapshot, directly satisfying the "reset restores planted stories exactly"
  accept criterion as an automated regression test, not just a manual check
- `src/app/_lib/demoViewer.ts` (CREATE) — `DEMO_VIEWER_EMAIL` + `isViewerVisible()`, deriving
  Viewer-role project visibility from a stakeholder match, not a hardcoded id list
- `src/app/_lib/RoleProvider.tsx` (CREATE) — `useSyncExternalStore`-backed role context (see Issues
  encountered for why not a `useEffect`)
- `src/components/demo-header.tsx` (CREATE) — role switcher + reset control
- `src/storage/types.ts`, `indexedDbAdapter.ts` (UPDATE) — `ProjectSummary` now carries
  `stakeholders`, so the project list can filter for Viewer visibility without a second fetch
- `src/app/layout.tsx`, `page.tsx`, `setup/page.tsx`, `project/page.tsx`, `InputsEditor.tsx`,
  `ActualsTab.tsx` (UPDATE) — role wiring: first-boot auto-load, Viewer-filtered project list,
  New/Import hidden for Viewer, setup wizard blocked for Viewer, direct-URL access to a
  non-visible project blocked, `<fieldset disabled>` gating on Inputs/Actuals (see Deviations for
  why fieldset over prop-threading)
- `src/app/project/ExportTab.tsx` (CREATE) — narrative textareas, validation gate, download button
- `src/app/project/page.tsx` (UPDATE) — fourth "Export" tab

## Tests added

21 new tests across 3 files:

- **`charts.test.ts`** (5 tests): well-formed SVG with no external resource references (a required
  `xmlns` URI isn't a network request — see Issues encountered for the false-positive this first
  version of the assertion produced), period labels are XML-escaped, the zero reference line only
  appears when the data range actually crosses zero, cumulative chart computes running totals,
  currency formatting for whole/thousands units.
- **`businessCase.test.ts`** (11 tests), against the real demo fixtures: 003's exact planted numbers
  appear in the rendered HTML (263,250 / -809,775 / 1,336,275), confidence bands stated explicitly
  (±0%/±10%/±30%), exactly 2 inline `<svg>` elements, budget-vs-actual section appears for 001 (with
  actuals) and is *absent* for 003 (without), self-contained (no `<link>`, `<script src>`, `<img
  src="http...">`), invalid projects are refused with the validation error list, and — because this
  file gets opened by whoever the export is sent to — explicit XSS tests: a project named
  `<script>alert(1)</script> & Co` and an executive summary containing `<img src=x
  onerror=alert(1)>` are confirmed HTML-escaped, not injected raw.
- **`demoSnapshot.test.ts`** (5 tests): the bundled snapshot reproduces 001's consultancy-red/
  salary-ok/total-warning variance exactly, 002's three-loss-quarters-then-profitable-total shape,
  003's profitable-expected/negative-worst scenario spread, and confirms every actual entry carries
  real file/row provenance (not the "undefined (row undefined)" placeholder a prior ad-hoc test
  script produced in Phase 5).

104 total tests pass (83 before this phase, +21 new). Engine coverage unchanged
(100%/95.86%/100%/100% — this phase added no engine code).

## Validation results

- `pnpm lint` / `pnpm typecheck` / `pnpm lint:boundaries` (86 modules, 258 dependencies, 0
  violations — `src/export/` now held to the same react/next/DOM-free boundary as `src/engine/` and
  `src/import/`) / `pnpm test:coverage` (104/104) / `pnpm validate:demo` / `pnpm build` → all pass
- **Manual browser verification** (agent-browser, real headless Chrome):
  - **First boot**: fresh session, empty IndexedDB → Example Group auto-loads with all three
    projects, no console errors.
  - **Viewer role**: switching to Viewer shows exactly 001 and 003 in the project list; "Import
    snapshot" and "New project" disappear; "Export snapshot" (a read action) stays available.
    Direct navigation to `/project?id=002` while in Viewer role is blocked with an explicit message,
    not a silent redirect. On an accessible project (001), confirmed via `element.matches(":disabled")`
    (the spec-correct check — the element's own `.disabled` IDL property does *not* reflect
    fieldset-inherited disabling, only the pseudo-class does) that every input, select, and
    nudge button on both the Inputs and Actuals tabs is genuinely non-interactive, not just styled
    to look that way.
  - **Reset**: edited 001's Senior Developer January hours to 999, confirmed the confirm() dialog
    appears (accepted it via `dialog accept`), confirmed the value reverted to 80 after reset, and
    confirmed the Dashboard's Budget-vs-actual section still shows the exact planted numbers
    (Consultancy 318,500/558,500/480,000/528,000, "Over budget") — reset didn't just restore the
    project shell, it restored the actuals and the derived story too.
  - **Export, from `file://` with network disabled**: generated 003's business case through the
    real UI, opened the actual downloaded file via `agent-browser --allowed-domains "" open
    file://...`, and confirmed via `network requests` that exactly **one** request fired — the
    document load itself, nothing else. All figures matched the live dashboard exactly. Caught two
    real rendering bugs this way (see Issues encountered) that no unit test could have surfaced,
    since they're layout/spacing defects only visible in the rendered SVG.

Phase 6 Accept criteria: export opens from `file://` with network disabled ✓ (verified with an
actual network-request count, not just "it looked fine"); Viewer sees exactly 001 and 003, read-only
✓; reset restores planted stories exactly ✓ (both a real browser interaction and an automated engine
fixture test — `demoSnapshot.test.ts` — re-run against the reset state, per the criterion's own
wording).

## Deviations from the plan

- **001 and 003's demo data needed a small, deliberate edit**: PLAN.md §5 says Viewer "sees only
  projects where the demo viewer persona is tagged: 001 and 003," but Phase 1's stakeholder data
  (written before Phase 6 existed) had three *different* people marked `viewer: true` across the
  three projects — no single shared identity to derive "001 and 003, not 002" from. Rather than
  hardcode a project-id allowlist in application code (which would silently drift from the data the
  moment a new project is added), added one consistent stakeholder — Erik Solberg, Head of Delivery
  — to 001 and 003 specifically, leaving 002's own (unrelated) customer-contact `viewer: true`
  stakeholder untouched. This is a Phase 1 demo-data touch-up made in Phase 6 because Phase 6 is
  what first needed it; documented in `demo/README.md`'s new "Demo mode" section with the narrative
  rationale (a delivery lead watching the overrun and the wide-uncertainty projects, not the
  completed one).
- **`<fieldset disabled>` instead of threading a `readOnly` prop through every input/select/button.**
  Standard HTML behavior: every descendant form control of a disabled fieldset becomes genuinely
  non-interactive, at any nesting depth, with zero risk of missing one. Verified this is real
  browser behavior (not just visual styling) via `:disabled` pseudo-class checks in the browser
  pass above. Chosen over prop-threading because `NumberCell`'s internal nudge buttons would
  otherwise have needed their own `readOnly` handling too.
- **`useSyncExternalStore` instead of `useEffect` for reading the role from localStorage.** A
  `useEffect`-based "read localStorage on mount, then setState" pattern is both what the new
  `react-hooks/set-state-in-effect` lint rule flags and a genuine SSR/hydration-mismatch risk (the
  server has no `window`, so it can't know a saved "viewer" preference — its render and the client's
  *first* render would disagree). `useSyncExternalStore` is React's own designed-for-this-exact-case
  primitive: it uses the server snapshot for both the server render and the client's initial
  hydration pass, then switches to the real value immediately after, with no mismatch and no effect.
- **Budget CSV import remains deferred** (from Phase 5's deviation note) — still no caller for it,
  still natural Phase 7 `/setup` skill territory.

## Issues encountered

**Two real chart rendering bugs, found only by opening the actual downloaded file, not by unit
tests or code review.** (1) The chart legend overlapped the topmost Y-axis gridline label ("Worst
case" printed through "300,000 NOK") — the reserved legend spacing and `margin.top` were both too
tight. (2) The last period's X-axis label was clipped at the SVG's right edge ("2027-03" rendered as
"2027-0") — `margin.right` didn't leave room for a center-anchored label sitting at the very last
data point. Both are the kind of defect that passes every "does the SVG contain the right numbers"
assertion while looking visibly broken — fixed by adjusting `margin.top` (16→28) and `margin.right`
(16→32) in `src/export/charts.ts`, then re-generated and re-viewed the actual file to confirm both
fixes, not just re-running the test suite.

**A false-positive in my own first test**: `expect(svg).not.toMatch(/https?:\/\//)` failed because
`xmlns="http://www.w3.org/2000/svg"` — a required SVG namespace declaration, not a network
request — matched the pattern. Fixed by checking for actual resource-loading constructs
(`<image>`, `xlink:href`, `url(https:...)`, `<script src>`, `<img src="http...">`) instead of a
blanket substring match. Worth noting because the *real* file:// verification (network request
count) is what actually proves the no-network claim; the unit test's job is closer to "would this
regress obviously," and needed correcting to test the right thing.

## Next

- Phase 7 (Skills): `/setup` (budget interpretation interview, the first real caller for a budget
  CSV importer) and `/business-case` (narrative drafting — this phase's executive summary/risk
  commentary textareas are exactly where that skill's output gets pasted).
- Check back in before starting Phase 7, per the user's chosen incremental scope.
