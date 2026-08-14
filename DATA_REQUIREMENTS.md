# Data Requirements

> First draft (Phase 1). These formats are defined *by* the demo files in `demo/budgets/` and
> `demo/actuals/` — every example below is a real row from one of those files, not a hypothetical.
> The import pipeline (`src/import/`, Phase 5) is the authoritative implementation; this document
> must stay in sync with it once it exists.

Both budget and actuals CSVs share one parser, one delimiter/decimal auto-detection step, and one
category-mapping step (PLAN.md §6.2). They differ in columns because they answer different
questions: a budget CSV is *planned* figures, long-format, one row per line-item-per-period; an
actuals CSV is *recorded* figures, one row per account-code-per-period.

## Delimiter and decimal conventions

Auto-detected per file, not assumed:
- **Delimiter:** comma (`,`) or semicolon (`;`).
- **Decimal:** point (`.`) or comma (`,`). Nordic Excel exports commonly use semicolon delimiters
  with decimal commas — the two conventions are independent and must be detected independently
  (a file can be comma-delimited with decimal points, or semicolon-delimited with decimal commas;
  the pipeline must not assume they're paired).
- The import preview screen states which convention was detected for the file just uploaded.

Example of each, both valid:
- Comma/point (`demo/actuals/001-actuals-2026-01.csv`): `2026-01,4000,Payroll run — Intranet Relaunch allocation,124200`
- Semicolon/comma (`demo/actuals/002-actuals-full-lifetime.csv`): `2025-Q1;4000;Lønn Q1 — Booking Integration allokering;123000,00`

## Budget CSV format

Columns: `line_type,account_code,line_label,category,period,confidence,hours,rate,amount`

| Column | Type | Notes |
|---|---|---|
| `line_type` | `cost` \| `revenue` | |
| `account_code` | numeric string | maps to a category via the org's `categoryMapping` |
| `line_label` | text | free text, groups rows into one line item across periods |
| `category` | text | `salary`, `consultancy`, `it_systems`, `travel`, `other_direct` (costs) or `revenue` |
| `period` | `YYYY-MM` (monthly) \| `YYYY-Qn` (quarterly) \| `YYYY` (total) | must match the project's `periodization` |
| `confidence` | `committed` \| `estimated` \| `rough` | per-row, so per-period confidence overrides fall out naturally from having one row per period |
| `hours` | number, optional | populated only for `category: salary` (cost) or `line_type: revenue` under an hourly pricing model; blank otherwise |
| `rate` | number, optional | paired with `hours`; blank otherwise |
| `amount` | number | for salary/hourly rows this equals `hours × rate` and is included for spreadsheet-level sanity checking, not because the app needs it — the app derives amount from hours × rate itself |

Example rows (`demo/budgets/001-intranet-relaunch-budget.csv`):
```
cost,4000,Senior Developer — internal team,salary,2026-01,estimated,80,750,60000
cost,4500,External CMS integration vendor,consultancy,2026-01,estimated,,,60000
```

Example revenue row, fixed-price at delivery (`demo/budgets/002-booking-integration-budget.csv`):
```
revenue,3000,Fixed-price delivery — recognized at completion,revenue,2025-Q4,committed,,,900000
```

## Actuals CSV format

Columns: `period,account_code,description,amount`

| Column | Type | Notes |
|---|---|---|
| `period` | `YYYY-MM` \| `YYYY-Qn` \| `YYYY` | must match the project's `periodization` |
| `account_code` | numeric string | resolved to a category via `categoryMapping`; a code absent from the mapping is not guessed at — it's surfaced in the import preview for the user to resolve, and that resolution is persisted for future files |
| `description` | text | free text, carried through for traceability |
| `amount` | number | costs only in v1 — see the scope note in `demo/README.md` |

Actuals carry no `confidence` or `line_type` column — they are recorded fact, not a planned figure,
and cost-only in v1.

Example (`demo/actuals/001-actuals-2026-02.csv`):
```
2026-02,4000,Payroll run — Intranet Relaunch allocation,123700
2026-02,4500,CMS vendor invoice #INV-1014 (scope change — integration rework),86000
```

## Validation failures — file, row, column, expected format (never a silent skip)

Row numbers are 1-indexed over data rows, excluding the header. Reference fixture:
`demo/actuals/broken-example.csv`.

| Row | Problem | Expected error message |
|---|---|---|
| 3 | Semicolon-delimited row inside a comma-delimited file | `broken-example.csv, row 3: expected 4 columns (comma-delimited), got 1 — check for a stray delimiter` |
| 4 | Text value in `amount` | `broken-example.csv, row 4, column "amount": expected a number (comma or point decimals), got "N/A"` |
| 5 | Unknown account code | `broken-example.csv, row 5, column "account_code": expected a known account code (present in category mapping), got "6234"` |

Every message follows one template — `file, row N[, column "C"]: expected X[, got "Y"]` — so a
reader never has to parse two different error grammars. The "resolve unmapped codes in the import
preview" behavior is UI copy on the preview screen itself, not repeated in every row's error string.

A file containing any invalid row imports **nothing** by default. The user may explicitly choose
"import valid rows only"; rejected rows remain listed with the messages above, never dropped
quietly (`CLAUDE.md` rule 4). `src/engine/validate.ts` (Phase 2) is the authoritative implementation
of this table — treat this document as the spec it must satisfy, not the other way around.
