import { test, expect } from "@playwright/test";
import path from "node:path";

const repoRoot = path.join(__dirname, "..", "..");

// Phase 8 accept criterion (PLAN.md §9): boot demo -> open 001 -> import an actuals file ->
// export 003. Each browser context starts with empty IndexedDB, so "boot demo" is just the app's
// own first-boot auto-load (src/app/page.tsx) — no fixture seeding needed here.
test("boot demo, open 001, import actuals, export 003", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  // Boot: empty IndexedDB auto-loads the Example Group demo.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  const intranetLink = page.getByRole("link", { name: "Intranet Relaunch" });
  await expect(intranetLink).toBeVisible();
  await expect(page.getByRole("link", { name: "ERP Data Migration" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Booking Integration/ })).toBeVisible();

  // Overview shows the project code, not the raw storage id.
  await expect(page.getByRole("cell", { name: "PRO-2601" })).toBeVisible();

  // Open 001.
  await intranetLink.click();
  await expect(page).toHaveURL(/\/project\?id=001/);
  await expect(page.getByRole("heading", { name: "Intranet Relaunch" })).toBeVisible();
  await expect(page.getByText("PRO-2601")).toBeVisible();

  // Dashboard tab (default) already shows the scenario chart; jump to Actuals to import a file.
  await page.getByRole("tab", { name: "Actuals" }).click();
  await expect(page.getByText("Import actuals")).toBeVisible();

  const fileInput = page.locator('input[type="file"][accept=".csv,text/csv"]');
  await fileInput.setInputFiles(path.join(repoRoot, "demo/actuals/001-actuals-2026-04.csv"));

  await expect(page.getByText(/rows: \d+ accepted/)).toBeVisible();
  const commitButton = page.getByRole("button", { name: /^Commit \d+ rows?$/ });
  await expect(commitButton).toBeEnabled();
  await commitButton.click();

  // Committing clears the preview and the row shows up in "Recorded actuals" below.
  await expect(page.getByText("Import actuals")).toBeVisible();
  await expect(page.getByText("CMS vendor invoice #INV-1042")).toBeVisible();

  // Export 003.
  await page.goto("/");
  await page.getByRole("link", { name: "ERP Data Migration" }).click();
  await expect(page).toHaveURL(/\/project\?id=003/);
  await page.getByRole("tab", { name: "Export" }).click();
  await expect(page.getByText("Business case export")).toBeVisible();

  const downloadButton = page.getByRole("button", { name: "Download business case" });
  await expect(downloadButton).toBeEnabled();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    downloadButton.click(),
  ]);
  expect(download.suggestedFilename()).toBe("pro-2602-erp-data-migration-business-case.html");

  expect(consoleErrors, `unexpected console errors: ${consoleErrors.join("\n")}`).toEqual([]);
});
