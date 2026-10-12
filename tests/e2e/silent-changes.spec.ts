import { test, expect, type Page } from "@playwright/test";

// QA-ROUND-3-PLAN.md Phase 3: nothing changes silently. Demo project 001 (Intranet Relaunch) is
// closed through 2026-04; 003 (ERP Data Migration) runs 2026-10..2027-03 with nothing closed.

async function openProject(page: Page, name: string, tab: string) {
  await page.goto("/");
  await page.getByRole("link", { name }).click();
  await expect(page).toHaveURL(/\/project\?id=/);
  await page.getByRole("tab", { name: tab }).click();
}

test("deleting a cost line can be undone, and focus lands on the restored message", async ({ page }) => {
  await openProject(page, "Intranet Relaunch", "Inputs");
  const removeButtons = page.getByRole("button", { name: /^Remove / });
  const before = await removeButtons.count();
  const label = (await removeButtons.first().getAttribute("aria-label"))!.replace(/^Remove /, "");

  await removeButtons.first().click();
  await expect(removeButtons).toHaveCount(before - 1);
  const undo = page.getByRole("button", { name: new RegExp(`^Undo delete of ${label}`) });
  await expect(undo).toBeFocused();

  await undo.click();
  await expect(removeButtons).toHaveCount(before);
  const restored = page.getByRole("status").filter({ hasText: `Restored ${label}` });
  await expect(restored).toBeFocused();

  await page.reload();
  await page.getByRole("tab", { name: "Inputs" }).click();
  await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(before);
});

test("Add line with no label says what's missing instead of doing nothing", async ({ page }) => {
  await openProject(page, "Intranet Relaunch", "Inputs");
  const before = await page.getByRole("button", { name: /^Remove / }).count();
  await page.getByRole("button", { name: "Add line" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Give the line a label first" })).toBeVisible();
  await expect(page.getByLabel("Label", { exact: true })).toBeFocused();

  await page.getByLabel("Label", { exact: true }).fill("Usability testing");
  await page.getByRole("button", { name: "Add line" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Added Usability testing" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(before + 1);
});

test("a manual actual in a closed period is confirmed and says it moves the headline", async ({ page }) => {
  await openProject(page, "Intranet Relaunch", "Actuals");
  await page.getByLabel("Period", { exact: true }).selectOption("2026-03");
  await page.getByLabel(/^Amount/).fill("1200");
  await page.getByLabel("Description").fill("Late travel claim");
  await page.getByRole("button", { name: "Add actual" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "2026-03 is closed, so the dashboard headline changed." }),
  ).toContainText("Added 2026-03");
});

test("Export drafts survive switching tabs", async ({ page }) => {
  await openProject(page, "Intranet Relaunch", "Export");
  await page.getByLabel("Executive summary (optional)").fill("Consultancy overran; the rest is on plan.");
  await page.getByRole("tab", { name: "Dashboard" }).click();
  await page.getByRole("tab", { name: "Export" }).click();
  await expect(page.getByLabel("Executive summary (optional)")).toHaveValue(
    "Consultancy overran; the rest is on plan.",
  );
});

test("periods that haven't started can't be closed", async ({ page }) => {
  // The demo config pins "today" to 2026-05-15 (asOf), so 001's May has started and June hasn't.
  await openProject(page, "Intranet Relaunch", "Actuals");
  const select = page.getByLabel("Close periods through");
  await expect(select.locator("option", { hasText: "2026-05" })).toBeEnabled();
  await expect(select.locator("option", { hasText: "2026-06 (not started)" })).toBeDisabled();
  await expect(page.getByText("Periods that haven't started yet can't be closed.")).toBeVisible();
});
