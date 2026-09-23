# 10: Closing periods — Planner closes periods contiguously on the Actuals tab

**What to build:** A project gains a set of **closed periods** — the periods whose numbers should be treated as actuals rather than projections. On the Actuals tab, the Planner uses "Close periods through: [period]" and can reopen back to an earlier period. Closing is contiguous from the project start (can't close March while February is open). Next to the control, a per-period summary shows whether actual cost and actual revenue exist, so the Planner closes knowingly. Viewers see the closed range read-only.

- Closed periods default to none; existing stored projects and legacy snapshots are migrated/parsed with an empty set.
- Validation: every closed period lies within the project range and the set is contiguous from the start.
- Demo: 001 closed through 2026-04 (the months with actuals CSVs); 002 all four quarters closed (completed, full-lifetime actuals); 003 nothing closed.

This ticket bumps the storage schema version after ticket 05's bump.

**Blocked by:** 05 (sequenced storage schema versions)

**Status:** ready-for-agent

- [ ] Planner can close through a period and reopen; Viewer read-only
- [ ] Per-period actual cost / revenue presence shown next to the control
- [ ] Engine validation rejects out-of-range or non-contiguous closed periods; tested
- [ ] Storage upgrade backfills an empty set; snapshot round-trip + legacy parse tested
- [ ] Project schema file updated
- [ ] Demo projects closed as specified
