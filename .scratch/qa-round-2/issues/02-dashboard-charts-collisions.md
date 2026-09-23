# 02: Dashboard charts — compact axis labels, no collisions

**What to build:** The live dashboard's Scenario bands and Cumulative P&L charts use the same compact y-axis formatter as the export, and no label, legend, or number overlaps another — for all three demo projects in both `whole` and `thousands` display units. Tooltips and the chart data tables keep exact figures.

**Blocked by:** 01 (shared compact formatter)

**Status:** ready-for-agent

- [ ] Y-axis tick labels use the shared compact formatter (no duplicated formatting logic)
- [ ] Browser-verified: demo 001, 002, 003 × `whole`/`thousands` — no overlapping text, no clipped axis labels
- [ ] Long monthly projects don't produce overlapping x-axis labels
- [ ] Tooltip and data table still show exact values
