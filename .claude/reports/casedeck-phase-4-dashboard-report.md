# Implementation Report — CaseDeck Phase 4 (Dashboard)

**Plan**: PLAN.md §9 Phase 4   **Branch**: main (direct commits, no PR — solo project, no remote yet)
**Status**: COMPLETE

## Summary

Built the live dashboard (PLAN.md §6.3, minus actuals views — those are Phase 5): headline stat
tiles, a confidence-weighted scenario band chart, a cumulative P&L chart, and a per-category
breakdown with drill-down to every underlying line item. Followed the `dataviz` skill's procedure
(form before color, the documented diverging blue/red pair for the worst/best polarity, fixed mark
specs, tooltip + table-view fallback) rather than hand-picking chart colors. Verified against all
three demo fixtures in a real browser, not just unit tests — including the specific accept-criterion
claim that 003's story "reads clearly," which is a visual/UX judgment a test suite can't make.

## Tasks completed

- `recharts` (CREATE dep)
- `src/app/project/shared.ts` (CREATE) — constants shared between the Inputs editor and the
  Dashboard, extracted during the split below
- `src/app/project/InputsEditor.tsx` (CREATE) — Phase 3's `ProjectEditor` and its subcomponents,
  moved out of `page.tsx` unchanged
- `src/app/_lib/format.ts` (CREATE) — `formatCurrency`, `formatRange`, `formatPercent`
- `src/app/project/Dashboard.tsx` (CREATE) — validation gate, headline stat tiles
- `src/app/project/ScenarioChart.tsx` (CREATE) — margin scenario band chart
- `src/app/project/CumulativeChart.tsx` (CREATE) — cumulative P&L chart
- `src/app/project/CategoryBreakdown.tsx` (CREATE) — per-category table with drill-down
- `src/app/project/ScenarioTooltip.tsx` (CREATE) — shared `ChartTooltip`, `ChartLegend`,
  `ChartDataTable` (the table-view accessibility fallback for both charts)
- `src/app/project/page.tsx` (UPDATE) — now an orchestrator: loads the project, renders
  Dashboard/Inputs tabs (shadcn `Tabs`) over the same `project` state
- `src/engine/scenarios.ts` (UPDATE) — exported `lineScenarioByPeriod` (was private) and added
  `lineScenarioTotal`, the per-line expected/best/worst total the drill-down needed. This is engine
  code, not UI code — a small, tested addition to the deterministic core, not math duplicated in a
  component.
- `src/app/globals.css` (UPDATE) — the `dataviz` skill's reference palette as CSS custom properties
  (`--viz-*`), scoped under both `:root` and `.dark` per the skill's light/dark pattern

## Tests added

One engine test (`scenarios.test.ts`): `lineScenarioTotal` on 001's Senior Developer salary line,
asserting expected/worst/best against hand-computed values (`80h × 750 × 1.35 × 8` months, banded
at its `estimated` ±10% confidence). Engine coverage unaffected: 100% statements/functions/lines,
95.86% branches (unchanged from Phase 2/3 — the new function is fully exercised).

No new component-level tests — Recharts/DOM-heavy dashboard components aren't practical to unit-test
meaningfully with Vitest's node environment, and PLAN.md's Phase 8 Playwright smoke suite is the
planned automated coverage for UI flows. This phase's verification is the manual browser pass below.

## Validation results

- `pnpm lint` / `pnpm typecheck` / `pnpm lint:boundaries` (68 modules, 167 dependencies, 0
  violations) / `pnpm test:coverage` (68/68 tests, coverage unchanged) / `pnpm validate:demo` /
  `pnpm build` (static export, all 4 routes) → all pass
- **Manual browser verification** (agent-browser, real headless Chrome), against all three demo
  fixtures imported via a snapshot built from `demo/projects/*.json` and `demo/actuals/*.csv`:
  - **003 (the flagship story)**: headline Margin tile shows +263,250 NOK in green with a
    "-809,775 – 1,336,275 range" directly beneath it — the "profitable expected, unprofitable worst"
    story is visible without even reaching the chart. The scenario band chart shows the worst (red)
    line dipping below the zero reference line from month 3 onward (when confidence drops from
    `estimated` to `rough`) while best (blue) stays well above — confirmed this **reads clearly**,
    not just computes correctly.
  - **002 (clean case + revenue timing)**: cumulative P&L chart shows the exact trough-then-spike
    shape (deep negative through Q1–Q3, sharp rise to +236,750 at Q4) that `demo/README.md`
    describes. Category breakdown figures (Salary 425,250 / Consultancy 215,000 / Travel 23,000,
    each with its correct range) match Phase 1/2's hand-computed numbers exactly.
  - **001**: Margin tile correctly shows -1,473,600 NOK in red (critical/negative color, per the
    `dataviz` status-token rule: a series that means good/bad wears status tokens, not an arbitrary
    hue). No variance flags shown — correct, actuals views are explicitly Phase 5.
  - **Drill-down**: expanding "Salary" under 002 reveals "Senior Developer — delivery team" with its
    role, rate, confidence, and its own expected/best/worst total — reaches every input line, per
    the accept criterion, not just category totals.
  - **Validation gate**: imported a deliberately invalid project (a `custom` fixed-price allocation
    whose values don't sum to the stated amount). The Dashboard tab rendered *only* the error list
    ("pricingModel.allocation.values: must sum to pricingModel.amount (100000), got 10000") — no
    headline cards, no charts, nothing partial.
  - **Live reactivity**: clicked a quick-adjust "+5 hours" button on the Inputs tab for 001, switched
    to the Dashboard tab, and confirmed Total Cost moved from 1,473,600 to 1,478,663 — exactly
    `5 × 750 × 1.35`. Confirms the one-way input → engine → views flow PLAN.md §6.3 requires.
  - No console errors at any point across this whole pass.

Phase 4 Accept criteria: the 003 screenshot story reads clearly ✓ (verified visually, not assumed);
drill-down reaches every input line ✓; a validation failure renders the error list, never a partial
dashboard ✓.

## Deviations from the plan

- **Dashboard/Inputs as tabs on the same project page**, not separate routes. PLAN.md's file tree
  doesn't specify this; tabs keep both views over identical `project` state with zero fetch/sync
  logic, which is what makes the "quick-adjust updates every figure immediately" requirement trivial
  to satisfy correctly (verified above) rather than something to keep in sync by hand.
- **Chart color came from the `dataviz` skill's reference palette**, not PLAN.md (silent on this).
  Used the documented diverging blue/red pair for worst/best (a polarity signal — margin can be
  positive or negative) rather than picking colors by eye; status-good/critical tokens color the
  headline Margin figure by sign. This is a deliberate investment given PLAN.md §1/§3 name the
  scenario bands as *the* differentiator this whole build is betting on.
- **`lineScenarioByPeriod` is now exported** from `scenarios.ts` (was a private helper) so
  `lineScenarioTotal` could reuse it without duplicating the per-period confidence-resolution logic
  in the UI layer. Minimal, tested engine surface growth, not a UI workaround.
- **No component-level UI tests this phase** — see Tests added. Flagging explicitly since Phase 2/3
  set a precedent of thorough automated testing; the manual browser pass is the intentional
  substitute here, and Phase 8's Playwright suite is where dashboard flows get automated coverage.

## Issues encountered

**A real UX bug caught only by looking at a screenshot, not by any automated check**: headline
stat tiles and category rows originally showed ranges as "worst – best" unconditionally. For
revenue and margin this reads low-to-high (worst is the lower number), but for *cost* worst is the
*higher* number (+band), so the same code produced a high-to-low range next to two low-to-high ones
on the same row — inconsistent and mildly confusing on the actual rendered page, invisible in code
review or a snapshot test. Fixed with a `formatRange` helper that always orders low-to-high
regardless of which value is semantically "worst," re-verified with a fresh screenshot.

## Next

- Phase 5 (Import pipeline + actuals): CSV import UI, actuals entry, and the variance +
  projection-to-complete views that 001's dashboard is currently missing (no red flag yet — that's
  exactly what Phase 5 adds).
- Check back in before starting Phase 5, per the user's chosen incremental scope.
