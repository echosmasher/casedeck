# Implementation Report — CaseDeck Phase 0 (Scaffold)

**Plan**: PLAN.md §9 Phase 0 (of 10; only Phase 0 was in scope for this pass — user chose to
checkpoint here before continuing)
**Branch**: feature/casedeck-scaffold   **Status**: COMPLETE

## Summary

Scaffolded the CaseDeck Next.js app per PLAN.md's stack decision: TypeScript, Tailwind, App Router,
static export (`output: 'export'`), pnpm. Wired up lint/typecheck/test/build and a matching GitHub
Actions CI workflow, added MIT LICENSE, tightened `.gitignore` for the project's local-first data
conventions, and wrote a Phase-0 baseline `CLAUDE.md` carrying PLAN.md §2's core invariants (engine
purity, config/engine separation, fail-loud errors, local-first storage, self-contained export,
clean-room demo data). No engine, storage, demo data, or app code beyond the `create-next-app`
default landing page was written — those are Phases 1+.

## Tasks completed

- Scaffold Next.js (TS, Tailwind, App Router, ESLint, `src/` dir, pnpm) → repo root (CREATE, via
  `create-next-app` into scratch dir then merged in — done outside the repo dir because
  `create-next-app` refuses to scaffold into a non-empty directory)
- Static export config → `next.config.ts` (UPDATE: `output: "export"`)
- MIT license → `LICENSE` (CREATE), `package.json` `"license"` field (UPDATE)
- `.gitignore` → added `.private/`, local user-data JSON patterns (UPDATE)
- Baseline engineering rules → `CLAUDE.md` (UPDATE — preserved the Next.js-generated `@AGENTS.md`
  reference at the top, per Next 16's own convention, and appended CaseDeck-specific rules)
- Test harness → `vitest.config.mts` (CREATE), `tests/sanity.test.ts` (CREATE), `test` script in
  `package.json`
- Typecheck script → `package.json` (UPDATE: `"typecheck": "next typegen && tsc --noEmit"`)
- CI → `.github/workflows/ci.yml` (CREATE: install → lint → typecheck → test → build on push/PR)
- README → `README.md` (UPDATE: replaced `create-next-app` boilerplate with the PRD elevator pitch
  + a pointer to PLAN.md/casedeck.prd.md; full README content is a Phase 7/8 deliverable)

## Tests added

- `tests/sanity.test.ts` — one trivial passing test confirming the Vitest harness runs end-to-end.
  No real engine logic exists yet to test (Phase 2).

## Validation results

All four commands specified in Phase 0's Accept criteria and CI workflow, run locally:

- `pnpm lint` → pass, no output (clean)
- `pnpm typecheck` (`next typegen && tsc --noEmit`) → pass
- `pnpm test` (`vitest run`) → 1 test file, 1 test, passed
- `pnpm build` (`next build`, static export) → pass; `out/` directory produced with prerendered
  static HTML for `/` and `/_not-found`

Phase 0 Accept criteria ("CI green on the empty scaffold; `npm run build` produces a static
export"): both satisfied — the CI workflow runs the same four commands, and `out/` is confirmed
present post-build. CI has not yet run on GitHub Actions itself since nothing has been pushed to a
remote (no remote is configured for this repo yet); this is next once a PR is opened.

## Deviations from the plan

- **Node/package manager versions**: used the environment's installed pnpm 11.20.0 and Node 26.7.0
  rather than pinning specific versions in PLAN.md (which didn't specify exact versions). CI pins
  Node 22 (current LTS) and pnpm 11.20.0 to match what was validated locally.
- **`next typegen` added to the typecheck script**: Next.js 16 generates an ambient `LayoutProps<...>`
  type used in the scaffolded `layout.tsx` at build/dev time; running `tsc --noEmit` standalone
  fails without it. Discovered via the auto-generated `AGENTS.md` warning that Next 16 has breaking
  changes vs. training data, and confirmed via `next --help` (Next 16 ships a dedicated `next
  typegen` subcommand for exactly this). `pnpm typecheck` now runs `next typegen` first so it works
  standalone, not just after a full build.
- **`vitest.config.ts` → `vitest.config.mts`**: avoids a CJS/ESM interop warning from Vitest 4's
  native config loader, since `package.json` has no `"type": "module"` (left as CommonJS to match
  Next.js's default project type, per no stated reason to change it).
- **`.gitignore` additions**: PLAN.md says ".gitignore excludes user data, `.private/`, `.env*`" but
  doesn't specify the user-data pattern. Added `/user-data/` and `*.local.json` as reasonable
  placeholders; these may need revisiting once Phase 3 (storage/JSON export-import) defines the
  actual local-data file shape.
- **CLAUDE.md is a Phase-0 baseline, not the full doc** PLAN.md §7 describes for later. It carries
  the non-negotiable rules from §2 now, kept short deliberately — full demo-data invariants and test
  expectations get added once Phases 1–2 exist to document.
- Per-task `VALIDATE` commands (lint/typecheck/test/build) were run once as a batch after all Phase
  0 file edits and `pnpm install`, rather than after each individual edit — most of the edits (CI
  config, LICENSE, `.gitignore`, `CLAUDE.md`) have no meaningful standalone validation short of the
  full command set, and `pnpm install` is a shared prerequisite for all of them.

## Issues encountered

- `create-next-app` refused to scaffold directly into this repo directory because `PLAN.md`,
  `casedeck.prd.md`, and `.archon/` already existed as untracked files. Worked around by scaffolding
  into a scratch directory and merging the result in (excluding the nested `.git` it creates). No
  existing files were overwritten.

## Next

- Repo has no commits yet. Run `piv-commit`, then `piv-create-pr` to open the PR (this report fills
  the PR body), then `piv-review-pr`.
- Next phase per user's chosen scope: check back in before starting Phase 1 (Demo organization).
