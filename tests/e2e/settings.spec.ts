import { test, expect } from "@playwright/test";

// Phase C accept criterion (UI-QA-PLAN.md): editing a rate in Settings changes computed costs
// across existing projects without a page-specific migration step, live, no reload required.
test("editing the rate card in Settings updates the default rate shown in a project's Inputs tab", async ({
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

  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings/);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  const rateInput = page.getByLabel("Senior Developer");
  await expect(rateInput).toHaveValue("750");
  await rateInput.fill("900");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  // Open a project and add a salary line — the role dropdown's default rate should reflect the
  // new override immediately, no reload.
  await page.goto("/");
  await page.getByRole("link", { name: "Intranet Relaunch" }).click();
  await expect(page).toHaveURL(/\/project\?id=001/);
  await page.getByRole("tab", { name: "Inputs" }).click();

  await page.getByLabel("Category").selectOption("salary");
  await page.getByLabel("Role", { exact: true }).selectOption("Senior Developer");
  await expect(page.getByLabel("Rate/hour")).toHaveValue("900");

  expect(consoleErrors, `unexpected console errors: ${consoleErrors.join("\n")}`).toEqual([]);
});
