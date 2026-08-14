# Implementation Report — CaseDeck Phase 2 (Engine)

**Plan**: PLAN.md §9 Phase 2   **Branch**: main (direct commits, no PR — solo project, no remote yet)
**Status**: COMPLETE

## Summary

Built `src/engine/` — the deterministic core — and proved it reproduces every planted number from
Phase 1's `demo/README.md` exactly, not approximately. All engine functions are pure (no React/Next/
DOM imports; enforced in CI by dependency-cruiser), no formatting or display logic lives inside the
engine, and every computed scenario/variance value traces back to a typed input with no NaN
propagation paths.

## Tasks completed

- `src/engine/model.ts` (CREATE) — TypeScript types mirroring the Phase 1 JSON Schemas
- `src/engine/loadedCost.ts` (CREATE) — salary hours × rate × loaded-cost multiplier, multiplier
  applied by the engine, never baked into the rate
- `src/engine/periodize.ts` (CREATE) — monthly/quarterly/total period enumeration, cost
  periodization by category, revenue allocation (even/at_period/custom/hourly)
- `src/engine/scenarios.ts` (CREATE) — confidence → best/expected/worst bands, resolved
  per-period, summed line-by-line (not one blended band over a total)
- `src/engine/variance.ts` (CREATE) — actuals vs. budget, projection-to-complete, category-level
  ok/warning/red flagging against contingency consumption
- `src/engine/validate.ts` (CREATE) — model invariant checks + the CSV import-error formatter
- 6 test files, 57 tests (CREATE): `loadedCost.test.ts`, `periodize.test.ts`, `scenarios.test.ts`,
  `variance.test.ts`, `validate.test.ts` — property tests (fast-check) plus fixture tests against
  the actual `demo/projects/*.json` files
- `.dependency-cruiser.cjs` (CREATE) — engine-purity import-boundary rules, `lint:boundaries`
  script, wired into CI
- Vitest coverage (`@vitest/coverage-v8`) scoped to `src/engine/**`, 90% thresholds on all four
  metrics, `test:coverage` script, CI's Test step now runs `test:coverage` instead of `test`
- `eslint.config.mjs` — added `coverage/**` to ignores (the coverage report's own generated JS was
  tripping lint)

## Tests added

57 tests across 6 files. Notable ones tied directly to Phase 2's accept criteria:

- **001 breach** (`variance.test.ts`): consultancy `actualToDate` 318,500, `projectionToComplete`
  558,500 > `worstCeiling` 528,000 → `flag: "red"`. Salary `flag: "ok"`. Blended total
  `contingencyConsumedPct` between 50–100% → `flag: "warning"` (matches the Phase 1 report's
  documented category-vs-total distinction exactly).
- **002 clean case + revenue timing** (`scenarios.test.ts`, `variance.test.ts`): quarterly margins
  −189,500 / −194,500 / −191,500 / +812,250, cumulative negative through Q1–Q3 and total +236,750;
  every category `flag: "ok"` against real actuals.
- **003 scenario story** (`scenarios.test.ts`): total margin expected +263,250 (>0), worst −809,775
  (<0), best +1,336,275 — the wide, crossing-zero band the export will need to show.
- **Property tests** (fast-check): band symmetry (`worst + best = 2 × expected` for both cost and
  revenue scenario functions, any value/confidence), committed invariance (bandPct 0 collapses
  best = worst = expected), periodization sums (per-period totals sum to the grand total; even/
  custom fixed-price allocations sum to the modeled amount) for arbitrary generated inputs, not just
  the fixtures.
- `validate.test.ts` also asserts `formatImportRowError` produces the exact three strings now
  specified in `DATA_REQUIREMENTS.md` — including a fix to that document itself (see Deviations).

## Validation results

All commands from Phase 2's accept criteria, run in sequence, all green:

- `pnpm lint` → pass
- `pnpm typecheck` → pass
- `pnpm lint:boundaries` (dependency-cruiser) → pass, 0 violations across 23 modules/45
  dependencies — and independently verified the rule actually catches violations (temporarily added
  a `react` import to `src/engine/`, confirmed it failed with `error engine-purity-no-react-next`,
  then removed the file)
- `pnpm test` → 57/57 passed
- `pnpm test:coverage` → **Statements 100%, Branches 95.86%, Functions 100%, Lines 100%** on
  `src/engine/**` — comfortably above the ≥90% accept threshold on every metric (branches was the
  tightest at first pass, 77.68%, before adding targeted tests for previously-dead defensive
  branches; final margin is >5 points on the tightest metric, deliberately not left sitting at the
  threshold edge)
- `pnpm validate:demo` → still passes (untouched by this phase)
- `pnpm build` → pass, static export produced

## Deviations from the plan

- **Fixed a latent inconsistency in `DATA_REQUIREMENTS.md`'s third error message** discovered while
  writing `validate.test.ts`. The unknown-account-code message was phrased as "unknown account code
  X — not present in category mapping, resolve during import preview", which doesn't fit the
  `expected X, got Y` template the other two messages (and CLAUDE.md principle 6's own example) use.
  Rewrote it to `expected a known account code (present in category mapping), got "6234"` so all
  three messages share one grammar, and added a note in `DATA_REQUIREMENTS.md` explaining that the
  "resolve in the import preview" behavior is UI copy, not part of the per-row error string. This is
  a docs fix surfaced by writing the formatter's tests, not a scope change.
- **Variance flagging thresholds (50%/100% of contingency consumed) are a Phase 2 design decision**,
  not spelled out numerically in PLAN.md. Chosen because they're the smallest rule that reproduces
  both demo stories exactly (001 consultancy red / salary ok / total warning; 002 everything ok) —
  documented in `variance.ts`'s file comment and tested explicitly. Later phases (Dashboard, Variance
  view) should treat these as the source of truth for flag color rather than re-deriving their own.
  "warning" as a third flag state isn't named in PLAN.md's requirements text but is what makes 001's
  "eats a big chunk of the contingency, not quite a breach" story representable at the blended-total
  level — noted in the Phase 1 report as the intended reading.
- **`ImportRowError`/`formatImportRowError` exist in `src/engine/validate.ts` ahead of the import
  pipeline itself** (Phase 5). This is intentional, not scope creep: DATA_REQUIREMENTS.md's exact
  error strings are a Phase 1 commitment, and Phase 2 is the first point a formatter can be
  unit-tested against them. Phase 5's `src/import/` will call this formatter rather than
  re-implementing string formatting.
- Per-task `VALIDATE`: typecheck was run after each new file; the full suite (lint / typecheck /
  boundaries / tests / coverage / validate:demo / build) was run repeatedly during coverage
  iteration and once more at the end as final confirmation.

## Issues encountered

Coverage's first pass (77.68% branches) exposed genuinely untested code paths — mostly `?? 0`/`?? ZERO`
defensive fallbacks for sparse period maps and the `even`/`custom` fixed-price allocation branches in
`scenarios.ts`, which the three demo fixtures alone don't exercise (001/002/003 only use `null`,
`at_period`, and `hourly` pricing models between them). Closed with targeted unit tests rather than
loosening the threshold — these are real gaps (a sparse valuesPerPeriod map, an `even`-allocation
project) that could recur once Phase 3's input UI lets a user actually construct them by hand.

## Next

- Phase 3 (Storage + app shell + input): the input UI will be the first real consumer of
  `validateProjectInvariants` for live user-entered data, and of the `Project`/`GroupConfig` types
  this phase defined.
- Check back in before starting Phase 3, per the user's chosen incremental scope.
