import { test, expect } from "@playwright/test";

// QA-ROUND-3-PLAN.md Phase 4: the variance evidence sits right under the headline, the reason line
// links to the driving category, categories expand to their lines, and one chart toggles views.

test("the headline reason jumps to the driving category, which expands to its lines", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Intranet Relaunch" }).click();

  await page.getByRole("link", { name: "Consultancy is past its worst-case ceiling." }).click();
  const consultancy = page.getByRole("button", { name: /^Consultancy/ }).filter({ visible: true });
  await expect(consultancy).toBeFocused();
  await expect(consultancy).toHaveAttribute("aria-expanded", "false");

  await page.keyboard.press("Enter");
  await expect(consultancy).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("External CMS integration vendor").filter({ visible: true })).toBeVisible();
});

test("one trend chart switches between per-period and cumulative views", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Intranet Relaunch" }).click();

  await expect(page.getByText("Scenario bands — cost by period")).toBeVisible();
  await expect(page.getByText("Cumulative cost against budget")).toHaveCount(0);

  await page.getByRole("button", { name: "Cumulative" }).click();
  await expect(page.getByText("Cumulative cost against budget")).toBeVisible();
  await expect(page.getByText("Scenario bands — cost by period")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cumulative" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Cumulative" })).toBeFocused();
});
