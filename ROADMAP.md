# Roadmap

CaseDeck v1 is deliberately scoped — see `casedeck.prd.md` for why (the MVP is the full PLAN.md
Phases 0–9, but "full" still means a bounded, single-tenant, local-first tool). This file lists
what's explicitly **out of v1**, and why each one is a real decision rather than an oversight.

None of these are implemented, even partially. If you're reading the code looking for a stub or a
half-built version of one of these, there isn't one — that's intentional (see
`CLAUDE.md`'s "no half-finished implementations" rule).

## 1. Tasks, assignments, contributor editing

Belongs to a task-tracking tool, not a profitability calculator — mixing the two would blur what
CaseDeck is actually for. The natural connection point is time logging: if task-level hours were
ever tracked elsewhere, they could feed CaseDeck's actual salary cost instead of a manually-entered
actuals CSV.

**Roadmap story:** *TaskDeck integration — task-level time logging feeds actual salary cost.*
Would require a shared data contract between the two tools (task hours → `SalaryLineItem` actuals)
and is not scoped or designed yet.

## 2. Real authentication & multi-tenancy

No accounts, invitations, or per-user permissions. v1 ships the demo's Planner/Viewer role switcher
(a UI-level toggle keyed to a known demo persona, not an auth system — see `demo/README.md`) and the
`StorageAdapter` interface, which exists specifically so a real multi-user backend could be added
later without touching the engine or UI (see item 8 below and `DEPLOYMENT.md` tier 3).

Building real auth now would be premature: there's no multi-user deployment to protect yet, and
retrofitting an interface boundary is far cheaper than retrofitting auth into code that assumed a
single local user.

## 3. PWA / offline sync / mobile app

v1 is responsive (works on a phone-sized viewport) and nothing more — no service worker, no
installable app, no cross-device sync. IndexedDB is already local-only and per-browser; "offline"
isn't a meaningfully different state for this tool today (there's no server to lose contact with).

## 4. Multi-currency & FX conversion

Each project has exactly one currency, display-only (see `CLAUDE.md` / PLAN.md's storage-adapter
decision). No conversion, no exchange-rate lookups, anywhere in the engine. A portfolio spanning
multiple currencies would need real, sourced FX rates and a decision about which rate applies when —
both add complexity with no planted demo story to justify them in v1.

## 5. ERP/API integrations

No NetSuite, no accounting-system API, no live sync. Actuals arrive by CSV import in v1 — a format
any accounting system can export to, which keeps the import pipeline's surface area to "parse a
file, validate it, name the row that's wrong" (see `DATA_REQUIREMENTS.md`) instead of maintaining
API clients for systems CaseDeck doesn't control.

## 6. In-app AI calls

No Anthropic API calls from the running app itself. AI involvement lives entirely in Claude Code
skills (`/setup`, `/business-case`) that run outside the app, interviewing the user or drafting
narrative text — and even there, only ever citing numbers a deterministic CLI already computed (see
`CLAUDE.md`, "Claude never computes a number that ends up in app output"). Adding in-app AI calls
would mean shipping an API key and a network dependency into what is otherwise a local-first,
`file://`-openable tool — a different product with different trust assumptions.

## 7. Notifications/email, portfolio roll-up across projects, capacity planning

Each is a real feature with its own design surface (a notification system needs delivery
infrastructure CaseDeck doesn't have; a portfolio roll-up needs a defined aggregation model across
projects with different currencies and periodizations; capacity planning needs a resourcing data
model this tool doesn't collect). None has a planted demo story motivating it, and each would
roughly double the data model's surface area for a single-project profitability calculator. Left
for a version of the product with an actual multi-project user base to prioritize against.

## 8. Supabase / real backend adapter (upgrade path, not shipped)

The `StorageAdapter` interface (`listProjects`, `getProject`, `saveProject`, `deleteProject`,
`importSnapshot`, `exportSnapshot`) was built with exactly one implementation in v1 —
`src/storage/indexedDbAdapter.ts` — specifically so a second implementation could be swapped in
later without touching `src/engine/` or the UI. A Supabase-backed adapter is the natural next step
if CaseDeck ever needed real multi-user access (item 2), since it would supply both the database and
row-level security for free. See `DEPLOYMENT.md` tier 3 for what that would involve; sibling repo
TaskDeck's real Supabase/RLS setup is a plausible pattern to borrow from when this is actually
picked up. Not designed in detail — noted here so the interface boundary that makes it possible
doesn't look accidental.
