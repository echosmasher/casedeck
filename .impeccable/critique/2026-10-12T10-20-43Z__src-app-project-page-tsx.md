---
target: project dashboard
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/home/user/casedeck/src/app/project/page.tsx"
target_fingerprint: "sha256:a187688ac210f966e01407afe5060edbec0223a68002bac95f5d1c88f2fc7cfa"
target_path: /home/user/casedeck/src/app/project/page.tsx
timestamp: 2026-10-12T10-20-43Z
slug: src-app-project-page-tsx
---
# Critique: project dashboard (src/app/project/), re-score after DASHBOARD-CRITIQUE-PLAN phases 1–6
Method: dual-agent (A: design review · B: detector + browser)

## Heuristics: 26/40 (Acceptable) — baseline 21/40
1 Status 3: close preview, "Saved." and undo bar good; manual "Add actual", Inputs autosave and export download give no confirmation
2 Real world 3: verdict copy plain; internal 001 still gets "margin by period" / "Cumulative P&L" charts with revenue copy; raw "estimated"
3 Control 2: actual delete undoable; cost-line delete instant with no undo (InputsEditor.tsx:65–67, 222–230); Export drafts lost on tab switch
4 Consistency 2: "Expected" = projection in headline but budget in variance "Expected total"; compact vs full figures; category order differs; pill vs verdict colour disagree (002, 003; 001 headline Over budget vs Total row Watch)
5 Error prevention 3: contiguous close + preview + zero-cost confirm; future periods can be closed; closed-period budgets still editable
6 Recognition 3: driver named but evidence three modules down; Inputs mixes hours and NOK with no unit
7 Flexibility 2: no shortcuts, no bulk delete, tab not in URL
8 Aesthetic 3: disciplined fold; source line repeats strip range in full digits; two near-duplicate charts
9 Error recovery 3: ExportTab.tsx:58 prints raw field paths; empty "Add line" label is a silent no-op
10 Help 2: "worst-case ceiling", "contingency" undefined in place; no HANDBOOK link

## Specificity
Fold is product-specific (verdict sentence + range strip carry "a range, not one number"); below the tiles it reverts to equal-weight shadcn cards and two near-identical Recharts modules. Detector: CLI 0 findings (31 files); browser overlay 6 views at 1280/390: overused-font on every view (false positive — single Geist family by DESIGN.md), nested-cards on the Inputs add-line form (InputsEditor.tsx:281, false positive as a pattern; real nit: uses rounded-lg instead of the 0.25rem step-down).

## Priority issues
- [P1] Internal projects switch measure below the headline: cost verdict, then margin/P&L charts from 0 to −1.8M. Fix: measure-aware charts (cost by period, cumulative cost vs budget) for internal projects. (/impeccable clarify → layout)
- [P1] Status pill and verdict colour contradict: 002 green On track + rose "3k below budget" (1.2% drift); 003 On track before it starts; 001 headline Over budget vs Total row Watch. Fix: rose only when flagged/out of band; "Not started" state; "Finished with…" for completed; label the Total row as blended. (/impeccable clarify)
- [P1] "Catch drift early" evidence buried: Budget vs. actual is 4th module (4–5 phone screens down); Cost by category duplicates its categories in another order. Fix: variance directly under tiles, reason line links to the row, merge category breakdown as expandable rows, one chart with per-period/cumulative toggle. (/impeccable layout + distill)
- [P1] "Nothing changes silently" broken elsewhere: cost-line delete no undo; Export drafts wiped on tab switch; focus to <body> after Undo; closed-period actual edits move the headline unannounced; manual add has no confirmation. (/impeccable harden)
- [P2] Screen-reader structure: CardTitle is a div (no section headings); Recharts svg role=application tab stop unlabelled; tab panel focus stop invisible; closed-period tooltip shows three identical rows and omits Budgeted. (/impeccable audit → harden)

## Personas
Sam: no section headings, two unnamed application tab stops, invisible tab-panel focus, focus lost after Undo, close preview not announced.
Riley: can close future periods with zero cost (project looks under budget), edit closed-period budgets, empty "Add line" no-op, min=0 blocks credits, 002 legend lists undrawn Worst/Best, latent dark tokens ~1.3:1.
Alex: Actuals order fights the loop (close before import), single 8s undo, no deep-link tab, Inputs shows 4 of 8 periods with no totals, no shortcuts.

## Minor
Title Case "In Progress" vs sentence-case pills; source line full-digit range; compact vs full figures rule; fixed-price card uses toLocaleString and "setup wizard" jargon; Export placeholder references "numbers above" that aren't there; truncated line labels with no tooltip; empty right 40% of fold at 1280.

## Questions
Why doesn't 001's verdict say "over budget even in the best case"? Should Budget vs. actual be the dashboard, with charts behind "View trend"? What does "On track" mean before the first closed period? Should the close preview show the headline sentence before and after?
