# 11: Blended actuals/projected totals in the summary tiles

**What to build:** A new pure, unit-tested engine computation blends actuals and projections: for closed periods it uses actual cost (all cost categories) plus actual revenue (the `revenue` mapped category — not used by any engine code today) with a zero-width band (expected = best = worst); open periods stay projected exactly as today. It also returns the budgeted values for every period (used by tickets 12 and 13) and a list of warnings.

The dashboard's Total cost / Total revenue / Margin tiles show the blended totals, with a caption "Actuals through <period>, projected after" when any period is closed. Warnings (e.g. "2026-03 is closed but has no actuals" — treated as actual zero) are shown above the charts.

Existing budget-vs-actual variance (cost-only) is unchanged.

**Blocked by:** 10

**Status:** ready-for-agent

- [ ] With no closed periods, blended output equals the current scenario output; tested
- [ ] Closed periods collapse the band to the actual value; tested
- [ ] Revenue actuals flow into blended revenue and margin; tested
- [ ] Closed period with no actuals yields zero + a warning; tested
- [ ] Engine purity boundary check still passes
- [ ] Summary tiles use blended totals and show the "actuals through" caption
- [ ] Warnings rendered on the dashboard
