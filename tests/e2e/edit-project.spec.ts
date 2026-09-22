import { test, expect } from "@playwright/test";

// Phase D accept criterion (UI-QA-PLAN.md): existing project's status/end period/stakeholders/
// dependencies can be changed and persist; start period and currency are visibly locked.
test("editing a project updates status/end period/stakeholders and persists, start period + currency locked", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  // Boot: empty IndexedDB auto-loads the Example Group demo.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();

  await page.getByRole("link", { name: "Intranet Relaunch" }).click();
  await expect(page).toHaveURL(/\/project\?id=001/);

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/setup\?id=001/);
  await expect(page.getByRole("heading", { name: "Edit Intranet Relaunch" })).toBeVisible();

  const startPeriodInput = page.getByLabel("Start period");
  const currencyInput = page.getByLabel("Currency");
  await expect(startPeriodInput).toBeDisabled();
  await expect(currencyInput).toBeDisabled();

  await page.getByLabel("End period").fill("2026-12");
  await page.getByLabel("Status").selectOption("on_hold");
  await page.getByRole("button", { name: "Add stakeholder" }).click();
  await page.getByLabel(/^Role$/).last().fill("Sponsor");
  await page.getByLabel("Name").last().fill("Jordan Rivers");

  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/project\?id=001/);
  await expect(page.getByText("2026-01–2026-12")).toBeVisible();
  await expect(page.getByText("on_hold")).toBeVisible();

  // Re-open edit to confirm the changes persisted through storage, not just local state.
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByLabel("End period")).toHaveValue("2026-12");
  await expect(page.getByLabel("Status")).toHaveValue("on_hold");
  await expect(page.locator('input[value="Jordan Rivers"]')).toBeVisible();

  expect(consoleErrors, `unexpected console errors: ${consoleErrors.join("\n")}`).toEqual([]);
});
