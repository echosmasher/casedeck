# QA-ROUND-3-PLAN.md — Follow-up to the dashboard critique

> Follow-up plan from the post-plan `/impeccable critique` (26/40, baseline 21/40), 2026-10-12.
> Predecessor: `DASHBOARD-CRITIQUE-PLAN.md` (Phases 1–7, all shipped).
> Follow phases in order — each phase ships independently and leaves the app green (tests, lint,
> typecheck, `lint:boundaries`, e2e). Where this plan is silent, follow CLAUDE.md / AGENTS.md.

---

## 0. Decisions locked in

- **Order:** colour/wording and internal-project charts first, then all four P1s. Reordering
  within the plan is allowed.
- **Engine boundary:** any new rule ("outside the band", "not started", …) goes into
  `computeHeadline` (`src/engine/headline.ts`) as tested engine code. The UI only formats.

---

## Suggested order

| # | Phase | Issue | Command(s) |
|---|---|---|---|
| 1 | Status pill and verdict agree | 2 | `/impeccable clarify` |
| 2 | Cost-based charts for internal projects | 1 | `/impeccable clarify` → `/impeccable layout` |
| 3 | No more silent changes | 4 | `/impeccable harden` |
| 4 | Variance evidence first | 3 | `/impeccable layout` + `/impeccable distill` |
| 5 | Final pass | — | `/impeccable polish` |

---

## Phase 1 — Status pill and verdict agree (issue 2) · `/impeccable clarify`

- Use rose only when a category is actually flagged or the gap to budget is outside the
  confidence band, so 002's 1.2% drift reads as neutral.
- Add a "Not started" state for projects with nothing closed: 003 becomes
  "Not started · worst case is a loss".
- Give completed projects a "Finished with a 234k NOK margin" sentence.
- Relabel the variance table's Total row so its blended Watch doesn't compete with the
  headline's Over budget.
- Rename the variance column "Expected total" to "Budgeted total", so "Expected" means only the
  projection.
- Consider "Over budget even in the best case" for 001.
- Any new rule, such as "outside the band" or "not started", goes into `computeHeadline` as tested
  engine code.

## Phase 2 — Cost-based charts for internal projects (issue 1) · `/impeccable clarify` → `/impeccable layout`

- For `type === "internal"`, plot cost by period and cumulative cost against budget, with
  positive axes and a budget line.
- Drop the P&L and "revenue lands later" copy for these projects.
- Mirror the same change in `src/export/charts.ts` so the export matches.

## Phase 3 — No more silent changes (issue 4) · `/impeccable harden`

- Undo for deleting a cost line, using the same pattern as recorded actuals.
- Keep Export drafts when you switch tabs, either by moving the draft up to the page or keeping
  the panel mounted.
- After Undo, move focus to the "Restored…" message.
- When an actual is added or deleted in a closed period, say that it moves the headline.
- Confirm a manual "Add actual", and stop "Add line" with an empty label from silently doing
  nothing.
- Stop periods later than the current month from being closed.

## Phase 4 — Variance evidence first (issue 3) · `/impeccable layout` + `/impeccable distill`

- Move Budget vs. actual directly under the headline tiles, and make the reason line
  ("Consultancy is past…") link to that row.
- Merge Cost by category into it as expandable rows, so there's one list in one order.
- Collapse the two charts into one, with a per-period/cumulative toggle.

## Phase 5 — Final pass · `/impeccable polish`

- The add-line form's corner radius.
- Title Case versus sentence case.
- The compact-versus-full figures rule.
- The jargon on the fixed-price card.
- The Export placeholder.
