---
name: setup
description: Turn a real budget file into CaseDeck config and a project JSON, by interview. Use when a user wants to set up CaseDeck for their own organization, or import a new project from a budget spreadsheet/export. Triggers on "/setup", "set up CaseDeck", "import my budget", "add my project to CaseDeck".
---

# /setup — turn a real budget into CaseDeck config + a project

You are helping a **project manager who budgets, not an accountant** (CaseDeck's target user —
CLAUDE.md). They get rate cards, account codes, and loaded-cost multipliers *from* their
accountant, not the other way around. Write every question and explanation for that audience:
plain language, no jargon left unexplained.

## The one rule that matters most

**You never compute a number that ends up in the output.** All arithmetic — period totals,
hours × rate, which allocation shape a set of revenue rows implies — happens inside
`scripts/budget-cli.ts`, run via `pnpm setup:budget-cli <budget.csv> <meta.json> <outDir>`. Your
job is the interview: turning an ambiguous real-world file and a conversation into the CLI's two
inputs. If you ever catch yourself adding up numbers to sanity-check something instead of trusting
the CLI's output, stop — that's the CLI's job, not yours.

## Step 1 — get the budget file

Ask the user for their budget file (spreadsheet export, CSV, whatever they have). Read it.

The CLI expects a CSV with these columns, in this order:

```
line_type,account_code,line_label,category,role,period,confidence,hours,rate,amount
```

See `DATA_REQUIREMENTS.md`'s "Budget CSV format" section for the full column reference — read it
now if you haven't already this session. Key points:
- `line_type` is `cost` or `revenue`.
- `category` and `role` **may be left blank** — that's expected and normal for a first pass; how
  blanks get resolved is Step 3.
- One row per line-item-per-period (a line item with 6 months of data is 6 rows, same
  `account_code` + `line_label`).
- Delimiter (`,` or `;`) and decimal convention (`.` or `,`) are auto-detected — don't ask the user
  which their file uses.

If the user's file isn't already in this shape, **you** reshape it (using the Read/Write/Edit
tools) — don't ask the user to do CSV surgery themselves. Preserve every number and label from
their source file exactly; you're restructuring layout, not re-deriving values.

## Step 2 — gather the org and project answers

Ask for (skip anything the user already told you, or that's obvious from context):

- **Organization name.**
- **Currency** (3-letter code, e.g. NOK, EUR, USD).
- **Loaded-cost multiplier** — explain this in plain language before asking: *"When you pay someone
  a salary, the actual cost to the company is higher than their pay — it also covers things like
  employer taxes, benefits, and overhead. The loaded-cost multiplier is that ratio (e.g. 1.35 means
  a fully-loaded employee costs 35% more than their base pay). If you don't know this number, ask
  your accountant or finance team — don't guess."* Only proceed with a number the user actually
  gives you.
- **Display units** — whole numbers or thousands.
- **Rate card** — for every distinct `role` value used on a salary row, confirm the hourly rate (the
  CSV's `rate` column already has this per-row; just confirm role names are consistent and collect
  the final `{role, ratePerHour}` list).
- **Project fields**: name, type (`customer` or `internal`), status, `startPeriod`/`endPeriod`
  (must match the CSV's period format — monthly `YYYY-MM`, quarterly `YYYY-Qn`, or `YYYY` for
  total), periodization, stakeholders (role/name/email/viewer-flag — ask who should see this
  project read-only), dependencies (free text).
- **Project id** — a 3-digit string. If this is the org's first project, `001` is fine; otherwise
  ask what id to use (or what other project ids already exist, and pick the next one).
- **Project code** — a free-text code, entered once and locked afterwards. Ask the user what
  convention they use (e.g. start year + sequence); it must be unique (case-insensitive) across
  their projects.

Write all of this into a `meta.json` file (use the Write tool) matching this shape:

```json
{
  "orgName": "...",
  "currency": "NOK",
  "displayUnitsDefault": "whole",
  "loadedCostMultiplier": 1.35,
  "rateCard": [{ "role": "...", "ratePerHour": 0 }],
  "categoryMapping": [],
  "project": {
    "id": "001",
    "code": "...",
    "name": "...",
    "type": "internal",
    "status": "planning",
    "startPeriod": "2026-01",
    "endPeriod": "2026-06",
    "periodization": "monthly",
    "stakeholders": [],
    "dependencies": []
  }
}
```

`categoryMapping` starts empty unless the user already told you some account-code-to-category
answers — Step 3 fills it in.

## Step 3 — run the CLI, handle exactly three outcomes

Run:

```
pnpm setup:budget-cli <budget.csv> <meta.json> <outDir>
```

The exit code tells you which of three things happened. **Never guess at file contents or patch
around a failure yourself** — always one of these three responses:

**Exit 1 — parse or validation error.** The CLI printed the engine's exact error message(s)
(file, row, column, expected format — same grammar as `DATA_REQUIREMENTS.md`). **Show these to the
user verbatim.** Then either fix the budget CSV yourself (if it's a structural issue you introduced
while reshaping the file in Step 1) or ask the user to clarify/correct the source data. Re-run only
after a real fix — don't re-run hoping it passes.

**Exit 2 — unmapped account codes.** The CLI printed every account code it found with no category
yet, grouped, with a sample label and row count for each. For **each one**, ask the user a specific
question: *"Which cost group is account 4510? I see it on rows like 'X' — is that Salary,
Consultancy, IT Systems, Travel, or Other Direct Costs?"* (Revenue-type codes get asked against
Revenue instead.) Add every answer to `meta.json`'s `categoryMapping` array as
`{ "accountCode": "...", "category": "..." }`, then re-run the same command. Repeat until every
code is resolved — don't proceed with any code left unmapped, and don't guess a category yourself
even if it seems obvious from the label.

**Exit 0 — success.** The CLI printed exactly which two files it wrote and where
(`<outDir>/<org>.config.json` and `<outDir>/<id>-<project-name>.json`), plus a one-line summary
(cost line count, pricing model type). **Relay this exact information to the user** — the file
paths, and the summary. Tell them: these files are valid input to CaseDeck's "Import snapshot"
flow (wrap the project JSON in a snapshot, or the app's own JSON export/import round-trips this
shape) — they can now open the app and see their real project.

## What "done" looks like

You've succeeded when the user has two files on disk, you've told them exactly where, and you
haven't typed a single arithmetic result into either the conversation or the files yourself — every
number in the output came from the CLI's stdout or the JSON it wrote.
