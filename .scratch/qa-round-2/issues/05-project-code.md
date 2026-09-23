# 05: Project code — entered at creation, locked, shown in overview and header

**What to build:** Planners enter a required free-text **project code** when creating a project. It is locked afterwards (read-only in edit mode, same treatment as start period and currency). The overview's `ID` column is replaced by `Code`, and the project header shows the code next to the name.

- Codes are trimmed and must be unique (case-insensitive); a collision error names the conflicting project.
- Existing locally stored projects are migrated with `code = id`; older snapshot files without a code default the same way on import. Snapshot import fails loudly on a code collision.
- Demo projects: 001 Intranet Relaunch → `PRO-2601`, 002 Booking Integration → `PRO-2501`, 003 ERP Data Migration → `PRO-2602` (convention: start year + sequence, documented as illustrative in the demo README).
- Non-empty code is an engine validation invariant; uniqueness is checked at the storage/UI level.

This ticket introduces a storage schema version bump; ticket 10 bumps it again after this lands.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Create form has a required Project code field with inline, specific validation errors (empty, duplicate)
- [ ] Edit mode shows the code read-only
- [ ] Overview shows `Code` instead of `ID`; project header shows the code
- [ ] Storage upgrade backfills `code = id` for existing projects; tested
- [ ] Snapshot round-trip includes `code`; legacy snapshot without `code` parses with the fallback; collision on import errors; tested
- [ ] Project schema file updated
- [ ] Demo projects carry the three codes above
- [ ] e2e smoke test updated
