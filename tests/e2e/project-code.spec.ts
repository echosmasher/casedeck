import { test, expect } from "@playwright/test";

// Ticket 05 (QA round 2): the create form's Project code field is required and its code must be
// unique (case-insensitive) — both errors are inline and specific, naming the conflicting project
// for a duplicate.
test("create form rejects a blank project code and a duplicate project code", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  // Boot: empty IndexedDB auto-loads the Example Group demo.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();

  await page.getByRole("button", { name: "New project" }).click();
  await expect(page).toHaveURL(/\/setup$/);

  // A whitespace-only code passes the browser's native `required` check but fails the app's
  // trim-and-require validation — submit and confirm the inline error.
  await page.getByLabel("Project code").fill("   ");
  await page.getByLabel("Project name").fill("A New Project");
  await page.getByLabel("Start period").fill("2027-01");
  await page.getByLabel("End period").fill("2027-06");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByText("Project code is required.")).toBeVisible();

  // A code that collides (case-insensitively) with an existing project is rejected, naming it.
  await page.getByLabel("Project code").fill("pro-2601");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(
    page.getByText('Project code "pro-2601" is already used by "Intranet Relaunch".'),
  ).toBeVisible();

  // A unique code succeeds.
  await page.getByLabel("Project code").fill("PRO-2701");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/project\?id=/);
  await expect(page.getByRole("heading", { name: "A New Project" })).toBeVisible();
  await expect(page.getByText("PRO-2701")).toBeVisible();

  expect(consoleErrors, `unexpected console errors: ${consoleErrors.join("\n")}`).toEqual([]);
});
