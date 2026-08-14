---
name: business-case
description: Draft the narrative sections (executive summary, risk commentary, variance commentary) for a CaseDeck business-case export, from an exported project JSON. Use when a user has a project JSON or snapshot export and wants narrative text to paste into the Export tab. Triggers on "/business-case", "write the executive summary for this project", "draft narrative for my business case".
---

# /business-case — draft the narrative from computed numbers

You are drafting text a project manager will paste into CaseDeck's Export tab, which a decision
maker will then read. Write for that reader: plain language, no unexplained jargon, confident but
honest about uncertainty.

## The one rule that matters most

**You never introduce a number of your own, and every figure you cite must come from
`scripts/business-case-cli.ts`'s output, not from reading the raw project JSON and doing arithmetic
yourself.** The raw project JSON has hours, rates, and per-period values — it does not have the
computed totals, scenario bands, or variance figures your narrative needs to reference. Those only
exist once the engine computes them. If you catch yourself multiplying or summing numbers from the
input file to state a figure, stop — run the CLI instead.

## Step 1 — get the input

Ask the user for the project JSON (or a full snapshot export) if they haven't provided one. It's
either:
- A **standalone project JSON** (the shape `demo/projects/*.json` and `/setup`'s CLI output use), or
- A **full snapshot** (`{ schemaVersion, exportedAt, projects: [...], actuals: [...] }`) — CaseDeck's
  "Export snapshot" button produces this. If so, also ask which project id you're drafting for.

## Step 2 — run the CLI, read its output, nothing else

```
pnpm business-case:cli <input.json> [projectId] [--config <groupConfig.json>]
```

Omit `--config` and it uses the neutral default confidence bands (committed ±0%, estimated ±10%,
rough ±30%). Pass the org's actual `config.json` (from `/setup`'s output, or wherever the org's
config lives) if the org customized its bands — cite whichever bands were actually used.

The CLI prints one JSON object to stdout:
- `project` — id, name, type, status, currency, display units, periodization, dates, dependencies.
- `confidenceBands` — the band percentages actually applied.
- `scenarios` — `totals.cost/revenue/margin` (each `{expected, best, worst}`), `marginByPeriod`,
  `costByCategory`. This is where "expected margin is X, worst case is Y" comes from.
- `variance` — `null` if the input had no actuals for this project, otherwise per-category
  `actualToDate` / `projectionToComplete` / `expectedTotal` / `worstCeiling` / `flag`
  (`"ok"` / `"warning"` / `"red"`).

If the CLI exits non-zero, it printed why (the project fails validation) — tell the user and stop;
don't draft narrative for numbers that don't check out.

## Step 3 — draft each section

Write markdown. Include only the sections that apply:

**Executive summary** (always). Lead with the expected margin and, if the worst case differs
meaningfully from it (i.e. the range is wide, or the worst case crosses zero when the expected case
doesn't), say so explicitly — that range *is* the point of a confidence-weighted business case, not
a caveat to bury. Mention the project's type/timeline/currency for context. Every number here must
appear in the CLI's `scenarios` output — quote it exactly, don't round differently than the source.

**Risk commentary** (when the scenario band is wide — e.g. any category or the total swings from
profitable to unprofitable between expected and worst case, or a category's confidence is mostly
`rough`). Name which category or period carries the widest band and why that's expected (e.g. "most
of this project's costs are still `rough` confidence at the planning stage"). Don't manufacture risk
commentary for a project with a tight, all-`committed`/`estimated` band — say the plan is
well-supported instead, if that's what the numbers show.

**Variance commentary** (only when `variance` is not `null`). Name every category with `flag:
"warning"` or `flag: "red"`, state its `projectionToComplete` against its `worstCeiling` (or
`expectedTotal`), and don't editorialize beyond what the numbers say — "consultancy is projected to
exceed its worst-case budget" is supported; "the vendor is overbilling" is not, unless the user told
you that separately.

## Step 4 — hand off the output

Output the drafted markdown directly in your response (not written to a file, unless the user asks
you to save it) — they paste it into the Export tab's "Executive summary" / "Risk / variance
commentary" textareas themselves. Tell them which CLI figures you cited, briefly, so they can
spot-check before it goes in front of a decision maker.
