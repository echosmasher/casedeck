# Brief: project dashboard headline verdict

> Output of DASHBOARD-CRITIQUE-PLAN.md Phase 2 (`/impeccable shape`), approved 2026-10-12.
> Builds in Phase 3 (`layout` → `typeset` → `clarify`). Product context: `PRODUCT.md`.
> Visual system: `DESIGN.md` (this extends it; no new visual world).
> Reference sketches (code-led, Operate surface): `.impeccable/mocks/headline/` (open
> `sketch.html?opt=B&p=001`, `?opt=B&p=003`, add `&m=1` for 390 px). Approved option: **B**.

## Job and audience

- The PM who owns the budget opens the Dashboard tab to learn *is this on budget, is it still
  profitable?*; a reviewer on the live demo gives it seconds. Mode: Operate.
- The headline answers that question in one sentence before any chart; the tiles below become
  supporting evidence instead of three equal answers.

## Approved direction (option B)

Inside the Dashboard tab, above the tiles, in this order:

1. **Status line** — status pill + one plain reason.
   - Status = **worst category flag** from `computeVariance` (`src/engine/variance.ts`), not the
     total's flag. Labels: On track / Watch / Over budget (same as `VarianceSection`).
   - Reason names the driving category when not on track ("Consultancy is past its worst-case
     ceiling." for red; a "has used over half its contingency" phrasing for Watch). When on track,
     state the most material fact the numbers support (e.g. 003: "Worst case is a loss.").
2. **Verdict sentence** (`display-verdict` type, below).
   - Customer: "Expected margin 263k NOK, somewhere between an 810k loss and a 1.34M gain." Expected
     margin leads; best–worst range in the sentence; difference vs. budgeted margin in the source
     line or tiles when non-zero.
   - Internal: "Expected to cost 1.55M NOK, 79k over budget." Cost vs. budget leads; never a red
     "loss" headline for an internal project's expected negative margin.
   - The unfavourable figure is set in a darker rose ink (≥4.5:1); the words carry the meaning, the
     colour only reinforces it.
3. **Range strip** — the product's differentiator in the headline: a hairline axis, a filled
   best–worst band, the expected value as a dot, budget as a dashed tick, and a zero tick when the
   band crosses zero. Labels: Expected / Budget above, Best / Worst / 0 below (worst/best ends swap
   for cost vs. margin). When expected equals budget, one "Expected = budget" label. Needs a text
   equivalent for screen readers (the sentence plus source line already carry every value).
4. **Source line** — "Actuals through 2026-04, projected May–Aug · range 1.48M–1.63M NOK", or "No
   actuals yet; every period is projected."
5. **Supporting tiles**, stepped down to `metric-lg`:
   - Internal: Spent to date (with over/under plan to date) · Budget · Over/under by (abs, %).
   - Customer: Revenue (range) · Cost (range) · Budgeted margin (with difference).

## Header (Phase 3b)

- Status through one shared label map (extract `STATUS_LABEL`; it must stay importable by
  `src/export/`, so it cannot live in `src/app/` — use a framework-free module).
- Overdue marker via `isProjectOverdue` — text + colour, never colour alone.
- Meta line drops the internal id ("001"); "← Projects" and Edit read as one nav group.

## Type (Phase 3c) — DESIGN.md change approved

- Add `display-verdict`: Geist 40px / 46px, weight 600, letter-spacing −0.03em; mobile 28px / 34px,
  −0.025em. Max measure ~24ch, balanced wrapping.
- Dashboard tiles step down from `display-xl` (32px) to `metric-lg` (24px).

## Engine (Phase 3a)

- Budget totals and variance vs. budget (absolute, %) and the worst-category status come from pure,
  unit-tested engine functions; the UI only formats. Reuse the variance thresholds.
- **Revenue fallback for closed periods (approved):** a closed period uses recorded revenue actuals
  when any exist, otherwise the planned revenue (demo/README.md: revenue is tracked as planned, not
  reconciled). Demo 002 must then show its planned +234k margin instead of −666k. Unit tests for
  customer, internal, all-closed, and no-closed projects.
  - Knock-on: the closed-period "no actuals" warnings (engine `warnings` and the Phase 1
    close-period preview copy "will count as 0 cost and 0 revenue") must be updated to say only
    cost counts as zero.

## States and ranges

- 001 internal, in progress, a category red, total Watch → Over budget headline.
- 002 customer, completed, all periods closed, range collapses to one value → the sentence and
  strip must handle best = worst (no band, single dot; `formatRange` collapses equal values).
- 003 customer, planning, nothing closed, worst case negative → zero tick in the strip.
- Long project names and values in the millions; NOK and other currencies from config; "thousands"
  display units.
- Viewer role sees the same headline (read-only changes nothing here).

## Out of scope

- The business-case export does not get the headline in this phase (open question in the plan).
- Contrast token changes (Phase 4), mobile table layouts (Phase 5), chart polish (Phase 6).
