import { test, expect } from "@playwright/test";

// Ticket 09: Settings — add rate-card roles. No delete control; the new role must show up in the
// Inputs "add salary line" role picker without a reload once saved.
test("adding a rate-card role in Settings validates input and appears in the Inputs role picker", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(
    page.getByText("Rates apply to salary lines added from now on. Existing lines keep the rate they were created with."),
  ).toBeVisible();

  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);

  const nameInput = page.getByPlaceholder("Role name");
  const rateInput = page.getByPlaceholder("Rate/hour");
  const addButton = page.getByRole("button", { name: "Add" });
  const addRoleError = page.locator('p[role="alert"]');

  // Empty name.
  await addButton.click();
  await expect(addRoleError).toHaveText("Role name is required.");

  // Duplicate name (case-insensitive, trimmed).
  await nameInput.fill("  senior developer  ");
  await rateInput.fill("800");
  await addButton.click();
  await expect(addRoleError).toHaveText('A role named "senior developer" already exists.');

  // Negative rate.
  await nameInput.fill("Data Scientist");
  await rateInput.fill("-5");
  await addButton.click();
  await expect(addRoleError).toHaveText("Rate per hour cannot be negative.");

  // Non-numeric rate.
  await rateInput.fill("");
  await addButton.click();
  await expect(addRoleError).toHaveText("Enter a valid rate per hour.");

  // Valid add.
  await rateInput.fill("820");
  await addButton.click();
  await expect(addRoleError).toHaveCount(0);
  await expect(page.getByLabel("Data Scientist")).toHaveValue("820");
  await expect(nameInput).toHaveValue("");
  await expect(rateInput).toHaveValue("");

  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  // Available in the Inputs "add salary line" role picker without reload.
  await page.goto("/");
  await page.getByRole("link", { name: "Intranet Relaunch" }).click();
  await page.getByRole("tab", { name: "Inputs" }).click();
  await page.getByLabel("Category").selectOption("salary");
  await page.getByLabel("Role", { exact: true }).selectOption("Data Scientist");
  await expect(page.getByLabel("Rate/hour")).toHaveValue("820");

  expect(consoleErrors, `unexpected console errors: ${consoleErrors.join("\n")}`).toEqual([]);
});
