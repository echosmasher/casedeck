# 06: Project code in the business-case export

**What to build:** The exported business-case HTML shows the project code next to the project name in its header, and the downloaded filename becomes `<code>-<name-slug>-business-case.html` (code slugified the same way as the name). The whole-database snapshot filename is unchanged.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] Export header shows code + name
- [ ] Filename includes the slugified code first
- [ ] Export tests updated to assert the code appears
- [ ] Snapshot export filename unchanged
