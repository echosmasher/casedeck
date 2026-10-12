---
target: project dashboard
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:src/app/project/page.tsx"
target_fingerprint: "sha256:643b0ea582717ff5eced52f28cd6de54e34b16043270c1d3346d2d842a11e651"
target_path: src/app/project/page.tsx
timestamp: 2026-10-12T08-27-58Z
slug: src-app-project-page-tsx
---
# Critique: project dashboard (src/app/project/)
Method: dual-agent (A: design review · B: detector + browser)

## Heuristics: 21/40 (Acceptable)
1 Status 2: overdue state missing from dashboard header; silent saves
2 Real world 2: raw `in_progress`/`completed` badge (page.tsx:117); red margin on internal project; actuals amounts left-aligned, no currency
3 Control 1: close-period select commits on change (ActualsTab.tsx:107); delete actual is one click, no undo (ActualsTab.tsx:528)
4 Consistency 2: status casing differs list vs dashboard; numeric alignment differs between tables
5 Error prevention 2: no guard on closing a period that has no actuals; no warning on customer project with 0 revenue
6 Recognition 3: unlabeled actual/forecast divider
7 Flexibility 1: no shortcuts, tab not in URL, no fill-right/bulk delete
8 Aesthetic 3: restrained; redundant equal ranges ("666,000 – 666,000")
9 Error recovery 3: good field-level validation list
10 Help 2: confidence levels / band % unexplained in context

## Specificity
Generic shadcn card stack; product-specific touches = actuals shading + dashed budget, worst/expected/best band, CSV row provenance. "Editorial" half of DESIGN.md absent: no lead verdict.
Detector: CLI 1 advisory (ScenarioTooltip.tsx:40 text-[0.65rem] off ramp). Browser 29 flags: real = status-pill contrast (Watch 3.1, On track 3.6, Over budget 4.3), Inputs sticky headers 4.4:1; false positives = nested-cards x15, edge-flush-cards; overused-font = single-font choice per DESIGN.md.

## Priority issues
- [P0] Close/reopen period and delete actual are instant, unconfirmed, no undo. Fix: pick → preview diff → Apply; warn closing periods with no actuals; undo toast on delete. (/impeccable harden)
- [P1] No verdict; margin framed wrong for internal projects. Fix: headline "projected vs budget, status"; internal projects show cost vs budget; overdue + label-mapped status in header; collapse equal ranges. (/impeccable layout + /impeccable clarify)
- [P1] Mobile broken at 390px: horizontal overflow (439px), header clipped, variance table clipped. Fix: flex-wrap header, overflow-x-auto tables w/ sticky first col, stacked variance rows. (/impeccable adapt)
- [P1] Contrast / colour-only: axis ticks #a1a1aa ~2.6:1, status pills 3.1–4.3:1, worst vs best red/blue only, faint Actuals swatch. Fix: darker tick + status text tokens, direct line labels or dash patterns. (/impeccable audit → /impeccable colorize)
- [P2] Chart precision: wrapped "NOK" tick collides with x labels; divider vs shading gap unlabeled; 10.4px tooltip text. Fix: currency in axis title, "Actuals | Forecast" label at shading edge, 11px min. (/impeccable polish)

## Personas
Alex: no shortcuts, refresh resets tab, no fill-right/bulk delete, truncated line names.
Sam: select fires commit per arrow key; charts lack accessible name (table collapsed); ambiguous delete labels; raw status read aloud; 200% zoom = mobile overflow.
Riley: 0-revenue customer no warning; 36+ periods → unwieldy select/grid; "-1,626,280 NOK – -1,478,920 NOK".

## Minor
Back link vs outlined Edit mismatch; internal id "001" in meta line; close select ignores w-fit; Export placeholder mentions "/business-case skill"; Hide-completed checkbox loud.

## Questions
One number only — which? Should closing a period be a monthly ritual? Why is export two textareas, not a live preview?
