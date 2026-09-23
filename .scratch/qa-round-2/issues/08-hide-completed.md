# 08: "Hide completed" toggle in the project overview

**What to build:** A "Hide completed" toggle above the project list, default off. When on, projects with status Completed are hidden. The choice persists across reloads as a local UI preference (not project data — not in snapshots). Works for both Planner and Viewer, composing with the existing Viewer visibility filter.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Toggle default off; hides Completed projects when on
- [ ] Preference survives reload
- [ ] Works in both roles alongside the Viewer filter
- [ ] When every visible project is hidden, the empty state explains why and how to show them
