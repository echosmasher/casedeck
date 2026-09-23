# Demo Organization — Example Group

A Nordic company with internal departments and one external customer, **Example Hotel A**
(a standalone invented entity — no relation to any real company). Currency NOK, loaded-cost
multiplier **1.35**, rate card with invented generic role labels only. All rates, account codes,
and multipliers are illustrative, not benchmarks — see `example-group.config.json`.

This file documents the three planted stories with their exact numbers, so a reviewer (or a future
engine test) can verify each one directly against the demo data. It is written and kept accurate
**before** the engine that will render these numbers exists (Phase 1 precedes Phase 2) — the
figures below are hand-computed from the raw budget/actuals data and are what the engine in Phase 2
must reproduce.

Every project's raw budget lives in its JSON snapshot (`demo/projects/`), sourced from the CSV in
`demo/budgets/`. Actuals are separate CSVs in `demo/actuals/`, imported against the same category
mapping — they are not embedded in the project snapshot.

**Project codes:** 001 Intranet Relaunch → `PRO-2601`, 002 Booking Integration → `PRO-2501`,
003 ERP Data Migration → `PRO-2602`. Convention is start year + a sequence number — illustrative,
not a real org's numbering scheme.

**Scope note:** actuals reconciliation in v1 covers **costs only**. Revenue for fixed-price/hourly
customer work is tracked as planned (per the project's `pricingModel`, at whatever confidence it
carries) — there is no separate "actual revenue received" import in this tool. This matters for the
002 story below: revenue is committed and simply assumed to land as contracted.

---

## Story 1 — 001 Intranet Relaunch (the overrun story)

Internal project, monthly, Jan–Aug 2026, status `in_progress`. At the time this story was written
(2026-08-14) "today" was inside its final budgeted month; the project stays `in_progress` with
`endPeriod: 2026-08` deliberately, so as real time moves past August 2026 the overview's `End`
column shows it red with an "Overdue" marker — showcasing that feature rather than being kept in
sync with the calendar. Approved with consultancy marked `estimated` (±10% band); salary marked
`estimated` too. Four months of actuals are loaded (Jan–Apr 2026); May–Aug are budget-only
(not yet incurred). Jan–Apr 2026 are also **closed** (`closedPeriods`) — the months with actuals
loaded; May–Aug stay open/projected.

**Budgeted (expected case), 8-month totals:**
| Line | Confidence | Monthly | 8-month total |
|---|---|---|---|
| Senior Developer (80h × 750 NOK/h) | estimated | 60,000 raw | — |
| Project Manager (40h × 800 NOK/h) | estimated | 32,000 raw | — |
| **Salary combined, loaded ×1.35** | estimated | 124,200 | **993,600** |
| Consultancy (external CMS vendor) | estimated | 60,000 | **480,000** |
| **Project total (expected)** | | | **1,473,600** |

Worst-case ceilings (cost lines, +10%): salary 1,092,960 · consultancy 528,000 · project total
1,620,960. Contingency (worst − expected) = 147,360.

**Actuals, Jan–Apr 2026:**
| Month | Salary actual | Consultancy actual | Consultancy vs. budget |
|---|---|---|---|
| Jan | 124,200 | 60,000 | on budget |
| Feb | 123,700 | 86,000 | +43.3% |
| Mar | 125,300 | 87,500 | +45.8% |
| Apr | 124,100 | 85,000 | +41.7% |
| **Sum** | **497,300** | **318,500** | avg ≈ **+43.6%** (months 2–4) |

**What the tool must surface:**
- **Salary tracks budget** (497,300 actual vs. 496,800 expected for the same 4 months — within
  0.1%) → not flagged.
- **Consultancy is flagged red.** Projection-to-complete = actuals(Jan–Apr) + budgeted(May–Aug) =
  318,500 + 240,000 = **558,500**, which **exceeds consultancy's own worst-case ceiling of 528,000**
  by 30,500 (+5.8%).
- **Blended project total** projects to 994,100 + 558,500 = **1,552,600** — still under the total
  worst-case ceiling (1,620,960), but **~54% of the total contingency is already consumed** by
  month 4. This is the "visible by month 3, before it became unrecoverable" lesson: the
  category-level flag fires well before the project-level ceiling would.

**Where visible:** Dashboard headline margin card (shrinking contingency); per-category breakdown
with drill-down reaching the two salary lines and the consultancy line; Variance view (Phase 5)
showing consultancy red, salary green, with the projection-to-complete figures above.

---

## Story 2 — 002 Booking Integration for Example Hotel A (the clean case + revenue-timing story)

Customer project, fixed price, quarterly, 2025-Q1–2025-Q4, status `completed`. Price 900,000 NOK,
**committed**, recognized entirely at completion (`allocation: at_period("2025-Q4")`). Costs
(salary, consultancy, travel) are `estimated` (±10%) each quarter.

**Budgeted (expected case) net per quarter:**
| Quarter | Revenue | Costs | Net | Cumulative |
|---|---|---|---|---|
| Q1 | 0 | 189,500 | −189,500 | −189,500 |
| Q2 | 0 | 194,500 | −194,500 | −384,000 |
| Q3 | 0 | 191,500 | −191,500 | −575,500 |
| Q4 | 900,000 | 87,750 | +812,250 | **+236,750** |

Total profitable (26.3% margin) despite three quarters of deep per-period losses — the project is
**not failing in Q1–Q3**; the loss is a revenue-timing artifact of `at_period(final)` allocation,
not a cost overrun.

**Actuals (full lifetime, imported as one Nordic-format file — semicolon-delimited, decimal
comma — `002-actuals-full-lifetime.csv`):** every cost line lands within ±10% of its quarterly
budget (largest single deviation: Q3 travel, 5,200 actual vs. 5,000 budget, +4%). Revenue actual
matches the committed contract amount exactly. **Nothing is flagged.** This is the calibration
check: the tool doesn't cry wolf when reality matches plan. All four quarters are **closed**
(`closedPeriods`) — a completed project with full-lifetime actuals has nothing left open.

**Where visible:** Dashboard's cumulative P&L chart shows the trough-then-spike shape described
above; Variance view (Phase 5) shows every category green — the direct visual contrast to 001.

---

## Story 3 — 003 ERP Data Migration (the scenario story)

Customer project, hourly pricing, monthly, Oct 2026–Mar 2027, status `planning`. No actuals exist
yet, and nothing is closed (`closedPeriods: []`) — every period is still a projection. Most lines
are `rough` (±30%); revenue's first two months are `estimated` (±10%) — nearer-term figures are
more certain than the rest, demonstrating per-period confidence override.

**Budgeted (expected case):**
| | Confidence | 6-month total |
|---|---|---|
| Revenue (400h/mo × 900 NOK/h) | estimated (Oct–Nov), rough (Dec–Mar) | 2,160,000 |
| Salary (Senior 150h/mo + Junior 100h/mo, loaded ×1.35) | rough | 1,356,750 |
| Consultancy (external ERP specialist, 90,000/mo) | rough | 540,000 |
| **Costs total** | | **1,896,750** |
| **Expected margin** | | **+263,250 (12.2%)** |

**Scenario bands:**
| | Revenue | Costs | Margin |
|---|---|---|---|
| Worst (revenue −10%/−30% by period, costs +30%) | 1,656,000 | 2,465,775 | **−809,775** |
| Expected | 2,160,000 | 1,896,750 | +263,250 |
| Best (revenue +10%/+30% by period, costs −30%) | 2,664,000 | 1,327,725 | **+1,336,275** |

Expected case is profitable; worst case is not — a wide enough spread that the honest answer at
approval time is a range, not a single number.

**Where visible:** this is the flagship business-case export screenshot (Phase 6). The dashboard's
scenario band chart shows a band crossing zero; the export's executive summary states the range
explicitly rather than picking one number.

---

## The broken file

`demo/actuals/broken-example.csv` — a generic (not project-scoped) actuals fixture used in docs and
tests, not part of any planted story above. Three deliberate problems, one per data row:

1. **Row 3** — semicolon-delimited inside an otherwise comma-delimited file (a stray delimiter,
   e.g. from pasting a Nordic export by mistake).
2. **Row 4** — a text value (`"N/A"`) in the `amount` column.
3. **Row 5** — an unknown account code (`6234`) not present in `example-group.config.json`'s
   category mapping.

Expected error messages are specified in `DATA_REQUIREMENTS.md`. No row is silently dropped; all
three are listed with file, row, column, and expected format, per the fail-loud rule in
`CLAUDE.md`.

---

## Demo mode (Phase 6)

The deployed app boots with Example Group pre-loaded and a **Planner / Viewer** role switcher in
the header. Planner is full edit, matching everything documented above. Viewer is read-only and
sees only **001** and **003** — not because those are hardcoded project ids anywhere in the app,
but because both carry a stakeholder tagged for the demo's shared viewer persona:

> **Erik Solberg, Head of Delivery** — `erik.solberg@example-group.invalid`, `viewer: true` on 001
> and 003's `stakeholders` array.

The narrative: a delivery lead tracking two flagship projects worth watching — the one with a live
overrun (001) and the one still at the wide-uncertainty planning stage (003) — but not the
already-completed, unremarkable one (002). 002 keeps its own, unrelated `viewer: true` stakeholder
(the customer's own contact, who'd legitimately have read access to *their* project in a real
deployment) — that stakeholder doesn't match the demo persona's email, so it doesn't grant Viewer
role access to 002.

This reuses the general-purpose `Stakeholder.viewer` flag from the data model (PLAN.md §4) exactly
as documented — the "demo mode" behavior is just the app matching on one specific, known persona
identity, not a separate access-control system.

A visible **"Demo data — reset"** control restores this exact snapshot (all three projects, all of
001's and 002's real actuals) at any time, discarding any local edits.
