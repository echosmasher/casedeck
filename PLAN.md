# PLAN.md — CaseDeck: Project Profitability Calculator

> Implementation plan for Claude Code. Follow phases in order. Items marked **DECISION** are
> irreversible or expensive to reverse — ask the repo owner before deviating from them.
> Where this plan is silent, follow the conventions in CLAUDE.md.

---

## 1. Project Overview

**Working name:** CaseDeck — **DECISION** (sibling naming to TaskDeck; confirm before scaffolding,
since the name lands in package.json, repo URL, README, and export footers).

**Elevator pitch (use in README):**

> Budget a project, see best/expected/worst scenarios driven by how confident you actually are in
> each number, export a self-contained business case your CFO can open from an email — then keep
> the same file honest by importing recorded actuals as the project runs. Built for project
> managers who budget, not for accountants.

**What it is:** A local-first web app (Next.js, deployable on Vercel) that takes a project through
its full financial lifecycle:

1. **Budget** — structured cost and revenue input with periodization (monthly / quarterly / total).
2. **Scenarios** — every figure carries a confidence marker (Committed / Estimated / Rough) that
   deterministically drives best/expected/worst bands. Confidence is not a cosmetic label; it is
   an input to the math.
3. **Business case** — one-click export of a single self-contained HTML file for decision makers.
   No login, no link rot, works offline and as an email attachment.
4. **Actuals** — recorded costs imported via CSV (or entered manually) against the same category
   mapping, producing a live budget-vs-actual variance view for the remaining project lifetime.

**The differentiator (foreground everywhere — README pitch, screenshots, demo):**
confidence-weighted scenario bands plus budget-vs-actual tracking. Generic calculators produce one
number; this produces a defensible range at approval time and stays accountable after approval.
The demo must make this visible within the first screen.

**Audience for the repo:** hiring managers and technical reviewers. Hard requirement: a reviewer
must see the value in under 2 minutes via the README and the live demo, without running any setup.

**Audience for the tool:** project managers who budget for their projects or departments. They
understand cost and revenue basics, they are not accountants, and they get their numbers (rate
cards, account codes, loaded-cost multipliers) from their accountants. Every label, default, and
error message is written for this persona. HANDBOOK.md is addressed to them.

---

## 2. Core Design Principles

These restate the house conventions as they apply to this repo. Claude Code must not violate them.

1. **Engine vs. config separation.** The calculation engine, import pipeline, and export renderer
   are generic. Everything organization-specific — category mapping, rate card, loaded-cost
   multiplier, currency, confidence band percentages — lives in `config/` (produced by the
   `/setup` skill or the in-app wizard). No hardcoded organization specifics outside `config/`
   and `demo/`.
2. **Deterministic core, AI interpretation.** All parsing, periodization, scenario math, matching,
   and validation is plain TypeScript: pure functions, unit-tested, reproducible. Claude's role is
   limited to (a) the `/setup` interview that proposes a category mapping for a user's budget file,
   and (b) drafting narrative text for the business case. Claude never computes a number that ends
   up in the output, and never silently writes config — every AI proposal passes through explicit
   user confirmation and is persisted as a plain, inspectable file.
3. **Demo-first.** The synthetic demo organization is built in Phase 1, before any engine code.
   Demo data contains planted stories (Section 5) that the tool must demonstrably surface,
   including one clean case so the tool doesn't cry wolf.
4. **Clean-room content.** No real company names, brands, entity codes, benchmark values, salary
   levels, or workflow details from any prior employer. All demo rates and multipliers are invented
   and documented as illustrative. The pre-publish checklist includes a sanitization grep
   (Section 10) whose term list lives *outside* the repo.
5. **Self-contained outputs.** The business-case export is a single HTML file: inline CSS, inline
   JS, inline data, zero CDN calls. It must render from a shared drive, an email attachment, and
   with networking disabled.
6. **Fail loudly and specifically.** Every import/validation error names the file, the row, the
   column, and the expected format. Example:
   `actuals-2026-04.csv, row 17, column "amount": expected a number (comma or point decimals), got "N/A"`.
   No silent skips: rejected rows are listed, never dropped quietly.
7. **Local-first.** All data lives in the browser (IndexedDB) behind a storage-adapter interface.
   No backend, no accounts, no telemetry in v1. JSON export/import provides backup and portability.

---

## 3. Architecture & Repository Structure

**Stack — DECISION:**
- Next.js (App Router) + TypeScript, static-exportable (`output: 'export'`) so the app runs on
  Vercel *and* on any dumb internal web server (deployment tier 2 depends on this — do not add
  server-side runtime dependencies). No API routes/server actions; all logic is client-side.
- pnpm as package manager (matches the sibling TaskDeck repo — one toolchain to think about
  across both portfolio pieces).
- Tailwind CSS + shadcn/ui (Radix/base-ui primitives) + lucide-react for icons — matches TaskDeck's
  component language, gives accessible primitives for free ahead of the Phase 8 a11y pass, and
  reuses a pattern already proven rather than hand-building a component kit from scratch.
- Recharts for the **live dashboard only** (interactive, React-rendered). The business-case
  export uses a separate, hand-rolled deterministic SVG chart renderer (see §6.4) — Recharts
  cannot be the export's chart source, since the export must render from `file://` with no
  network and (in practice) without shipping a working React runtime inline.
- Dexie (IndexedDB) behind the storage adapter.
- Papa Parse for CSV (must handle both `,` and `;` delimiters and both `.` and `,` decimals —
  Nordic Excel exports use semicolons and decimal commas; auto-detect, and say which was detected
  in the import preview).
- date-fns for period/calendar arithmetic (matches TaskDeck's usage; avoids hand-rolled date math
  for monthly/quarterly periodization).
- ajv for validating config files against `config/config.schema.json` at load time.
- dependency-cruiser to enforce the engine-purity import-boundary rule in CI (a config-driven,
  readable rule set: `src/engine/` and `src/import/` may not import from `react`, `next`, or the
  DOM).
- fast-check for property-based tests on scenario math (band symmetry, committed invariance) and
  periodization (allocations sum to totals).
- Vitest for unit tests; Playwright for a small set of smoke E2E tests; GitHub Actions CI.

**Storage adapter — DECISION.** All persistence goes through a `StorageAdapter` interface
(`listProjects`, `getProject`, `saveProject`, `deleteProject`, `importSnapshot`, `exportSnapshot`).
v1 ships exactly one implementation (IndexedDB). The interface exists so a Supabase/multi-user
adapter can be added later without touching the UI or engine (see ROADMAP and DEPLOYMENT.md).
Retrofitting this later is painful — build it first, keep it thin.

**Single currency per project — DECISION.** Each project has one currency (NOK/SEK/DKK/EUR/...,
display-only; no FX conversion anywhere in v1). Multi-currency is a v1 exclusion (Section 8).

```
casedeck/
├── README.md
├── HANDBOOK.md
├── DATA_REQUIREMENTS.md
├── DEPLOYMENT.md
├── ROADMAP.md
├── LESSONS_LEARNED.md          # only if genuine findings emerge during the build
├── CLAUDE.md
├── LICENSE                     # MIT
├── .gitignore                  # excludes user data, .private/, .env*
├── .github/workflows/ci.yml
├── config/
│   ├── config.schema.json      # JSON Schema for all config files
│   └── default/                # neutral defaults (categories, bands, statuses)
├── demo/
│   ├── README.md               # demo org + planted stories, documented
│   ├── example-group.config.json
│   ├── projects/               # three project JSON snapshots (Section 5)
│   ├── budgets/                # source budget CSVs used to build them
│   └── actuals/                # monthly actuals CSVs incl. the deliberately broken file
├── skills/
│   ├── setup/SKILL.md          # /setup — budget interpretation interview
│   └── business-case/SKILL.md  # /business-case — narrative drafting
├── src/
│   ├── engine/                 # pure functions only — no imports from ui/ or storage/
│   │   ├── model.ts            # types: Project, LineItem, ActualEntry, Config...
│   │   ├── periodize.ts        # monthly/quarterly/total expansion, revenue allocation
│   │   ├── scenarios.ts        # confidence → best/expected/worst
│   │   ├── loadedCost.ts       # salary hours × rate × loaded-cost multiplier
│   │   ├── variance.ts         # actuals vs budget, projection-to-complete
│   │   └── validate.ts         # config + import validation, error formatting
│   ├── import/                 # CSV parsing + mapping (budget and actuals share this)
│   ├── storage/                # StorageAdapter + IndexedDB implementation
│   ├── export/                 # self-contained HTML business-case renderer
│   ├── app/                    # Next.js routes
│   └── components/
├── tests/
│   └── fixtures/               # symlinked/copied from demo/ where possible
└── public/
```

**Engine purity rule:** `src/engine/` and `src/import/` must have zero dependencies on React,
Next.js, or the DOM. CI enforces this with an import-boundary lint rule. This is what makes the
core testable and reusable.

---

## 4. Data Model (summary — full types in `src/engine/model.ts`)

**Project:** id, name, type (`customer` | `internal`), status (`planning` | `ready_for_approval` |
`approved` | `in_progress` | `completed` | `on_hold`), start period, end period (deadline for
customer projects, planned finish for internal), currency, display units (whole | thousands),
periodization (`monthly` | `quarterly` | `total`), stakeholders (role, name, email, viewer flag),
dependencies (free text list), pricing model, loaded-cost multiplier (defaults from config).

**Pricing model:** `fixed` (amount + allocation: `even` | `at_period(p)` | `custom[]`) or
`hourly` (estimated hours per period × hourly rate).

**Cost line item:** category (`salary` | `consultancy` | `it_systems` | `travel` | `other_direct`
— extendable via config), label, values per period, confidence per period (line-level default,
per-period override), for salary lines: role label + hours per period + rate (loaded-cost
multiplier applied by the engine, never pre-baked into the rate).

**Confidence markers — DECISION (names and default bands):**
- `committed` — contracted / price agreed. Band ±0%.
- `estimated` — informed estimate. Band ±10%.
- `rough` — placeholder / early guess. Band ±30%.

Bands are configurable in `config/`, and the dashboard legend states the active percentages.
Scenario math: expected = entered values; worst = costs +band and revenue −band;
best = costs −band and revenue +band. Pure function, property-tested.

**Actual entry:** period, category (via mapping or manual pick), amount, description, source
(`csv` | `manual`), source file + row reference for CSV entries (traceability), optional account
code.

**Category mapping (config):** account code → category, plus "ignore" and "ask" states. Produced
by `/setup` or in-app during import preview; reused automatically for subsequent actuals files.

---

## 5. Demo Organization

Built in **Phase 1**, before engine code. All names, rates, and codes invented.

**Organization:** *Example Group* — a Nordic company with internal departments and one external
customer, *Example Hotel A* (a standalone invented entity — not reused from TaskDeck's demo data;
TaskDeck's actual demo brands, Nordvik/Havstad, don't appear here). Config: currency defaults NOK,
loaded-cost multiplier **1.35** (documented in the demo README as illustrative, not a benchmark),
rate card with generic role labels only (Junior Developer, Senior Developer, Project Manager,
Designer — invented rates).

**Projects (plain numeric IDs):**

**001 — Intranet Relaunch** *(internal, monthly, 8 months, in progress — the overrun story).*
Approved on a budget where consultancy was marked `estimated`. Four months of actuals are loaded.
Salary tracks budget; consultancy is running ~40% over from month 2 and the variance view projects
a total overrun that eats the contingency. **The tool must surface this**: variance dashboard flags
consultancy red, projection-to-complete exceeds the approved worst-case band. Planted lesson: the
overrun was visible in the data by month 3 — before it became unrecoverable.

**002 — Booking Integration for Example Hotel A** *(customer, fixed price, quarterly, completed —
the clean case and the revenue-timing story).* Fixed price recorded at delivery (allocation
`at_period(final)`), so the per-period view shows deep losses for three quarters and a spike at the
end — while the total is comfortably profitable. Actuals for the full lifetime land within the
`estimated` bands. **Two things demonstrated:** periodization/revenue-timing literacy (the project
is *not* failing in Q1–Q3), and calibration — the tool doesn't cry wolf when reality matches plan.

**003 — ERP Data Migration** *(customer, hourly-based, monthly, planning stage — the scenario
story).* No actuals. Most lines are `rough`, hours dominate, and the best/worst spread is wide
enough that the expected case is profitable but the worst case is not. This is the project used for
the flagship business-case export screenshot: the honest answer at approval time is a range, and
the export says so.

**Broken file:** `demo/actuals/broken-example.csv` — wrong delimiter on one row, a text value in
`amount`, an unknown account code. Used in docs and tests to demonstrate loud, specific validation.

`demo/README.md` documents every planted story and exactly where in the UI each one is visible
(page + what to look for), so a reviewer can verify them in minutes.

**Demo mode:** the deployed Vercel app boots with Example Group pre-loaded and a role switcher in
the header — **Planner** (full edit) / **Viewer** (read-only, sees only projects where the demo
viewer persona is tagged: 001 and 003). A visible "Demo data — reset" control restores the
snapshot. Real per-user auth is explicitly out of scope (Section 8); DEPLOYMENT.md explains what
the role switcher simulates and what a real deployment would need.

---

## 6. Component Specs

### 6.1 Calculation engine (`src/engine/`)
- **Purpose:** all numbers, deterministically.
- **Flow:** project snapshot in → periodized cost/revenue matrix → scenario bands → totals,
  margins, cumulative P&L → (if actuals present) variance + projection-to-complete
  (actuals for closed periods + expected values for remaining periods).
- **Inputs:** `Project`, `Config`, `ActualEntry[]`. **Outputs:** typed result objects consumed by
  dashboard and export. No formatting inside the engine; display units/currency applied in UI.
- **Failure behavior:** invalid model states (e.g. custom revenue allocation not summing to the
  fixed price, negative hours) return typed validation errors listing field and expected rule —
  never NaN propagation. `validate.ts` runs before every computation.

### 6.2 Import pipeline (`src/import/`) — shared by budget and actuals
- **Purpose:** one pipeline, two sources. Budget CSV (initial line items) and actuals CSV reuse
  the same parser, mapping, and preview.
- **Flow:** detect delimiter + decimal convention → parse → validate schema → apply category
  mapping from config → **preview screen** (row count, per-category totals, detected conventions,
  unmapped codes, rejected rows with reasons) → user resolves unmapped codes (choices persist to
  config) → commit. Nothing is written before commit.
- **Inputs:** CSV per DATA_REQUIREMENTS.md. **Outputs:** line items (budget) or actual entries
  (actuals), each carrying file/row provenance.
- **Failure behavior:** per principle 6. A file with any invalid row imports nothing by default;
  the user may explicitly choose "import valid rows only", and rejected rows remain listed.

### 6.3 Dashboard
- **Purpose:** the decision-maker view, live in-app.
- **Contents:** headline cards (total cost, revenue, margin — expected, with best/worst range),
  scenario band chart across the lifetime, cumulative P&L, per-category breakdown with
  **drill-down** to the underlying input lines, and — when actuals exist — budget-vs-actual by
  category with variance flags and projection-to-complete. Quick-adjust arrows on input values
  update every figure immediately (state flows one way: input → engine → views).
- **Failure behavior:** a project failing validation renders the error list, never a partial
  dashboard.

### 6.4 Business-case export (`src/export/`)
- **Purpose:** the CFO deliverable — a single self-contained HTML file.
- **Flow:** render current project (or a chosen scenario emphasis) + optional narrative sections →
  inline all CSS/JS/data → download. Print-friendly (sensible page breaks → PDF via browser print).
- **Charts — DECISION:** the export does not reuse Recharts or ship a React runtime. A small,
  pure-function SVG chart generator (`src/export/charts.ts`) takes the same typed engine output the
  dashboard consumes and emits static `<svg>` markup directly — unit-tested like any other engine
  output, no DOM/browser APIs required to run it. This keeps the export deterministic and testable,
  and guarantees it works with network disabled since nothing needs to execute client-side to
  produce the visuals. The live dashboard's Recharts charts and the export's SVG charts are two
  renderers over one data shape; they are not required to be pixel-identical, only faithful to the
  same numbers.
- **Contents:** header (project, status, date, currency, units), executive summary (narrative slot),
  scenario summary with explicit band definitions, per-period tables, charts (inline SVG),
  assumptions & dependencies, confidence legend. Footer: generated-by + timestamp.
- **Failure behavior:** export refuses (with the validation list) rather than emitting a file with
  broken numbers. **Acceptance:** opens correctly with network disabled, from `file://`.

### 6.5 Skill: `/setup` (`skills/setup/SKILL.md`)
- **Purpose:** turn a user's real budget file into config + a project skeleton, by interview.
- **Flow:** ask for the budget file → run the deterministic parser (skill instructs Claude to use
  the repo's import CLI, not to eyeball numbers) → Claude proposes account-code → category mapping
  → asks the user about every unclear code ("which cost group is account 4510?") → asks for
  currency, periodization, loaded-cost multiplier (with a plain-language explanation of what it is
  and a pointer to ask their accountant) → writes `config/*.json` + a project JSON importable by
  the app → tells the user exactly what was written and where.
- **Failure behavior:** if the file fails parsing, the skill surfaces the engine's specific error
  verbatim and stops; it never guesses at file contents.

### 6.6 Skill: `/business-case` (`skills/business-case/SKILL.md`)
- **Purpose:** draft the narrative sections (executive summary, risk commentary on the widest
  bands, variance commentary if actuals exist) from an exported project JSON.
- **Flow:** read the JSON → write narrative referencing only numbers present in it → output
  markdown the user pastes into the export's narrative slot. The skill must instruct Claude to
  cite figures exactly as computed and never introduce numbers of its own.

---

## 7. Documentation

- **README.md** — pitch (elevator pitch above) → screenshots (dashboard with bands; variance view
  with the 001 overrun; the export) → **live demo link** → problem statement (single-number budgets
  and stale spreadsheets) → how it works (lifecycle diagram) → quickstarts (reviewer: open demo;
  user: fork + `/setup`; developer: clone + test) → architecture summary → license.
- **HANDBOOK.md** — for the PM persona. The recurring workflow: monthly actuals loop (get the CSV
  from your accountant → import → read the variance view → what to do when a category goes red),
  when to re-baseline, how to talk about bands with your decision maker. No developer content.
- **DATA_REQUIREMENTS.md** — budget CSV and actuals CSV formats: columns, types, delimiter and
  decimal conventions, examples of valid files and of every validation error message.
- **DEPLOYMENT.md** — three tiers: (1) live demo / one-click Vercel fork; (2) company-internal:
  static build on any internal web server, data stays in each user's browser, JSON export for
  handover — includes an honest section on what local-first means for multi-user expectations;
  (3) upgrade path: what the Supabase adapter would involve (roadmap, not shipped).
- **ROADMAP.md** — Section 8 verbatim, with rationale per item.
- **LESSONS_LEARNED.md** — only if the build produces genuine findings; otherwise omit the file.
- **CLAUDE.md** — engine purity rule, config/engine boundary, error-format convention, test
  expectations, demo-data invariants (planted stories must keep working), sanitization rules.

---

## 8. ROADMAP.md — explicitly excluded from v1

Do not implement any of these, even partially. Each gets a rationale in ROADMAP.md.

1. **Tasks, assignments, contributor editing** — belongs to TaskDeck. Roadmap story:
   *TaskDeck integration — task-level time logging feeds actual salary cost.*
2. **Real authentication & multi-tenancy** (accounts, invitations, per-user permissions).
   v1 ships the demo role switcher + adapter interface only.
3. **PWA / offline sync / mobile app.** v1 is responsive, nothing more.
4. **Multi-currency & FX conversion.**
5. **ERP/API integrations** (NetSuite etc.) — actuals arrive by CSV in v1.
6. **In-app AI calls** (Anthropic API from the UI) — AI lives in Claude Code skills in v1.
7. **Notifications/email**, **portfolio roll-up across projects**, **capacity planning**.

---

## 9. Implementation Phases

Each phase ends only when its acceptance criteria pass. Do not start a phase early.

**Phase 0 — Scaffold.** Next.js + TS + Tailwind static-export scaffold, lint/typecheck/Vitest,
CI on push, MIT license, .gitignore (user data, `.private/`, `.env*`), CLAUDE.md.
*Accept:* CI green on the empty scaffold; `npm run build` produces a static export.

**Phase 1 — Demo organization (before any engine code).** Write `demo/` in full: config, three
project snapshots, budget + actuals CSVs (including the broken file), demo README with planted
stories, DATA_REQUIREMENTS.md first draft (formats are defined *here*, by the demo files).
*Accept:* demo README documents all three stories + where each is visible; CSVs conform to
DATA_REQUIREMENTS.md by manual review; a schema linter validates the JSON snapshots.

**Phase 2 — Engine.** `src/engine/` complete with unit tests using demo fixtures. Property tests
for scenario math (band symmetry, committed invariance) and periodization (allocations sum to
totals).
*Accept:* engine reproduces the planted numbers — 001 projection-to-complete breaches worst case,
002 total profitable while Q1–Q3 cumulative negative, 003 worst case negative / expected positive;
coverage ≥ 90% on `src/engine/`; import-boundary lint passes.

**Phase 3 — Storage + app shell + input.** StorageAdapter + IndexedDB impl, project list/dropdown,
setup wizard (all Project fields), input grid with per-period values, confidence markers,
quick-adjust arrows, JSON export/import.
*Accept:* create → edit → reload persists; snapshot export/import round-trips byte-stable modulo
timestamps; keyboard-only entry works in the grid.

**Phase 4 — Dashboard.** Everything in 6.3 minus actuals views.
*Accept:* the 003 screenshot story reads clearly; drill-down reaches every input line; a validation
failure renders the error list, not a partial dashboard.

**Phase 5 — Import pipeline + actuals.** 6.2 in full, actuals entry UI, variance +
projection-to-complete views.
*Accept:* importing 001's four actuals files surfaces the consultancy overrun with red flag;
`broken-example.csv` produces the three documented error messages verbatim, file/row/column named;
mapping choices persist and auto-apply to the next file.

**Phase 6 — Export + demo mode.** 6.4, role switcher, demo boot + reset.
*Accept:* export opens from `file://` with network disabled; Viewer sees exactly 001 and 003,
read-only; reset restores planted stories exactly (engine fixture test re-run against the reset
state).

**Phase 7 — Skills.** `/setup` and `/business-case` per 6.5/6.6, each tested end-to-end against a
fresh synthetic budget file (not the demo files).
*Accept:* `/setup` on the test file yields valid config + importable project JSON with zero manual
fixes; unclear codes trigger questions rather than guesses; `/business-case` output contains no
number absent from the input JSON (spot-check).

**Phase 8 — Docs + polish.** Full docs set, screenshots, responsive + a11y pass (labels, focus
order, contrast), Playwright smoke: boot demo → open 001 → import an actuals file → export 003.
*Accept:* Playwright suite green in CI; README reviewed against the 2-minute rule by walking it
top-to-bottom with a timer.

**Phase 9 — Fresh-clone test + publish.** On a clean machine/container: clone → install → test →
build → run; deploy demo to Vercel; run the pre-publish checklist.
*Accept:* every checklist item checked, fresh-clone run documented in the PR description.

---

## 10. Pre-Publish Checklist

- [ ] Fresh clone → install → `pnpm test` → `pnpm build` → run, on a machine that has never
      seen the repo. Steps match the README quickstart exactly.
- [ ] Live demo deployed; README link works; demo boots with Example Group and the role switcher.
- [ ] All three planted stories verified in the deployed demo, following `demo/README.md`.
- [ ] Sanitization grep: run the term list from `.private/sanitize-terms.txt` (kept **outside git**;
      `.private/` is git-ignored — never commit employer names, real entity-code patterns, real
      brand terms, colleague names, or real rates, not even inside the checklist itself) against
      the full repo history to be published. Zero hits. Publish as a fresh single-commit history
      if the working history ever contained near-misses.
- [ ] Grep for secrets: no `.env`, keys, tokens; `git log -p` spot check.
- [ ] All demo rates/multipliers labelled as illustrative in `demo/README.md`.
- [ ] LICENSE (MIT) present; package metadata (author, repo URL) correct.
- [ ] CI green on the publish commit; screenshots in README match the current UI.
- [ ] Export sample in the repo (`demo/` or README asset) re-generated from the final build.
- [ ] README 2-minute walkthrough timed once more, post-screenshot updates.

---

## 11. Architecture Decisions Log (session — 2026-08-13)

This plan already carried most eng-lead calls as inline **DECISION**s. This session's job was to
pressure-test those against the sibling TaskDeck repo and settle what was left genuinely open. Kept
here so the reasoning survives, not just the conclusions baked into the sections above.

**Reference checked:** `~/archon/taskdeck` (sibling portfolio repo). Findings: TaskDeck is a full
Supabase/Postgres app with real auth and RLS — architecturally unrelated to CaseDeck's local-first,
no-backend design, and that divergence is correct and unchanged (see §8 non-goals). TaskDeck's
actual demo brands are *Nordvik*/*Havstad*, not *Example Hotels* as this plan previously assumed —
see the demo-org correction below. TaskDeck's real, observed conventions (not just its docs, which
carry no authored content beyond an autogenerated Next.js notice): pnpm, Tailwind + shadcn/ui +
lucide-react, Vitest for unit tests, Playwright for e2e, ESLint 9 flat config, GitHub Actions CI —
CaseDeck now matches on all of these where nothing about local-first/static-export conflicts.

**Key decisions made this session (with rationale):**
- **Demo org identity — standalone, not reused.** Considered reusing TaskDeck's real Nordvik/Havstad
  brand for a coherent cross-repo fictional world; user chose to keep CaseDeck's demo standalone
  instead, with the customer renamed from the previously-inaccurate "Example Hotels" to a single
  entity, "Example Hotel A". §5 and the 002 project title updated accordingly. The stale "reusing
  the sibling repo's demo brand" claim is removed — it was never true.
- **Export charts are a separate deterministic renderer, not Recharts.** The export's hard
  requirement (opens from `file://`, network disabled) is incompatible with shipping a working
  Recharts+React runtime inline without real fragility and bundle-size cost. Decision: a small
  pure-function SVG generator in `src/export/charts.ts`, consuming the same typed engine output as
  the dashboard. Two renderers, one data shape — see §3 and §6.4. This was the single biggest
  under-specified technical risk in the original plan and is now closed.
- **Component library: shadcn/ui**, matching TaskDeck — accessible primitives for free ahead of the
  Phase 8 a11y pass, one visual language across both portfolio pieces, less new surface for a
  solo builder to learn from scratch.
- **Package manager: pnpm**, matching TaskDeck. Checklist commands in §10 updated to `pnpm`.
- **Reversible, low-cost calls, decided without debate:** date-fns for period arithmetic (matches
  TaskDeck); ajv for `config.schema.json` validation; dependency-cruiser to enforce the engine-purity
  import boundary in CI (config-driven, readable violations, easy to point a reviewer at); fast-check
  for the property tests §9/Phase 2 already requires. All cheap to swap later if they don't pan out —
  none of them touch the data model, storage contract, or exported file format.

**Missing pieces this surfaces (not yet built, needed by the phases above):**
- `dependency-cruiser` config encoding the engine-purity rule (needed by Phase 0/2 acceptance).
- `src/export/charts.ts` itself — the SVG generator has no reference implementation yet; budget
  real design time for it in Phase 6, not a side detail.
- `config/config.schema.json` authored against ajv's dialect before Phase 1 demo config is written.

**Spikes / experiments:**
- None rise to spike-worthy. The one candidate — export chart rendering — was resolved by decision
  rather than a build-first spike, because the fallback (plain data tables, no charts, in the export)
  is cheap and reversible if the hand-rolled SVG renderer proves harder than expected during Phase 6;
  no need to de-risk before Phase 0 starts.

**Open questions (deliberately deferred):**
- Whether CaseDeck ever gets a real cross-repo link to TaskDeck (e.g. the ROADMAP's "TaskDeck
  integration" story) given the demo worlds are now explicitly *not* shared — revisit if/when that
  roadmap item is actually picked up.
- Supabase-adapter roadmap item (§7 DEPLOYMENT.md tier 3) could reuse TaskDeck's migration/RLS
  patterns as precedent when it's eventually built — not a v1 concern, noted for whoever picks it up.
