import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";

// EXPORT-PREVIEW-PLAN.md step 1: the Export tab shows the file before you download it, and the
// download is that same file. Demo project 001 (Intranet Relaunch) has actuals.

async function openExport(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("link", { name }).click();
  await expect(page).toHaveURL(/\/project\?id=/);
  await page.getByRole("tab", { name: "Export" }).click();
}

test("the preview shows typed commentary and the download is byte-identical to it", async ({ page }) => {
  await openExport(page, "Intranet Relaunch");

  const frame = page.frameLocator('iframe[title^="Preview of"]');
  await expect(frame.getByRole("heading", { name: "Executive summary" })).toBeVisible();
  await expect(frame.getByText("No executive summary provided.")).toBeVisible();

  await page.getByLabel("Executive summary (optional)").fill("Consultancy overran; the rest is on plan.");
  await expect(frame.getByText("Consultancy overran; the rest is on plan.")).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download business case" }).click(),
  ]);
  const downloaded = await readFile((await download.path())!, "utf8");
  const previewed = await page.locator('iframe[title^="Preview of"]').getAttribute("srcdoc");
  expect(downloaded).toBe(previewed);
});

test("a download clicked mid-typing still matches the preview", async ({ page }) => {
  await openExport(page, "Intranet Relaunch");
  const field = page.getByLabel("Executive summary (optional)");
  await field.fill("Draft");
  // Click before the typing pause ends: Download renders now and the preview catches up.
  await field.pressSequentially(" and more");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download business case" }).click(),
  ]);
  const downloaded = await readFile((await download.path())!, "utf8");
  expect(downloaded).toContain("Draft and more");
  await expect(page.locator('iframe[title^="Preview of"]')).toHaveAttribute("srcdoc", downloaded);
});
