# Audit: project dashboard and surrounding routes — 2026-10-12

> DASHBOARD-CRITIQUE-PLAN.md Phase 4 (`/impeccable audit`), run after Phase 3 shipped.
> Method: axe-core 4.13 (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`) on the static build at
> 1280 px — overview, 001/002/003 dashboards, 001 Inputs/Actuals/Export, the close-period preview,
> the undo bar, Settings, new-project Setup, and Viewer role on 001 Actuals — plus a computed-style
> contrast pass over chart SVG text (axe skips SVG). `impeccable detect` on the changed files: no
> findings. Light theme only (the `.dark` block is inert; no toggle exists).

## Audit Health Score

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 2 | Secondary ink fails 4.5:1 on every table header and the tab track; status pills 3.1–4.3:1; chart ticks 2.6:1 |
| 2 | Performance | 3 | Not profiled; static export, no heavy effects observed |
| 3 | Theming | 2 | Status hues used directly as text; no ink tokens for the pill text DESIGN.md already specifies |
| 4 | Responsive | 2 | Wide tables still rely on horizontal scroll with no affordance (Phase 5) |
| 5 | Implementation integrity | 3 | Coherent token system; failures are token choices, not drift |
| **Total** | | **12/20** | **Acceptable** |

**Integrity verdict: pass.** The surfaces share one token set and component family; every
contrast failure traces to a token value, so fixing tokens fixes them everywhere.

## Findings

### P1 — WCAG AA failures

1. **Secondary ink on muted fills** — `--muted-foreground` `#71717a` on `--muted` `#f4f4f5` is
   4.39:1 (table headers on every table: overview, actuals, closed periods, inputs sticky headers,
   variance). Inactive tabs use `text-foreground/60` → `#707072` on `#f4f4f5`, 4.49:1.
2. **Status pill text** — `status-good` `#059669` on `#ecfdf5` 3.57:1; `status-warning` `#d97706`
   on `#fffbeb` ~3.1:1; `status-critical` `#e11d48` on `#fff1f2` 4.27:1. Badge variants use the
   status hue as text, while DESIGN.md specifies 800-shade text (`#065f46` / `#92400e` / `#9f1239`).
   Same hues used as text in the variance table's flagged figures.
3. **Chart tick labels** — `--viz-text-muted` `#a1a1aa` on white, 2.56:1 (ScenarioChart,
   CumulativeChart; mirrored in the export SVG).
4. **Destructive text on its tinted alert fill** — `text-destructive` `#e11d48` on
   `bg-destructive/10`, about 4.1:1 (save-error, validation and import-rejection alerts).
5. **Muted hint inside the primary button** — Export's file-type hint, `#71717a` on `#18181b`,
   3.66:1.
6. **Target size (2.5.8)** — Inputs grid number-cell steppers are 16×14 px (24 per row).
7. **Unlabelled file input** — the Actuals import's visually hidden `<input type="file">` has no
   accessible name (the visible "Choose file" button is a separate control).
8. **Keyboard scrolling** — a horizontally scrolling table container with no focusable content
   (Viewer role, where the fieldset disables controls) cannot be scrolled from the keyboard.

### P1 — colour-only meaning (critique)

9. **Worst vs. best scenario lines** differ only by red vs. blue (ScenarioChart, CumulativeChart,
   export).
10. **"Actuals" legend swatch** is the shading colour at 8% opacity — effectively invisible.

### P2

11. Chart SVGs have no accessible name or summary (Phase 6 owns this).

## Positive findings

- Settings and Setup pass axe cleanly.
- Every form control except the hidden file input has a programmatic label; delete/undo labels
  are unique (Phase 1).
- Status is already paired with words everywhere (pill text, "Over budget by", "Overdue · ended").

## Recommended actions

1. `/impeccable colorize` — fix findings 1–5 at the token level (`globals.css`, `badge.tsx`),
   mirror the chart values in `src/export/charts.ts`, and fix 9–10 with direct line labels and a
   visible actuals swatch.
2. Same pass, small component fixes: 6 (larger hit area), 7 (`aria-label`), 8 (focusable scroll
   region).
3. `/impeccable adapt` (Phase 5) for the table layouts; `/impeccable polish` (Phase 6) for chart
   names.

## After `/impeccable colorize` (same day)

Re-run of the same axe + SVG-text scan on the rebuilt app: **no violations on any surface**, with
one confirmed false positive:

- `scrollable-region-focusable` on the Viewer-role "Recorded actuals" table. The container now gets
  `tabindex="0"` whenever it overflows (`src/components/ui/table.tsx`), and the browser does focus
  it (verified with `element.focus()` → `document.activeElement`), but axe treats every descendant
  of a `<fieldset disabled>` as unfocusable. Keyboard scrolling works.

What changed:

| Finding | Fix |
|---|---|
| 1 Secondary ink | `--muted-foreground` / `--viz-text-secondary` `#71717a` → `#67676f` (5.1:1 on `#f4f4f5`, 5.6:1 on white); inactive tabs use it instead of `foreground/60` |
| 2 Status pills | Badge text uses new `--viz-{good,warning,critical}-ink` (800 shades, ≥6.8:1); variance figures too; dots keep the 600 hues |
| 3 Chart ticks | `--viz-text-secondary`; export SVG mirrors the dashboard palette exactly |
| 4 Destructive text | `--destructive` `#e11d48` → `#be123c` |
| 5 Button hint | `opacity-80` of the button's own ink |
| 6 Target size | Steppers side by side at 24×24; native spinner hidden |
| 7 File input | `aria-label="Actuals CSV file"` |
| 8 Keyboard scroll | Overflowing table containers become focusable |
| 9 Worst vs. best | Direct end-of-line labels (Best / Expected / Worst) on both dashboard charts and in the export |
| 10 Actuals swatch | Outlined swatch at 25% fill |

Revised score: Accessibility 3 (chart accessible names remain, Phase 6), Theming 3 → **14/20 Good**.
