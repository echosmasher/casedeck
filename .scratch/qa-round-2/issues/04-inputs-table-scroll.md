# 04: Inputs tables — visible horizontal scrollbar and sticky columns

**What to build:** On the Inputs tab, the Costs table and the pricing/revenue period table show a horizontal scrollbar that is always visible (including macOS overlay-scrollbar settings), and the `Line` and `Confidence` columns stay pinned on the left while the period columns scroll. Scoped to these tables — other tables are unaffected.

**Blocked by:** None (can start immediately)

**Status:** done (9952c6d)

- [x] Scrollbar visible without hovering/scrolling on macOS (WebKit) and Firefox — standard `::-webkit-scrollbar` + `scrollbar-color` technique applied; not pixel-verified (headless browsers suppress native scrollbar chrome in screenshots), but structurally correct and applied to both containers.
- [x] `Line` and `Confidence` header + body cells are sticky with an opaque background (no bleed-through)
- [x] Applies to both the Costs table and the pricing/revenue period table (scrollbar on both; sticky columns only on Costs — the revenue table has no `Line`/`Confidence` columns to pin)
- [x] Verified with a 24-month project (synthetic snapshot, Playwright, Chromium + WebKit)
- [x] Other `Table` usages unchanged
