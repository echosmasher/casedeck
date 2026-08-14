# Implementation Report — CaseDeck Phase 7 (Skills)

**Plan**: PLAN.md §9 Phase 7   **Branch**: main (direct commits, no PR — solo project, no remote yet)
**Status**: COMPLETE

## Summary

Built `skills/setup/SKILL.md` and `skills/business-case/SKILL.md`, plus the deterministic CLIs each
one depends on (`scripts/budget-cli.ts`, `scripts/business-case-cli.ts`). This phase also finally
built `src/import/budget.ts` — the budget-CSV parser deferred since Phase 5, because Phase 7 is the
first point anything actually calls it. Both skills were tested by hand-executing their own
documented instructions end-to-end against a freshly invented company, not the demo files, exactly
as the accept criteria require — including genuinely exercising the "ask about unclear codes"
interview step and mechanically verifying every number the business-case narrative cites.

## Tasks completed

- **`DATA_REQUIREMENTS.md`, `demo/budgets/*.csv`** (UPDATE) — added a `role` column to the budget
  CSV format (needed to reconstruct `SalaryLineItem.role`, which Phase 1's spec omitted — see
  Deviations) and documented that `category` may be blank, which is what makes the `/setup`
  interview step meaningful rather than decorative.
- **`src/import/budget.ts`** (CREATE) — parses and pivots long-format budget CSV rows into
  `CostLineItem[]` and an inferred `PricingModel` (hourly vs. fixed; `even`/`at_period`/`custom`
  allocation, inferred from the revenue rows' shape). A blank or unrecognized account code isn't a
  parse error — it's grouped and surfaced for interview resolution, mirroring Phase 5's actuals
  pipeline exactly.
- **`src/import/budget.test.ts`** (CREATE) — see Tests added.
- **`tsx`** (CREATE dep) — needed to run TypeScript CLI scripts directly; `esbuild`'s postinstall
  build script required an explicit `pnpm approve-builds esbuild` (see Issues encountered).
- **`scripts/budget-cli.ts`** (CREATE) — the CLI `/setup` runs. Three outcomes: structural error
  (exit 1, prints the engine's exact error text, writes nothing), unmapped account codes (exit 2,
  prints a report grouped by code for the interview), or clean (validates against both JSON Schemas
  and `validateProjectInvariants`, writes `config.json` + `project.json`, reports exactly what and
  where).
- **`scripts/business-case-cli.ts`** (CREATE) — the CLI `/business-case` runs. Reads a project JSON
  or a full snapshot (extracting by id), runs `computeProjectScenarios`/`computeVariance`, prints
  every computed figure as JSON. This exists because the raw project JSON alone doesn't contain
  computed totals — without this, "never introduce a number of your own" and "cite figures exactly
  as computed" would be in tension for the skill.
- **`skills/setup/SKILL.md`** (CREATE) — interview flow per PLAN.md §6.5.
- **`skills/business-case/SKILL.md`** (CREATE) — narrative-drafting flow per PLAN.md §6.6.
- **`package.json`** (UPDATE) — `setup:budget-cli`, `business-case:cli` script aliases.

## Tests added

15 new tests (`src/import/budget.test.ts`), bringing the suite to 116:

- **Exact reproduction of all three demo projects from their source CSVs** — re-parsing
  `demo/budgets/001/002/003*.csv` and comparing (modulo generated `id`) against
  `demo/projects/*.json`'s `costs` arrays and `pricingModel`, field for field. This is a real
  regression test that's been an open loop since Phase 1: it proves the hand-written demo project
  JSONs and hand-written demo budget CSVs were actually consistent with each other via a genuine
  deterministic parser, not just "looked similar on inspection."
- Unmapped-code handling: a blank category produces no line item and a grouped unmapped report, not
  a guess; re-parsing with the resolved mapping produces the line item; the derived `categoryMapping`
  is exactly the account-code-to-category pairs actually used — ready to write into a new config.
- Structural validation (wrong column count, invalid confidence value, non-numeric amount, a salary
  row missing its role) — every failure produces the same `file, row N, column "C": expected X, got
  "Y"` grammar as `DATA_REQUIREMENTS.md`.
- Revenue allocation inference: `even` (equal amounts across periods) and `custom` (differing
  amounts) — `at_period` and `hourly` are already covered by the demo-fixture reproduction tests
  above (002 and 003 respectively).

Engine coverage unchanged (100%/95.86%/100%/100% — this phase's new code lives in `src/import/` and
`scripts/`, neither counted in the engine coverage gate).

## Validation results

- `pnpm lint` / `pnpm typecheck` / `pnpm lint:boundaries` (88 modules, 269 dependencies, 0
  violations — `src/import/budget.ts` held to the same boundary as everything else in
  `src/import/`) / `pnpm test:coverage` (116/116) / `pnpm validate:demo` / `pnpm build` → all pass
- **CLI smoke tests** (`scripts/budget-cli.ts`): confirmed all three exit paths directly — an
  unmapped code produces exit 2 with the expected report and writes nothing; a bad amount produces
  exit 1 with `broken.csv, row 1, column "amount": expected a number (comma or point decimals), got
  "N/A"` (the exact `DATA_REQUIREMENTS.md` grammar) and writes nothing; a clean file writes valid,
  schema-passing `config.json`/`project.json` and reports the paths.
- **`/setup` end-to-end, hand-executed against a fresh synthetic company** (not Example Group):
  invented "Fjellstue Digital," a small design agency, with a realistic messy raw export (Norwegian
  column headers, semicolon-delimited, no category/role columns — the kind of file a real user
  would actually hand over). Followed `skills/setup/SKILL.md`'s own instructions: reshaped the raw
  file into the compliant CSV, deliberately left one account code's category genuinely ambiguous
  ("Travel to customer workshop" — could plausibly be `travel` or `other_direct`) rather than
  guessing, ran the CLI, got exit 2 with exactly that code reported, asked the question the skill
  specifies, recorded the answer, re-ran, got a clean exit 0. **Then loaded the generated project
  JSON into the actual running app** (via a snapshot import, in a real browser) and confirmed the
  Dashboard's Total cost/revenue/margin and per-category figures matched my hand-computed
  expectations exactly (292,800 / 480,000 / 187,200 NOK) — proving the CLI's output isn't just
  schema-valid in isolation, it's genuinely compatible with the rest of the app.
- **`/business-case` end-to-end, hand-executed against that same freshly-generated project** (not a
  demo file, and chained from the `/setup` test rather than needing a second synthetic dataset):
  followed `skills/business-case/SKILL.md`'s own instructions, ran `business-case:cli`, drafted an
  executive summary and risk commentary citing only figures from the CLI's computed output, then
  **mechanically grep-checked every single number in the drafted narrative against the CLI's raw
  JSON output** (not just eyeballed) — all nine confirmed present, zero invented.

Phase 7 Accept criteria: `/setup` on the test file yields valid config + importable project JSON
with zero manual fixes ✓ (the second CLI run succeeded cleanly, and the output loaded into the real
app without modification); unclear codes trigger questions rather than guesses ✓ (the ambiguous
travel code was left blank and genuinely round-tripped through the interview, not silently
resolved); `/business-case` output contains no number absent from the input data ✓ (verified
mechanically, not by inspection — see the Deviations note on what "input" means here).

## Deviations from the plan

- **Added a `role` column to the budget CSV format**, a small Phase 1 spec gap: `SalaryLineItem`
  needs `role` (the rate-card role, e.g. "Senior Developer") distinct from `label` (free-text line
  description), but `DATA_REQUIREMENTS.md`'s original column list had no way to carry it. Updated
  the spec and all three `demo/budgets/*.csv` files (via a small script, not manual retyping, to
  avoid transcription errors) — verified via the exact-reproduction tests above that nothing else
  about the demo data changed.
- **`category` is now documented as optional (blank allowed)** in the budget CSV format, where
  Phase 1's original text implied it was always populated (matching how the demo files happened to
  be written). This is what makes `/setup`'s "propose mapping, ask about unclear codes" step
  real rather than vestigial — a brand-new org has no existing category mapping, so *every* code
  starts unresolved.
- **`/business-case`'s "input JSON" is the CLI's computed output, not the raw project JSON, for
  anything beyond identity fields (name, dates, dependencies).** PLAN.md §6.6's accept criterion
  says "no number absent from the input JSON," but a raw project JSON has hours/rates/period values,
  not the margin totals or scenario bands a narrative actually needs to cite — supplying a
  literal-only reading would force Claude to compute those itself, directly violating the same
  section's "cite figures exactly as computed" and "never introduce numbers of its own." Resolved
  by building `business-case-cli.ts`, which computes those figures the same way the Dashboard does,
  so the skill has something legitimate to cite. Verified the resulting narrative's numbers against
  the CLI's output specifically (not the raw project JSON) — documented here so this reading is
  explicit rather than assumed.
- **Both skill tests used one chained synthetic dataset** (Fjellstue Digital) rather than two
  independent ones — `/business-case`'s test input is literally `/setup`'s test output. This is a
  stronger test than two unrelated fixtures would be (it also exercises the full pipeline
  `/setup` → real project JSON → `/business-case` end to end) and still satisfies "not the demo
  files" for both.

## Issues encountered

**`pnpm add -D tsx` triggered a real, if minor, supply-chain policy interaction**: `esbuild` (a
`tsx` dependency) has a postinstall build script pnpm ignores by default. `tsx` itself worked fine
without it, but a subsequent `pnpm typecheck` hard-failed with `ERR_PNPM_IGNORED_BUILDS` (pnpm's
own dependency-status check tripped on the ignored script and tried to auto-repair via `pnpm
install`, which fails the same way). Resolved with a targeted `pnpm approve-builds esbuild` (not
`--all`) — esbuild is a well-known, widely-trusted build tool, and this only approves that one
package's install script, not a blanket policy change.

## Next

- Phase 8 (Docs + polish): full docs set, screenshots, responsive + a11y pass, Playwright smoke
  suite. This is also where `DEPLOYMENT.md`, `HANDBOOK.md`, and a refreshed `README.md` (still
  create-next-app boilerplate-adjacent from Phase 0) finally get written for real.
- Check back in before starting Phase 8, per the user's chosen incremental scope.
