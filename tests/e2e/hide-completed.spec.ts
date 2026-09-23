import { test, expect } from "@playwright/test";

// Ticket 08: "Hide completed" toggle on the project overview. Demo project 002 (Booking
// Integration) is the only demo project with status Completed (demo/README.md).
test("hide completed toggle filters completed projects and persists across reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();

  const toggle = page.getByRole("checkbox", { name: "Hide completed" });
  await expect(toggle).not.toBeChecked();
  const bookingLink = page.getByRole("link", { name: /Booking Integration/ });
  await expect(bookingLink).toBeVisible();

  await toggle.check();
  await expect(bookingLink).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Intranet Relaunch" })).toBeVisible();

  // Persists across reload as a local UI preference.
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Hide completed" })).toBeChecked();
  await expect(page.getByRole("link", { name: /Booking Integration/ })).not.toBeVisible();

  await page.getByRole("checkbox", { name: "Hide completed" }).uncheck();
  await expect(page.getByRole("link", { name: /Booking Integration/ })).toBeVisible();

  // Viewer role: composes with the existing Viewer visibility filter (demo project 002 isn't
  // Viewer-visible at all, regardless of status — demo/README.md), and the toggle keeps working.
  await page.getByRole("group", { name: "Demo role" }).getByRole("button", { name: "Viewer" }).click();
  await expect(page.getByRole("link", { name: "Intranet Relaunch" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Booking Integration/ })).not.toBeVisible();

  await page.getByRole("checkbox", { name: "Hide completed" }).check();
  await expect(page.getByRole("link", { name: "Intranet Relaunch" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Booking Integration/ })).not.toBeVisible();
});
