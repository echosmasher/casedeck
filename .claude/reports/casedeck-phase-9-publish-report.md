# Implementation Report — CaseDeck Phase 9 (Fresh-clone test + publish)

**Plan**: PLAN.md §9 Phase 9   **Branch**: main (direct commits, no PR — solo project)
**Status**: COMPLETE

## Summary

Ran a genuine fresh-clone build (clone into an isolated temp directory, not the working repo) to
confirm the README quickstart is accurate on a machine that's never seen this code; worked through
PLAN.md §10's pre-publish checklist; then, with explicit user confirmation (this phase's first
externally-visible, hard-to-reverse actions), created the public GitHub repo
(`github.com/echosmasher/casedeck`), pushed the full 9-commit phase history, and deployed the demo
to Vercel production (`casedeck-blue.vercel.app`). Verified the live deployment end-to-end, not just
CI green.

## Tasks completed

- **Fresh-clone test** — `git clone` into a scratch temp directory (no shared `node_modules`,
  fresh `pnpm install`). Ran `install → test → lint → typecheck → lint:boundaries → validate:demo →
  build`, then actually served the built `out/` directory and confirmed via agent-browser that it
  boots and renders the project list — not just that the commands exit 0.
- **Pre-publish checklist** (PLAN.md §10), items not requiring external services:
  - Secrets grep across tracked files and full history (`git log -p --all`) for common key/token
    patterns — zero matches.
  - Real-PII/real-path grep (the user's actual name, `/Users/` paths) across tracked files and full
    history — zero matches. Two harmless self-referential mentions of "archon" (the parent
    directory name, and a mention of the sibling portfolio repo TaskDeck in PLAN.md's decisions
    log) — not a prior employer, not sensitive, left as-is.
  - `demo/README.md` confirmed to label all rates/multipliers "illustrative, not benchmarks."
  - LICENSE (MIT) present; added `author` and `repository` fields to `package.json` (previously
    absent — no author/repo metadata at all).
  - README screenshots re-checked against the current build (still 3/3 present, correctly sized,
    867-word total unchanged) after Phase 8's a11y fixes — no drift.
  - Export sample in the repo: satisfied via the README's business-case-export screenshot (the
    checklist's "demo/ or README asset" is an *or* — no separate sample `.html` added to `demo/`,
    since the screenshot already shows a real generated export and a live one is one click away in
    the deployed demo).
- **User confirmation obtained before publishing** (AskUserQuestion) on three points, since
  creating a public repo and a live deployment are irreversible-in-spirit, externally-visible
  actions this session hadn't done before: (1) proceed with both GitHub + Vercel now — confirmed;
  (2) `.private/sanitize-terms.txt` (PLAN.md's expected home for real terms to scrub) doesn't
  exist — my own grep pass was accepted as sufficient in its place, rather than fabricating a terms
  list; (3) publish with the full 9-commit history rather than squashing — confirmed, since the
  phased build process is itself part of the portfolio signal per `casedeck.prd.md`'s thesis.
- **GitHub repo created and pushed**: `gh repo create casedeck --public --source=. --push` — public,
  full history, no near-misses found to justify a squashed/rewritten history.
- **Vercel production deploy**: `vercel link` + `vercel deploy --prod` — live at
  `https://casedeck-blue.vercel.app`. `.env.local` (written by `vercel link`, contains a
  project-scoped OIDC token) confirmed git-ignored before proceeding — never staged.
- **`README.md` "Live demo" section** updated from the Phase 8 honest-placeholder text to the real
  URL. **`package.json`** — added `author`/`repository` now that a real repo URL exists (deferred in
  Phase 8 specifically to avoid fabricating one).
- **Live-site verification** (delegated to a background agent, reviewed before accepting): all 6
  checks passed against the real deployed URL, not localhost — first-boot demo load (all three
  projects), Viewer role correctly hides 002 and hides edit controls, 001's variance table shows the
  exact planted overrun figures (Consultancy over budget: 318,500 actual / 558,500 projected /
  480,000 expected / 528,000 worst-case ceiling), 003's export downloads a real file, and "Demo
  data — reset" works cleanly. Zero console errors anywhere in the pass.

## Validation results

- Fresh clone: `pnpm install` (clean — the `pnpm-workspace.yaml` `allowBuilds: esbuild: true` fix
  from Phase 7 applied automatically, no manual approval needed on the "new machine") / `pnpm test`
  (116/116) / `pnpm lint` / `pnpm typecheck` / `pnpm lint:boundaries` (0 violations) / `pnpm
  validate:demo` / `pnpm build` — all green, then actually served and confirmed rendering.
- GitHub Actions CI on the pushed commit: **success**, 1m40s — same steps this session already ran
  locally, now confirmed running for real in CI, not just replicated by hand.
- Vercel production build log: clean install (same `esbuild` postinstall auto-approval), clean
  `next build`, deployed and aliased successfully.
- Live deployment: `curl` 200s on `/` and `/project?id=001`, then the full 6-point agent-browser
  pass described above — all pass, zero console errors.
- Final `pnpm lint` / `pnpm typecheck` after the `package.json`/`README.md` edits — clean.

## Deviations from the plan

- **No `.private/sanitize-terms.txt`, by design decision rather than oversight.** PLAN.md expects
  this file to hold real terms an actual prior employer's name/rates/codes to scrub, kept outside
  git. Since CaseDeck was built clean-room from the start (Phase 1's demo org, `demo/README.md`)
  with no real employer data ever entering the repo, there was nothing to populate that file with.
  Ran an equivalent grep pass (secrets, real paths, real name/email) across the full history myself
  and got explicit user sign-off to treat that as satisfying the checklist item, rather than
  fabricating a terms list or leaving the item silently unchecked.
- **No separate `demo/exports/*.html` sample file added.** The checklist's own wording accepts a
  README asset in place of a `demo/` file ("Export sample in the repo (`demo/` or README asset)");
  the existing screenshot plus the fact that the live demo can produce a real one in one click made
  a second, static, would-go-stale copy feel like unnecessary duplication rather than a genuinely
  missing artifact.

## Issues encountered

None. Both the fresh-clone build and the live deployment worked on the first attempt with no fixes
needed — Phase 8's validation work (and the fork's a11y/CSS fixes landing before this phase) left
nothing new to find here.

## Publish state

- Repo: `https://github.com/echosmasher/casedeck` (public)
- Live demo: `https://casedeck-blue.vercel.app`
- CI: green on the published commit
- Pre-publish checklist (PLAN.md §10): all applicable items checked; see Deviations for the two
  items resolved by explicit user decision rather than literal execution.

Phase 9 was the plan's last phase. Remaining open items are outside PLAN.md's scope entirely: the
PRD's actual success metric (advancement/response-rate signal once this is linked from real job
applications) can only be measured once the artifact is in circulation, not from inside this build.
