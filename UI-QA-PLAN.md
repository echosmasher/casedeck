# UI-QA-PLAN.md — QA Fixes + DESIGN.md Implementation

> Scoped plan from the first round of manual QA (2026-09-22) plus rollout of the
> "Precision Editorial Finance" design system (`DESIGN.md`). Follow phases in order — each phase
> ships independently and leaves the app in a working state. Where this plan is silent, follow
> CLAUDE.md / AGENTS.md.

---

## 0. Decisions locked in for this round

- **Rate cards / Settings (QA item 3):** global Settings page only (no per-project override in
  this round). Edits are stored as overrides in `StorageAdapter`, merged over the bundled
  `demo/example-group.config.json` at read time — mirrors the existing `categoryMappingOverrides`
  pattern. `config/`/`demo/` stay untouched (clean-room seed data, per CLAUDE.md rule 7). Rate
  changes recompute live via the existing pure engine — no historical rate snapshots.
- **Edit project (QA item 4):** reuse the existing creation form (`src/app/setup/page.tsx`) in an
  edit mode, prefilled from the existing `Project`. All fields editable **except** `startPeriod`
  and `currency`, which lock once a project exists (irreversible without breaking engine
  determinism / already-committed periodized data). An **Edit** button on the project header
  (`src/app/project/page.tsx`) links to it.
- **Layout (QA item 5 / DESIGN.md):** keep the current top-tab layout (Dashboard / Inputs /
  Actuals / Export). DESIGN.md's 240px sidebar model is **not** adopted — restyle within the
  existing structure.

---

## Phase A — Quick QA fixes (independent, low risk)

**A1. Confidence dropdown truncation** (`src/app/project/InputsEditor.tsx`,
`src/app/project/shared.ts`)
- Give the `Confidence` column a width floor: replace `w-full min-w-0` in `selectClass` with a
  variant that has `min-w-[110px]` (or equivalent) for confidence selects specifically, and/or set
  a fixed/min width on the `Confidence` `TableHead`.
- While in this code: swap the native `<select>` used for confidence (in `InputsEditor.tsx`'s
  `CostLineRow`, add-line form, one-off and hourly-rate variants) for the existing shadcn `Select`
  component (`src/components/ui/select.tsx`), so it renders full option labels in a proper
  listbox instead of a native dropdown that clips.
- Verify: all confidence values ("estimated", "committed", "rough") render unclipped at default
  column width, both in the table rows and the add-line form.

**A2. "Choose file" native input** (`src/app/project/ActualsTab.tsx` lines 138–147)
- Wrap the native `<input type="file">` in a visually hidden input triggered by a styled
  Secondary/Outline button (per DESIGN.md button spec once Phase B lands — plain outline button
  in the interim if sequenced before Phase B).
- Display the selected filename (or "No file chosen") as body text beside the button.
- Keep the native input focusable/keyboard-operable — no custom drag-drop in this pass.
- Verify: button matches surrounding UI, filename updates on selection, `disabled={!ready}` state
  still visually disabled.

**Exit criteria:** both QA screenshots' issues no longer reproduce. No changes to engine/config/
storage. Ships as its own commit.

---

## Phase B — DESIGN.md token + component rollout

Goal: apply the "Precision Editorial Finance" system without changing layout structure or
information architecture. Sequenced before Phase C/D so new UI (Settings, Edit project) is built
in the new style directly rather than restyled twice.

**B1. Design tokens** (`src/app/globals.css`)
- Replace `:root` / `.dark` shadcn variable values with DESIGN.md's palette: primary
  `#18181B`/`#FAFAFA`, borders `#E4E4E7`, surfaces per Level 0–3 (white canvas, `#FAFAFA`
  sub-canvas, `#F4F4F5` shading), radii (4px controls, 8px containers, full pills).
- **Reconcile, don't replace, `--viz-status-*`**: current values are already close to DESIGN.md's
  emerald/amber/rose triads (`#059669`/`#D97706`/`#E11D48` ink, `#ECFDF5`/`#FFFBEB`/`#FFF1F2` fill,
  `#A7F3D0`/`#FDE68A`/`#FECDD3` border) — align exact hex values, keep the existing
  fixed-across-light/dark approach (it's accessibility-vetted per the existing code comment).
- Load Geist (check if already available via `next/font`; add if not) and define the typography
  scale (`display-xl`, `headline-lg/sm`, `body-md/sm`, `metric-lg/md`, `label-caps`, `label-sm`,
  `caption`) as CSS custom properties or Tailwind utility classes.
- Add a `tabular-nums` utility (`font-variant-numeric: tabular-nums; font-feature-settings: "tnum"
  1, "cv01" 1;`) and apply it wherever currency/percentage/date values render.

**B2. Core components** (`src/components/ui/*`)
- `button.tsx`: Primary (zinc/white, 32/36px height, hover `#27272A`, active `#09090B`),
  Secondary/Outline, Ghost variants per spec.
- `badge.tsx`: pill geometry, 6px dot indicator, on-track/watch/over-budget status variants —
  reused for project status display and variance markers.
- `input.tsx` / `select.tsx`: 32px height, 4px radius, replace the glow focus ring
  (`focus-visible:ring-3`) with a crisp `1px solid #18181B` focus border per DESIGN.md.
- `card.tsx`: 1px `#E4E4E7` border, 8px radius, `label-caps` header row pattern for KPI tiles.
- `tabs.tsx`: restyle as DESIGN.md's segmented control (4px padding track, white active segment,
  hairline shadow) — used for the Dashboard/Inputs/Actuals/Export tab bar (layout unchanged, just
  restyled).
- `table.tsx`: sticky 32px `#FAFAFA` header, 36px compact rows, hairline row dividers, right-align
  + tabular-nums for numeric columns.

**B3. Page-level restyle passes**
- `Dashboard.tsx`: KPI tiles to Card spec, variance markers to `+`/`-` prefixed emerald/rose.
- `InputsEditor.tsx`, `ActualsTab.tsx`, `VarianceSection.tsx`: table styling from B2, confirm A1/A2
  fixes still hold with new component styles.
- `ExportTab.tsx`, `setup/page.tsx`: pick up new input/select/button styles automatically via B2;
  spot-check for layout breakage.

**Exit criteria:** visual pass across all existing pages matches DESIGN.md's component specs, no
layout/IA changes, existing Playwright smoke suite still passes.

---

## Phase C — Settings page (rate cards)

**C1. Storage layer**
- Extend `src/storage/types.ts` with override fields, e.g. `rateCardOverrides:
  RateCardEntry[]`, `loadedCostMultiplierOverride?: number`, `confidenceBandOverrides?: ...` —
  same shape/merge pattern as the existing `categoryMappingOverrides`.
- Add corresponding read/write methods to the storage adapter implementation and `src/app/_lib/
  storage.ts`.

**C2. Config merge**
- Extend `src/app/_lib/activeConfig.ts` (or add a sibling helper next to `categoryMapping.ts`) to
  merge stored overrides over the bundled `GroupConfig` from `demo/example-group.config.json`,
  producing the effective config the engine reads from. Engine itself (`src/engine/`) stays
  untouched — it already just consumes a `GroupConfig`.

**C3. UI** (`src/app/settings/page.tsx`, new route)
- Form listing each `rateCard` role with an editable rate/hour field (DESIGN.md input style,
  tabular-nums).
- Editable `loadedCostMultiplier`.
- Confidence bands (percentages) editable per existing `confidenceBands` schema shape.
- Save writes to storage overrides (C1); changes apply immediately to all projects (live
  recompute, per decision in §0) since the engine is pure and re-reads config on render.
- Add a nav entry/link to Settings (placement TBD — likely near "Back to projects" or a persistent
  header link, given no sidebar).

**Exit criteria:** editing a rate in Settings changes computed costs across existing projects
without a page-specific migration step; `config/` and `demo/example-group.config.json` remain
unmodified by the app at runtime.

---

## Phase D — Edit project

**D1. Form reuse**
- Refactor `src/app/setup/page.tsx`'s `SetupForm` to accept an optional existing `Project` (edit
  mode) vs. no project (create mode), prefilling all fields when editing.
- Lock `startPeriod` and `currency` fields (disabled/read-only) when editing an existing project;
  all other fields (`status`, `endPeriod`, `stakeholders`, `dependencies`, `pricingModel` basics
  already covered by Inputs tab) remain editable.
- On submit in edit mode: persist via storage (confirm whether `saveProject` already
  upserts-by-id or whether an explicit `updateProject` is needed), then redirect back to the
  project dashboard (not to a new project).

**D2. Entry point**
- Add an **Edit** button on the project header in `src/app/project/page.tsx` (next to the status
  badge / "Back to projects" link), linking to `/setup?id=<projectId>` (or a dedicated
  `/project/edit?id=...` route — final route naming decided during implementation, reusing
  `setup/page.tsx`'s component either way).

**Exit criteria:** existing project's status/end period/stakeholders/dependencies can be changed
and persist; start period and currency are visibly locked; creating a brand-new project is
unaffected.

---

## Sequencing summary

1. **Phase A** — ship first, closes both QA screenshots immediately.
2. **Phase B** — design system rollout, no new features/routes.
3. **Phase C** — Settings page, built directly in the new style.
4. **Phase D** — Edit project, built directly in the new style.

Each phase is its own commit (or small set of commits); no phase blocks shipping the previous one.
