# DASHBOARD-CRITIQUE-PLAN.md — Project dashboard design fixes

> Plan from `/impeccable critique` of the project dashboard (`src/app/project/`), 2026-10-12.
> Baseline score **21/40 (Acceptable)**, 1 × P0, 3 × P1, 1 × P2. Full report:
> `.impeccable/critique/2026-10-12T08-27-58Z__src-app-project-page-tsx.md`.
> Follow phases in order — each phase ships independently and leaves the app green (tests, lint,
> typecheck, `lint:boundaries`, e2e). Where this plan is silent, follow CLAUDE.md / AGENTS.md.

---

## 0. Decisions locked in

- **Priority:** safe close-period / delete-actual (the P0) ships first.
- **Headline tone:** go properly *editorial* — a sentence-style verdict above the numbers and a
  stronger type scale. This extends DESIGN.md ("Precision Editorial Finance"); the type ramp in
  DESIGN.md gets updated to match what ships.
- **Scope:** all five priority issues (P0, 3 × P1, P2). Minor observations are folded into the
  phase that already touches the same file; nothing else is in scope.
- **Engine boundary:** any new number the headline shows (budget totals, variance %, status) is
  computed in `src/engine/` as a pure, unit-tested function. The UI only formats. Overdue stays a
  UI-layer check against today's date (`src/app/_lib/overdue.ts`), as in QA round 2.

---

## Suggested order

| # | Phase | Issue | Command(s) |
|---|---|---|---|
| 1 | Safe period closing and deletes | P0 | `/impeccable harden` |
| 2 | Headline verdict — direction | P1 | `/impeccable shape` |
| 3 | Headline verdict — build | P1 | `/impeccable layout` → `/impeccable typeset` → `/impeccable clarify` |
| 4 | Contrast and colour-only meaning | P1 | `/impeccable audit` → `/impeccable colorize` |
| 5 | Mobile layout | P1 | `/impeccable adapt` |
| 6 | Chart precision + final pass | P2 | `/impeccable polish` |
| 7 | Re-score | — | `/impeccable critique` |

Why this order: the P0 is a data-integrity risk and has no visual dependencies. The headline
changes the page's structure and type scale, so contrast tokens, the mobile layout, and chart
polish all go *after* it — otherwise they get done twice. Contrast comes before mobile because
the token changes are global and mobile verification should see the final colours.

---

## Phase 1 — Safe period closing and deletes (P0) · `/impeccable harden`

**1a. Close-period select stops committing on change** (`src/app/project/ActualsTab.tsx`)
- Today `onChange` → `handleChange` saves immediately (line ~107); keyboard arrowing closes and
  reopens a period per keypress.
- Split pick from apply: the select only sets a pending value; an **Apply** button commits it.
- Before apply, show an inline preview of the change: which periods switch from projected to
  actuals (or back), and for each newly closed period whether it has any actuals recorded.
- Closing a period with **no actuals** shows a warning in the preview ("2026-05 has no actuals —
  it will count as 0 cost / 0 revenue") and needs an explicit confirm.
- After apply: a visible success state naming the new boundary ("Actuals through 2026-05").
- Fold in: fix the select ignoring `w-fit` (`selectClass` width).

**1b. Undoable delete of an actual** (`ActualsTab.tsx` ~line 528)
- Delete stays one click but shows an undo toast/inline row ("Deleted 2026-01 · cost 12,000 —
  Undo") for ~8 s; the undo restores through `StorageAdapter`.
- Make the delete `aria-label` unique: period + category/line + amount.

**Tests:** unit tests for the preview/diff helper (pure, in `src/app/project/` or `_lib`);
e2e: keyboard-arrow the select does not change `closedPeriods`; apply commits; delete → undo
restores the row.

---

## Phase 2 — Headline verdict: direction (P1) · `/impeccable shape`

- `PRODUCT.md` does not exist yet; `shape` will run `init` first to capture product context
  (users: FP&A leads / CFOs; the dashboard answers "on budget? profitable?").
- Decide, with comps, the editorial headline treatment:
  - Customer project: e.g. *"Projected margin 412k NOK — 5% under budget · Watch"*.
  - Internal project: lead with **cost vs. budget**, not margin. Revenue/Margin tiles are
    hidden or demoted for `type === "internal"`.
  - Where status, overdue, and the actuals/projected line live relative to the headline.
  - The new type scale (display size for the verdict, how tiles step down beneath it).
- Output: an approved direction and the DESIGN.md type-ramp change to make in Phase 3.

---

## Phase 3 — Headline verdict: build (P1) · `/impeccable layout` → `typeset` → `clarify`

**3a. Engine** (`src/engine/blended.ts` or new pure module)
- Add budget totals (`budgeted.cost/revenue/margin`) and variance vs. budget (absolute, %) to
  the blended output if not already derivable from an existing engine function. Reuse the
  status thresholds `VarianceSection` already uses — do not invent new ones in the UI.
- Unit tests for customer, internal, all-closed, and no-closed projects.

**3b. Layout** (`Dashboard.tsx`, `page.tsx`)
- Headline block above the tiles; tiles become supporting evidence, not three equals.
- Internal projects: cost-vs-budget framing (no red "loss" headline for expected negative margin).
- Header: map status through the same `STATUS_LABEL` used on the overview (`src/app/page.tsx:25`
  — extract to `_lib` so overview, dashboard, and export share one map); add the Overdue marker
  using `isProjectOverdue` (red + text, never colour alone).
- Fold in: drop the internal id "001" from the metadata line; align "Back to projects" and Edit
  into one nav style.

**3c. Typeset** — apply the Phase 2 scale; update the `typography` block in DESIGN.md to match.

**3d. Clarify** (`src/app/_lib/format.ts`, copy across the dashboard)
- `formatRange`: when best == worst show a single value; render negative ranges readably
  ("−1.63M to −1.48M NOK", true minus sign).
- Headline sentence copy; explain confidence levels and band % in context (Inputs tab hint).
- Fold in: Export textarea placeholder no longer mentions "the /business-case skill".
- Fold in: actuals table amounts get currency and right alignment with `tabular-nums`.

**Open question (do not build without a decision):** should the business-case export
(`src/export/`) carry the same headline verdict? Default: no, this phase is dashboard-only.

---

## Phase 4 — Contrast and colour-only meaning (P1) · `/impeccable audit` → `/impeccable colorize`

- `audit` first to get the full measured list; known failures:
  - Chart axis ticks `--viz-text-muted` `#a1a1aa` (~2.6:1) — `ScenarioChart.tsx:82,90`,
    `CumulativeChart.tsx`. Move to `#71717a` or darker.
  - Status pills: Watch `#d97706` on `#fffbeb` 3.1:1, On track `#059669` on `#ecfdf5` 3.6:1,
    Over budget `#e11d48` on `#fff1f2` 4.3:1. Darken *text* tokens (e.g. 700/800 shades, as
    DESIGN.md already specifies for pill text) to ≥ 4.5:1.
  - Inputs sticky headers `muted-foreground` on `muted` 4.4:1.
- `colorize`: worst vs. best scenario lines must differ by more than red/blue — direct end-of-line
  labels or distinct dash patterns; make the "Actuals" legend swatch visible.
- Change tokens in `globals.css` only; the export SVG (`src/export/charts.ts`) mirrors the same
  values so dashboard and export stay consistent.

---

## Phase 5 — Mobile layout (P1) · `/impeccable adapt`

- At 390 px the page renders 439 px wide; fix to zero horizontal page overflow.
- Header (`page.tsx` ~line 111): `flex-wrap`, title and badges wrap cleanly with long names.
- Budget-vs-actual table: stacked per-category rows below `sm`; other tables in
  `overflow-x-auto` with a sticky first column and a visible scroll affordance.
- Inputs grid: hint that later periods scroll.
- Verify at 390 px and at 200 % zoom on 1440 px (same overflow class).

---

## Phase 6 — Chart precision + final pass (P2) · `/impeccable polish`

- Y-axis: currency once in the axis title, compact ticks only — stops the wrapped "NOK" colliding
  with the first x label. Widen the axis if needed.
- Label the actual/forecast boundary ("Actuals | Forecast") at the shading edge; align the dashed
  divider with the end of the shading (`ChartActualsOverlay.tsx`, `actualsBoundary.ts`).
- Tooltip text to ≥ 11 px (`ScenarioTooltip.tsx:40`, `text-[0.65rem]`).
- Give each chart SVG an accessible name/summary; "View as table" stays the full fallback.
- Fold in: "Hide completed" checkbox toned down on the overview.
- Final polish sweep of every touched surface; run `impeccable detect` on changed files.

---

## Phase 7 — Re-score · `/impeccable critique`

Re-run the critique on `src/app/project/page.tsx` to compare against the 21/40 baseline.
Target: no P0/P1 left; heuristics 2, 3, 4 and 5 at ≥ 3.

---

## Not in scope (noted for later)

- Keyboard shortcuts, tab state in the URL (`?tab=actuals`), fill-right / paste-a-row and row
  totals in the Inputs grid, bulk delete of actuals (heuristic 7, Alex persona).
- Warning for a customer project with 0 revenue.
- Year grouping for 36+ period projects in the close select and Inputs grid.
- Turning the Export tab into a live preview of the business-case document.
