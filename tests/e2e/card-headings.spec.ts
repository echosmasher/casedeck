import { test, expect } from "@playwright/test";

// Each card's title is a heading, so a screen reader's headings list reaches every section of a
// tab. Demo project 001 (Intranet Relaunch) has actuals, so every tab has its cards.
test("each tab's cards are reachable by heading", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Intranet Relaunch" }).click();
  await expect(page).toHaveURL(/\/project\?id=/);

  await expect(page.getByRole("heading", { level: 2, name: "Budget vs. actual" })).toHaveCount(1);

  const tabs: [string, string[]][] = [
    ["Inputs", ["Costs"]],
    ["Actuals", ["Import actuals", "Enter an actual manually", "Check and close periods", "Recorded actuals"]],
    ["Export", ["Business case export"]],
  ];
  for (const [tab, headings] of tabs) {
    await page.getByRole("tab", { name: tab }).click();
    for (const name of headings) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }
  }
});
