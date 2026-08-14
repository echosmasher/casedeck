# Implementation Report — CaseDeck Phase 1 (Demo Organization)

**Plan**: PLAN.md §9 Phase 1   **Branch**: main (direct commits, no PR — solo project, no remote yet)
**Status**: COMPLETE

## Summary

Built the full demo organization ("Example Group") before any engine code exists, per PLAN.md's
demo-first principle. This includes JSON Schemas for config and project data (not yet formalized
anywhere else in the repo), neutral org-agnostic config defaults, the Example Group config, three
fully-specified project snapshots carrying the three planted stories from PLAN.md §5, the budget and
actuals CSVs those snapshots are sourced from, a broken actuals fixture with three distinct
validation failures, and first drafts of `demo/README.md` and `DATA_REQUIREMENTS.md`. Every planted
number was hand-computed and then independently verified with throwaway Node scripts against the
actual CSV/JSON files (not just asserted) — see Validation results.

## Tasks completed

- Config schemas → `config/config.schema.json` (CREATE, org/group config), `config/project.schema.json`
  (CREATE, project snapshot data model per PLAN.md §4)
- Neutral defaults → `config/default/categories.json`, `confidence-bands.json`, `statuses.json` (CREATE)
- Demo org config → `demo/example-group.config.json` (CREATE — NOK, 1.35 multiplier, 4-role rate
  card, 7-entry account-code category mapping incl. one `ignore` code)
- Three project snapshots → `demo/projects/001-intranet-relaunch.json`,
  `002-booking-integration-example-hotel-a.json`, `003-erp-data-migration.json` (CREATE)
- Budget CSVs → `demo/budgets/001-*.csv`, `002-*.csv`, `003-*.csv` (CREATE, long-format, one row per
  line-item-per-period)
- Actuals CSVs → `demo/actuals/001-actuals-2026-0{1..4}.csv` (4 files, comma/point),
  `002-actuals-full-lifetime.csv` (1 file, semicolon/decimal-comma — Nordic export style),
  `broken-example.csv` (CREATE, generic fixture, 3 deliberate failures)
- `demo/README.md` (CREATE) — all three stories with exact numbers and where each will be visible
- `DATA_REQUIREMENTS.md` (CREATE) — first draft, budget/actuals CSV column formats, delimiter/decimal
  conventions, the three broken-file error messages
- Schema linter → `scripts/validate-demo-data.mjs` (CREATE, ajv), `validate:demo` package.json script,
  wired into `.github/workflows/ci.yml` between test and build

## Tests added

No new Vitest tests (no engine code exists yet — that's Phase 2). Validation for this phase is the
ajv-based `validate:demo` script plus three ad-hoc Node verification scripts run during development
(not committed — see below) that recomputed every planted number directly from the CSV/JSON source
files and diffed against `demo/README.md`. All matched exactly:
- 001: salary actual Jan–Apr 497,300 ✓, consultancy actual 318,500 ✓, consultancy projection 558,500
  vs. worst-case ceiling 528,000 (breach confirmed) ✓, salary projection 994,100 vs. ceiling 1,092,960
  (no breach) ✓, total contingency 53.6% consumed ✓.
- 002: quarterly net −189,500 / −194,500 / −191,500 / +812,250, cumulative +236,750 ✓; every actual
  cost line within ±10% of budget (largest deviation +4.0%/−5.0%) ✓.
- 003: expected margin +263,250 ✓, worst-case margin −809,775 ✓, best-case margin +1,336,275 ✓.

## Validation results

- `pnpm lint` → pass
- `pnpm typecheck` → pass
- `pnpm test` → 1 test file, 1 test, passed (unchanged from Phase 0 — no engine tests yet)
- `pnpm validate:demo` → all 4 JSON files (1 config + 3 projects) schema-valid
- `pnpm build` → pass, static export produced

Phase 1 Accept criteria: demo README documents all three stories with exact where-to-look-for-it
pointers ✓; CSVs conform to `DATA_REQUIREMENTS.md` by manual review (delimiter/decimal conventions
demonstrated in both directions, broken file's three issues confirmed programmatically at the byte
level — see above) ✓; a schema linter validates the JSON snapshots ✓.

## Deviations from the plan

- **Two schema files instead of one.** PLAN.md's file tree lists a single
  `config/config.schema.json` ("JSON Schema for all config files"). Phase 1's accept criterion
  ("a schema linter validates the JSON snapshots") requires validating the *project* snapshots too,
  which are a different, larger shape than org config. Added `config/project.schema.json` rather
  than overloading one schema file with two unrelated root shapes.
- **`config/default/*.json` are partial documents, not full `GroupConfig` instances.** They're
  building-block defaults (a categories list, a confidence-bands object, a statuses list) that a
  future `/setup` skill or in-app wizard would compose into a new org's config — not something meant
  to validate whole against `config.schema.json` itself. They are intentionally excluded from
  `validate:demo`.
- **Actuals are cost-only in v1**, not explicitly stated as a scope boundary anywhere in PLAN.md but
  implied throughout (§1's "recorded costs imported via CSV", HANDBOOK.md's "monthly actuals loop").
  Revenue for customer projects is tracked as planned, at whatever confidence its `pricingModel`
  carries, with no separate "actual revenue received" import. Documented explicitly in
  `demo/README.md`'s scope note and in `DATA_REQUIREMENTS.md` so this doesn't read as an oversight
  later.
- **001's "eats the contingency" resolves at the category level, not the blended-total level.**
  PLAN.md §5 says consultancy runs "~40% over" and "the variance view projects a total overrun that
  eats the contingency." With a genuine ~40–45% consultancy overrun, the blended project total does
  *not* breach its own worst-case ceiling (1,552,600 projected vs. 1,620,960 ceiling) — only
  consultancy's own ceiling breaches (558,500 vs. 528,000). Inflating the overrun further to force a
  blended-total breach would have meant abandoning the "~40%" figure the plan states. Kept the
  ~40–45% overrun and let the total-level story be "53.6% of contingency consumed, category-level
  red flag fires first" — arguably a better showcase of the tool's category-level drill-down, and
  documented precisely in `demo/README.md` so Phase 2's engine tests target the right assertion
  (category breach, not blended-total breach).
- **002 spans 4 quarters (2025-Q1–Q4), not 3.** PLAN.md §5 describes "deep losses for three quarters
  and a spike at the end," which only makes sense as 3 loss quarters *plus* a 4th spike quarter
  (revenue recognized at the very end) — a literal 3-quarter project with `at_period(final)` revenue
  would show the spike *inside* the third quarter, not as a separate "end." Built as 4 quarters
  accordingly.
- **Account codes, rate card, and all monetary figures are invented** for this report/build, per
  PLAN.md principle 4 (clean-room content) — no real employer data was referenced.
- Per-task `VALIDATE` commands were effectively single ajv/arithmetic checks run incrementally as
  each file was written, then the full `lint/typecheck/test/validate:demo/build` suite was run once
  at the end — file-by-file schema validation happened as soon as each JSON file existed (see above),
  so the final batch run is confirmation, not first discovery.

## Issues encountered

None. No engine exists yet to catch inconsistencies automatically, so correctness relied on manual
arithmetic cross-checked with throwaway verification scripts (not committed — ephemeral, their job
was done once they confirmed the numbers). Phase 2's property/unit tests will be the durable,
committed version of these same checks.

## Next

- Phase 2 (Engine): implement `src/engine/` against the raw project model this phase defined,
  with unit/property tests asserting the exact planted numbers documented in `demo/README.md`
  reproduce correctly (band symmetry, committed invariance, periodization sums, the specific
  001/002/003 figures above).
- Check back in before starting Phase 2, per the user's chosen incremental scope.
