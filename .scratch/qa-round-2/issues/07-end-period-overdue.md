# 07: End period column with overdue marker

**What to build:** The project overview gains an `End` column showing each project's end period. A project with status **In Progress** whose end period has passed is shown in red with a short "Overdue" text marker and a tooltip: "Past end period — mark as completed or extend the end period." Colour is never the only signal.

- Overdue logic is a pure helper that takes `today` as an argument and lives in the UI layer — not in the engine (it depends on the clock).
- Period-end semantics: a monthly period ends on its last day (`2026-08` → 2026-08-31); a quarterly period ends on the quarter's last day (`2025-Q4` → 2025-12-31). Overdue from the following day.
- Demo 001 (In Progress, ends 2026-08) stays overdue deliberately to showcase the feature; note this in the demo README.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `End` column shown for all projects
- [ ] Overdue helper unit-tested with injected dates (monthly, quarterly, last day of period, day after, non-in-progress statuses never overdue)
- [ ] Overdue rows show red text + "Overdue" marker + tooltip
- [ ] Demo 001 shows as overdue; README notes why
- [ ] e2e assertions don't become date-flaky
