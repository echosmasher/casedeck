# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **In-app user: the project manager who owns a project's budget**, not an accountant. They get rate
  cards and loaded-cost multipliers from finance, budget each line with an honest confidence level,
  and run a monthly (or quarterly) actuals loop. HANDBOOK.md is written for them. The dashboard's
  question for them: *is this project on budget, and is it still profitable?*
- **First-look audience: a technical reviewer or hiring manager** screening candidates for
  AI-native product engineer roles. They reach the live demo from a portfolio link, with no setup,
  and decide within seconds whether to engage further (casedeck.prd.md §1, §5). The demo must make
  the differentiator legible on the first screen.
- **Downstream reader: the CFO / budget approver**, who receives the self-contained HTML business
  case export, not the app.
- Demo roles: **Planner** (full edit) and **Viewer** (read-only, sees only projects tagged for the
  demo viewer persona).

## Product Purpose

Budget a project, see best / expected / worst scenarios driven by how confident the planner is in
each number, export a self-contained business case, then keep the same budget honest by importing
recorded actuals as the project runs. Success for the PM: a category drifting over budget is caught
before the project total shows a problem. Success for the artifact: a reviewer engages with the live
demo and reads it as evidence of judgment (casedeck.prd.md §4, §7).

## Positioning

A range, not one number: every budget line carries a confidence level (`committed`, `estimated`
±10%, `rough` ±30%; percentages are config) that drives the scenario band. And reality is checked
against that range category by category, flagging a single category's overrun before the blended
total would. The arithmetic is a deterministic, pure engine; AI appears only at the edges (the
`/setup` interview and drafting export narrative), never computing a number the app shows.

## Operating Context

- Monthly or quarterly actuals loop: the PM gets a CSV from accounting, imports it with a preview
  (nothing saved until commit), maps new account codes once, reads Budget vs. actual, closes the
  period, and re-baselines lines as reality clarifies them.
- Project types: **customer** (revenue from a pricing model; margin matters) and **internal**
  (cost-only; a negative margin is expected and is not a loss).
- Project statuses map to plain labels (not raw enum values); overdue is a UI-level check against
  today's date.
- Runs entirely in the browser; data lives in the user's own IndexedDB.

## Capabilities and Constraints

- Local-first: static export, no backend, no accounts, no telemetry; all persistence through the
  `StorageAdapter` interface (CLAUDE.md rule 5).
- Engine purity: `src/engine/` and `src/import/` are pure TypeScript with no React/Next/DOM; any
  number shown in the UI is computed there and only formatted in the UI (CLAUDE.md rules 1, 3).
- Org-specific values (category mapping, rate cards, multipliers, currency, band percentages) live
  in `config/` and `demo/`, never hardcoded (rule 2).
- Variance flags per category and for the project total: ≥50% of contingency consumed = **Watch**,
  ≥100% = **Over budget**, otherwise **On track** (`src/engine/variance.ts`).
- The business-case export is a separate pure SVG/HTML generator that opens from `file://` with
  networking off (rule 6).
- Errors name the file, row, column and expected format; rejected rows are always listed (rule 4).
- Revenue for closed periods: recorded revenue actuals when any exist for the period, otherwise
  the planned revenue (decided 2026-10-12; demo/README.md: revenue is tracked as planned, not
  reconciled; `src/engine/blended.ts`). Variance is cost-only: revenue actuals are not a variance
  category.

## Brand Commitments

- Name: **CaseDeck**. The visual system is recorded in DESIGN.md ("Precision Editorial Finance").
- Voice: plain, specific, written for a PM rather than an accountant; numbers are cited, never
  editorialised by AI.

## Evidence on Hand

- Demo organisation "Example Group" (invented), NOK, three planted stories with hand-computed
  figures in `demo/README.md`: 001 Intranet Relaunch (internal, a category overrun), 002 Booking
  Integration for Example Hotel A (customer, completed; the clean case plus revenue timing), 003 ERP
  Data Migration (customer, in planning, mostly rough estimates; the worst case crosses zero).
- Live demo: casedeck-blue.vercel.app. Screenshots in `docs/screenshots/`.
- Clean-room rule: no real company names, brands, entity codes, benchmarks, salary levels or
  workflow details from any prior employer; all demo rates are invented and labelled illustrative
  (CLAUDE.md rule 7). There are no testimonials, customers or usage data, and none may be invented.

## Product Principles

1. **Honest ranges over false precision.** Show the band and what drives it; never collapse
   uncertainty into one confident number.
2. **Catch drift early.** Surface the category that is going wrong, not just the blended total.
3. **Deterministic numbers, AI at the edges.** Every figure is traceable to engine code and the
   user's own inputs.
4. **Nothing changes silently.** Imports preview before saving, closing periods previews before
   applying, deletes can be undone, and rejected rows are listed.
5. **Legible in seconds.** The first screen answers the main question for a reviewer who
   will not dig.

## Accessibility & Inclusion

WCAG 2.2 AA: text contrast ≥4.5:1 (≥3:1 for large text and UI marks), status never conveyed by
colour alone, full keyboard operation, screen-reader names for controls and charts (with a table
alternative for every chart), and usable at 390 px width and at 200% zoom.
