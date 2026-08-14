@AGENTS.md

# CaseDeck — Engineering Rules

CaseDeck is a local-first project profitability calculator. Full context: `PLAN.md` (engineering
plan) and `casedeck.prd.md` (product intent). This file carries the invariants that must hold
regardless of which phase is in progress; it will grow with demo-data and testing conventions as
later phases land (see PLAN.md §7).

## Non-negotiable rules

1. **Engine purity.** `src/engine/` and `src/import/` must never import from `react`, `next`, or the
   DOM. They are plain, pure, unit-tested TypeScript. CI enforces this with dependency-cruiser.
2. **Engine vs. config separation.** Nothing organization-specific (category mappings, rate cards,
   loaded-cost multipliers, currency, confidence band percentages) is hardcoded outside `config/`
   and `demo/`.
3. **Deterministic core, AI interpretation only at the edges.** Claude never computes a number that
   ends up in app output. Claude's role is limited to the `/setup` interview (proposing a category
   mapping, always confirmed by the user before being persisted) and drafting narrative text for the
   business-case export (citing only numbers already present in the exported JSON).
4. **Fail loudly and specifically.** Validation/import errors name the file, row, column, and
   expected format. No silent skips — rejected rows are always listed, never dropped quietly.
5. **Local-first.** All persistence goes through the `StorageAdapter` interface
   (`src/storage/`). v1 ships only an IndexedDB implementation; no backend, no accounts, no
   telemetry.
6. **Self-contained export.** `src/export/` produces a single HTML file: inline CSS/JS/data, zero
   CDN calls, must open from `file://` with networking disabled. It does not reuse Recharts or ship
   a React runtime — it is a separate pure-function SVG generator over the same typed engine output
   the dashboard consumes.
7. **Clean-room demo content.** No real company names, brands, entity codes, benchmark values,
   salary levels, or workflow details from any prior employer. All demo rates/multipliers are
   invented and labelled illustrative in `demo/README.md`.

See PLAN.md for the full architecture, data model, phased build order, and pre-publish checklist.
