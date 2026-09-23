# 01: Export charts — fit axis to ticks, legend row, compact axis labels

**What to build:** In the exported business-case HTML, both "Scenario bands by period" and "Cumulative P&L" render with every y-axis tick label inside the plot area, the legend on its own row above the plot, and x-axis labels clear of any tick label. Y-axis ticks use compact notation (e.g. `1.0M NOK`, `-250k NOK`); the data table keeps exact figures.

Root cause (found during QA review): tick generation rounds outward beyond the data range, but the y-scale is fitted to the unrounded range, so outer ticks land outside the plot — under the legend at the top and under the period labels at the bottom.

The compact formatter is a pure helper that ticket 02 reuses for the dashboard.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Scale domain equals the first/last generated tick; test asserts every tick's y-coordinate lies within the plot area
- [ ] Legend occupies reserved space above the plot; test asserts no overlap between legend band and plot area
- [ ] Bottom margin leaves clear space between the lowest tick and the period labels
- [ ] Compact formatter covers thousands, millions, negatives, zero, and both display units (`whole`, `thousands`), with tests
- [ ] Export still opens from `file://` with networking disabled (no runtime JS added)
- [ ] Visually verified on demo project 002 export (the QA screenshot case)
