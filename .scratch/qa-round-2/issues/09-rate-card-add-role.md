# 09: Settings — add rate-card roles, correct the rate copy

**What to build:** On Settings, the Planner can add a new rate-card role (e.g. "Data Scientist") with a rate per hour. The new role appears immediately in the role picker when adding a salary line on the Inputs tab. There is no delete. The existing override mechanism already appends unknown roles, so no storage schema change is expected.

The Settings copy currently claims rate changes "apply immediately to every project", which is wrong: salary lines snapshot the rate when added (intended behaviour). Replace with wording such as: "Rates apply to salary lines added from now on. Existing lines keep the rate they were created with."

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Add-role row with name + rate; inline specific errors for empty name, duplicate name (case-insensitive, trimmed), negative/non-numeric rate
- [ ] Added role persists and survives a snapshot round-trip; tested
- [ ] Added role available in the Inputs "add salary line" picker without reload
- [ ] No delete control
- [ ] Settings description copy corrected
