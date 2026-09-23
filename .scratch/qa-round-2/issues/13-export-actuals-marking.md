# 13: HTML export — mark actual periods

**What to build:** The exported business-case HTML mirrors the dashboard split: both SVG charts show the shaded closed-period region, boundary divider, "Actuals" legend entry, and dashed budgeted line, driven by the same blended engine output. Headline numbers use blended totals with the "Actuals through <period>, projected after" caption. Still static SVG, no runtime JS, opens from `file://` offline.

**Blocked by:** 01, 11

**Status:** ready-for-agent

- [ ] Both export charts render the actuals treatment; tests assert shaded region and divider present when periods are closed and absent when none are
- [ ] Headline numbers match the dashboard's blended totals for the same project
- [ ] "Actuals through" caption present when periods are closed
- [ ] Export still self-contained and offline-safe
- [ ] Visually verified for demo 001 and 002
