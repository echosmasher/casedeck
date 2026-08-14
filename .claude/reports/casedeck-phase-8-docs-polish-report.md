# Implementation Report — CaseDeck Phase 8 (Docs + polish)

**Plan**: PLAN.md §9 Phase 8   **Branch**: main (direct commits, no PR — solo project, no remote yet)
**Status**: COMPLETE

## Summary

Wrote the full docs set PLAN.md §7 specifies (README.md rewrite, HANDBOOK.md, DEPLOYMENT.md,
ROADMAP.md), ran a real accessibility and responsive pass over the app that found and fixed two
genuine defects, captured three real screenshots from the running app for the README, and added a
Playwright smoke suite wired into CI covering the exact accept-criterion path: boot demo → open
001 → import an actuals file → export 003.

## Tasks completed

- **`ROADMAP.md`** (CREATE) — PLAN.md §8's eight exclusions, each with its own rationale (not just
  restated) — e.g. why multi-tenancy isn't built yet (no multi-user deployment to protect), why the
  Supabase adapter is designed as an interface boundary today rather than deferred entirely.
- **`DEPLOYMENT.md`** (CREATE) — three tiers (live demo/Vercel fork, company-internal static
  hosting, Supabase upgrade path), with an explicit, deliberately blunt section on what
  "local-first" does and doesn't mean for teams expecting shared live data from tier 2 — this was
  the part most likely to cause real confusion if left implicit.
- **`HANDBOOK.md`** (CREATE) — PM-persona workflow: the monthly actuals loop, what each variance
  status means and what to do about it, when to re-baseline (CaseDeck has no dedicated re-baseline
  feature — it's just editing a line, which the handbook says explicitly rather than implying a
  feature that doesn't exist), and how to talk about a scenario range with a decision maker.
- **`README.md`** (REWRITE) — pitch → screenshots → live demo (placeholder, honest about Phase 9
  not having happened yet — no fabricated URL) → problem statement → how it works (a mermaid
  lifecycle diagram) → three-audience quickstart (reviewer/user/developer) → architecture summary →
  license.
- **Responsive + accessibility pass** (Task #79) — delegated to a background agent running
  agent-browser against the live dev server across `/`, `/setup`, and `/project` (all three demo
  projects, all four tabs). Found and fixed two real issues (see below); confirmed labels, focus
  order, and keyboard activation on the highest-risk custom widgets (input-grid nudge buttons) were
  already correct.
- **Screenshots** (Task #80) — three real captures from the running app into `docs/screenshots/`:
  the 003 scenario-band dashboard (worst case crossing zero), the 001 variance table (consultancy
  flagged red), and the actual downloaded business-case HTML for 003, opened via `file://`.
- **Playwright smoke suite** (`playwright.config.ts`, `tests/e2e/smoke.spec.ts`) — see below.
- **`.github/workflows/ci.yml`** (UPDATE) — added a Playwright browser install step and `pnpm
  test:e2e` after `Build`.

## Tests added

One Playwright spec (`tests/e2e/smoke.spec.ts`), covering the exact accept-criterion path in one
run against a real, freshly-built static export:

1. Navigate to `/` with empty (per-test-isolated) browser storage — confirms the app's own
   first-boot demo auto-load populates all three projects, not a test fixture standing in for it.
2. Open 001 (Intranet Relaunch), switch to the Actuals tab, upload
   `demo/actuals/001-actuals-2026-04.csv` through the real file input, confirm the parsed preview
   shows an accepted-row count, commit it, and confirm the new row appears in "Recorded actuals."
3. Navigate to 003 (ERP Data Migration), open the Export tab, click "Download business case,"
   capture the real browser download event, and assert the downloaded filename.
4. Asserts zero console errors (page + uncaught exceptions) across the whole run.

Existing suite unaffected: still 116/116 (`vitest run --coverage`); this phase's Playwright test is
a separate, non-overlapping suite (`tests/e2e/*.spec.ts`, excluded from vitest's `include` glob).

`next start` doesn't work with `output: "export"` (Next.js refuses at runtime and says so) — added
`serve` as a devDependency and pointed Playwright's `webServer` at `pnpm build && pnpm exec serve
out -l 3000`, so the suite runs against the actual static export artifact, the same thing every
deployment tier in `DEPLOYMENT.md` serves — not the dev server.

## Validation results

- `pnpm lint` / `pnpm typecheck` / `pnpm lint:boundaries` (88 modules, 269 dependencies, 0
  violations) / `pnpm test:coverage` (116/116, engine coverage unchanged at
  100%/95.86%/100%/100%) / `pnpm validate:demo` / `pnpm build` → all pass.
- `CI=true pnpm test:e2e` → 1/1 passed, run the same way CI runs it (fresh build, no reused dev
  server, single worker, `line` reporter) — not just the friendlier local/watch mode.
- **README 2-minute-rule check**: 867 words total, headers let a reviewer jump straight to any
  section, and the code/mermaid blocks are meant to be scanned rather than read line-by-line. Timed
  this by word count against typical skim-reading speed rather than a literal stopwatch pass (no
  mechanism here to simulate a human's actual reading cadence) — comfortably inside a 2-minute
  budget at a normal skim pace, with the three screenshots doing a meaningful share of the
  "understand what this is" work before any text is read at all. Flagging the methodology
  explicitly rather than asserting a literal timed result I didn't actually produce.

## Deviations from the plan

- **The a11y/screenshot work ran as a background agent (fork), not inline.** PLAN.md doesn't
  specify *how* the pass gets done, only what it must cover — delegating kept the raw
  agent-browser tool-call volume (74 tool calls) out of the main session's context while the docs
  and Playwright work continued in parallel. Its two fixes were reviewed and verified independently
  before being accepted (see Issues encountered).
- **A third issue the fork flagged turned out to be a false positive, and I want to be explicit
  about that rather than let "found and fixed" stand unchallenged.** It reported the setup wizard's
  loaded-cost-multiplier field "displaying" `1.350000023841858` for a clean `1.35`. I verified
  directly (`document.getElementById(...).value`) that the actual DOM value was always the clean
  `"1.35"` — what the fork's accessibility snapshot saw was Chromium's accessibility tree exposing
  a `<input type="number">`'s `spinbutton` role value via 32-bit float serialization internally
  (a known engine quirk, `Math.fround(1.35) === 1.350000023841858` exactly), independent of and
  invisible to the actual rendered value. No sighted user, and no code in this repo, ever produced
  that string. I still added a small defensive `onBlur` rounding (browsers' native
  `stepUp()`/`stepDown()` on fractional-step number inputs is a real, separate source of float
  drift, even though it wasn't what was actually observed here) — cheap, tested, and left in as
  insurance, but the original report shouldn't be read as a confirmed bug.
- **`README.md`'s "Live demo" section is an honest placeholder, not a working link.** PLAN.md §7
  lists a live demo link as part of the README's structure, but the deploy itself is explicitly
  Phase 9's job (§9: "deploy demo to Vercel"). Writing a fabricated or future-dated URL would
  violate the standing rule against inventing URLs — the section instead says plainly that the
  deploy is pending and points at the developer quickstart in the meantime. This is a placeholder
  Phase 9 must resolve, not a shipped omission.

## Issues encountered

- **Horizontal scroll at narrow viewports** (`src/app/page.tsx`, `src/app/layout.tsx`,
  `src/components/demo-header.tsx`) — the project-list header row and the global nav's role-switcher
  group were unwrapped flex rows; at 320–375px width they forced the whole page to scroll
  horizontally instead of wrapping. Fixed with `flex-wrap` + row/column gap on all three containers.
  Verified via `scrollWidth === innerWidth` at 320/375/768/1440px on every route, not just visual
  inspection.
- **Failing WCAG contrast on the "Watch" variance status** (`src/app/project/VarianceSection.tsx`,
  `src/app/globals.css`) — the variance table used the raw `--viz-status-*` icon/mark tokens
  directly as *text* color; measured contrast for the warning/orange text was 1.83:1 against the
  page background (AA requires 4.5:1 for normal text) — effectively illegible, not just suboptimal.
  The codebase already had a separate, contrast-safe token family (`--viz-good`/`--viz-critical`)
  used correctly elsewhere (`Dashboard.tsx`) but no `--viz-warning` counterpart existed yet. Added
  one, following the same light/dark pattern already established, and switched the variance table
  to it. This is exactly the `dataviz` skill's own rule ("status colors ship with an icon + label,
  never color alone" *and* implicitly, must actually be legible as text) catching a real gap in an
  otherwise-compliant palette.
- See Deviations above for the loaded-cost-multiplier false positive and why it doesn't count as a
  third fixed bug.

## Next

- Phase 9 (Fresh-clone test + publish): clean-machine clone → install → test → build → run; deploy
  the demo to Vercel (which also resolves this phase's README "Live demo" placeholder); run the
  full pre-publish checklist in PLAN.md §10, including the sanitization grep against
  `.private/sanitize-terms.txt`.
- Check back in before starting Phase 9, per the user's chosen incremental scope.
