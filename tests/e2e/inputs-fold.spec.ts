import { test, expect } from "@playwright/test";

// EXPORT-PREVIEW-PLAN.md step 3: in the Inputs grid, closed periods fold into one column so the
// open ones are in view. Demo project 001 (Intranet Relaunch) runs 2026-01..08, closed through 04.

test("closed periods fold into one column so every open period fits, and can be shown again", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("link", { name: "Intranet Relaunch" }).click();
  await page.getByRole("tab", { name: "Inputs" }).click();

  const show = page.getByRole("button", { name: "Show closed periods 2026-01 to 2026-04" });
  await expect(show).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByLabel("Senior Developer — internal team hours in 2026-01")).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "320 h" })).toBeVisible();

  // Every open period is in view without scrolling the grid sideways.
  const grid = page.getByRole("table");
  expect(await grid.evaluate((t) => t.scrollWidth - t.parentElement!.clientWidth)).toBe(0);
  await expect(page.getByLabel("Senior Developer — internal team hours in 2026-08")).toBeInViewport({ ratio: 1 });

  // By keyboard: the toggle swaps buttons, and focus moves to the new one rather than being lost.
  await show.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Senior Developer — internal team hours in 2026-01")).toBeVisible();
  const fold = page.getByRole("button", { name: "Fold closed periods into one column" });
  await expect(fold).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Senior Developer — internal team hours in 2026-01")).toHaveCount(0);
  await expect(show).toBeFocused();
});
