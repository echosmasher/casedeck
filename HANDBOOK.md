# Handbook — using CaseDeck to run a project

This is for the person who owns a project's budget month to month — a project manager, not an
accountant. If you're setting up CaseDeck for the first time, use the `/setup` skill instead (it
walks you through turning a raw budget export into a project); this handbook picks up from there,
covering the recurring workflow once a project already exists. There's no developer content here —
see `README.md`'s developer quickstart and `PLAN.md` for that.

## The core idea, in one paragraph

Every number you enter into CaseDeck carries a confidence level — `committed` (you have a signed
number), `estimated` (a reasonable planning figure, ±10%), or `rough` (an early guess, ±30%). The
dashboard never shows you a single profitability number; it shows you a range — best case, expected
case, worst case — built directly from those confidence levels. That range *is* the honest answer
early in a project, when some line items are locked and others are still guesses. As the project
runs and you import real actuals, the range narrows and the tool tells you, category by category,
whether reality is still inside it.

## The monthly actuals loop

This is the workflow you'll repeat every reporting period (monthly or quarterly, matching your
project's periodization):

1. **Get the actuals CSV from your accountant or finance system.** CaseDeck doesn't connect to
   anything — it reads whatever export your finance team already produces. The format it expects is
   documented in `DATA_REQUIREMENTS.md`; if your export doesn't match, reshape it before importing
   (the same reshaping step `/setup` walks through for budgets applies here).
2. **Import it.** The import screen shows you a preview before anything is saved, and maps account
   codes to your project's categories using whatever mapping you've already confirmed — new codes it
   hasn't seen before get flagged for you to map, once, and that choice is remembered for next time.
   If anything in the file is malformed, CaseDeck tells you exactly which row and column, and why —
   it never silently drops a row or guesses at a bad value.
3. **Read the "Budget vs. actual" view.** Each cost category gets one of three statuses:
   - **On track** — actuals plus the remaining budgeted periods (the *projection-to-complete*) stay
     within that category's own worst-case ceiling. No action needed.
   - **Watch** — the projection-to-complete has already consumed at least half of that category's
     contingency (the gap between its expected and worst-case figures). Not a crisis, but worth a
     look before it becomes one.
   - **Over budget** — the projection-to-complete has already exceeded that category's worst-case
     ceiling. This is a real breach, not a rounding difference — worth raising before the next
     status update, not after.
4. **Act on categories, not just the project total.** A category can go red while the project's
   *total* is still inside its overall worst case — that's not a bug, it's the point. A blended
   total can hide a real problem in one line item for months if you only ever look at the bottom
   line. Catch it at the category level, while there's still time to do something about it.

## What to do when a category goes red

The tool tells you *what* happened (this category's actual-plus-remaining-budget trajectory now
exceeds what you told it was the worst case), not *why*. That's a conversation, not a computed
number — go find out whether it's a scope change, a vendor rate increase, a one-time cost that
won't recur, or a genuine overrun, and update the plan accordingly (see re-baselining below). If
you're drafting something to send up the chain about it, the `/business-case` skill can turn the
current numbers into narrative text — but it only ever cites figures the tool actually computed, so
the explanation for *why* still has to come from you.

## When to re-baseline

CaseDeck doesn't have a separate "re-baseline" button — a budget line is just an editable input, and
re-baselining is simply going back into that line and changing its value or confidence level once
you have new information. Do it when:

- A category's status has gone to **Watch** or **Over budget** *and* you've confirmed the underlying
  cause is real and ongoing (not a one-off) — update the remaining periods' budgeted values to
  reflect what you now expect, rather than leaving stale numbers that will keep triggering the same
  flag every month.
- A line item's confidence should change — e.g. a `rough` estimate becomes `estimated` once you get
  a real quote, or `estimated` becomes `committed` once a contract is signed. Tightening confidence
  narrows that line's contribution to the worst/best-case spread, which is exactly what should
  happen as a project de-risks over time.

Don't re-baseline just to make a red flag go away — if the underlying number really did overrun, the
flag is doing its job by staying red until you've actually accounted for it.

## How to talk about bands with your decision maker

The scenario range is the deliverable, not a hedge to apologize for. A few habits that make that
land well:

- **Lead with the expected case, but always say the range out loud.** "Expected margin is
  180,000, and the range runs from a worst case of −50,000 to a best case of 380,000" is a complete,
  honest sentence. Quoting only the expected number and burying the range in a footnote defeats the
  point of tracking confidence at all.
- **Explain a wide range by pointing at *why*, not apologizing for it.** A wide band early in a
  project usually means most line items are still `rough` — that's expected at that stage, not a
  sign of bad planning. Say so directly: "most of this project's costs are still early estimates,
  which is why the range is wide right now — it'll narrow as we get firm quotes."
- **When the worst case crosses zero (an unprofitable scenario is inside the realistic range) but
  the expected case doesn't, say that explicitly.** That's the single most decision-relevant fact
  the tool can surface, and it's exactly the kind of thing a single-number budget hides. The 003
  project in the demo data (`demo/README.md`) is a worked example of this: expected margin is
  positive, worst case is meaningfully negative, and the honest answer at approval time is the
  range, not either number alone.
- **Use the exported business case for anything leaving the room.** The Export tab produces a
  single, self-contained HTML file with the numbers, charts, and narrative baked in — safe to email
  or hand to someone without CaseDeck installed. It's read-only by design, so what you send is
  exactly what you and the tool agreed on, not something a recipient can quietly edit.
