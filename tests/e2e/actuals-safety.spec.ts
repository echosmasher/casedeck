import { test, expect, type Page } from "@playwright/test";

// DASHBOARD-CRITIQUE-PLAN.md Phase 1 (P0): closing periods is pick → preview → Apply, and deleting
// an actual is undoable. Demo project 001 (Intranet Relaunch) boots closed through 2026-04 with
// cost actuals recorded for 2026-01..04 and nothing for 2026-05 onward.

/** Boot (an empty IndexedDB auto-loads the demo) and open project 001's Actuals tab. Goes through
 * the project link so the demo seed has landed before the project page reads storage. */
async function openActuals(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "Intranet Relaunch" }).click();
  await expect(page).toHaveURL(/\/project\?id=001/);
  await page.getByRole("tab", { name: "Actuals" }).click();
}

function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test("stepping through the close-period select previews but never saves; Apply does", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await openActuals(page);

  const select = page.getByLabel("Close periods through");
  await expect(select).toHaveValue("2026-04");

  // Keyboard arrowing used to save once per keypress, i.e. once per change event. Fire a run of
  // change events directly: ArrowDown on a closed <select> steps the value on Linux (CI) but only
  // opens the picker on macOS, so pressing keys made this test platform-dependent.
  for (const period of ["2026-03", "2026-04", "2026-05"]) await select.selectOption(period);
  await expect(select).toHaveValue("2026-05");
  // The demo's pinned date (2026-05-15) leaves 2026-05 as the last period that can be closed.
  await expect(select.getByRole("option", { name: "2026-06 (not started)" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Unsaved change" })).toBeVisible();
  await expect(page.getByText("2026-05 has no cost actuals.")).toBeVisible();

  await page.reload();
  await page.getByRole("tab", { name: "Actuals" }).click();
  await expect(page.getByLabel("Close periods through")).toHaveValue("2026-04");

  // Closing an empty period needs an explicit confirm before Apply is enabled.
  await page.getByLabel("Close periods through").selectOption("2026-05");
  const apply = page.getByRole("button", { name: "Close through 2026-05" });
  await expect(apply).toBeDisabled();
  await page.getByLabel("Close anyway and count 2026-05 cost as zero").check();
  await apply.click();
  await expect(page.getByRole("status").filter({ hasText: "Actuals through 2026-05" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Unsaved change" })).toHaveCount(0);

  await page.reload();
  await page.getByRole("tab", { name: "Actuals" }).click();
  await expect(page.getByLabel("Close periods through")).toHaveValue("2026-05");

  // Reopening previews too, then Cancel discards the pick.
  await page.getByLabel("Close periods through").selectOption("2026-02");
  await expect(page.getByText("2026-03–2026-05 go back to projections.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByLabel("Close periods through")).toHaveValue("2026-05");

  expect(consoleErrors, `unexpected console errors: ${consoleErrors.join("\n")}`).toEqual([]);
});

test("deleting an actual can be undone, and the restore persists", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await openActuals(page);

  const deleteButtons = page.getByRole("button", { name: /^Delete actual: / });
  const before = await deleteButtons.count();
  expect(before).toBeGreaterThan(0);

  const first = deleteButtons.first();
  const label = (await first.getAttribute("aria-label"))!;
  // Labels are unique per row (period · category · amount · description), not just the period.
  await expect(page.getByRole("button", { name: label, exact: true })).toHaveCount(1);
  const described = label.replace(/^Delete actual: /, "");

  await first.click();
  await expect(deleteButtons).toHaveCount(before - 1);
  const undo = page.getByRole("button", { name: `Undo delete of ${described}` });
  await expect(undo).toBeFocused();
  await undo.click();
  await expect(page.getByRole("status").filter({ hasText: `Restored ${described}.` })).toBeVisible();
  await expect(deleteButtons).toHaveCount(before);

  await page.reload();
  await page.getByRole("tab", { name: "Actuals" }).click();
  await expect(page.getByRole("button", { name: label, exact: true })).toHaveCount(1);

  expect(consoleErrors, `unexpected console errors: ${consoleErrors.join("\n")}`).toEqual([]);
});
