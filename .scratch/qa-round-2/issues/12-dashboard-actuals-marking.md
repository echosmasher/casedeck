# 12: Dashboard charts — mark actual periods

**What to build:** The Scenario bands and Cumulative P&L charts on the dashboard consume the blended output from ticket 11. Closed periods are rendered with a lightly shaded background, a divider line at the actual/forecast boundary, and an "Actuals" legend entry. A dashed "Budgeted" expected line runs through the closed periods so budget-vs-actual stays visible. The cumulative band starts from the actual running total. Tooltips label each period "Actual" or "Projected"; the chart data tables mark actual periods. No reliance on colour alone (no green x-axis labels).

**Blocked by:** 02, 11

**Status:** ready-for-agent

- [ ] Shaded region + boundary divider + "Actuals" legend entry on both charts
- [ ] Dashed budgeted line across closed periods
- [ ] Cumulative chart band begins at the actual running total
- [ ] Tooltip and data table indicate Actual vs Projected per period
- [ ] Browser-verified on demo 001 (partially closed) and 002 (fully closed); 003 unchanged
- [ ] No new label collisions (per ticket 02's standard)
