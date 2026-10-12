import { describe, expect, it } from "vitest";
import { isFuturePeriod, isProjectOverdue, OVERDUE_TOOLTIP } from "./overdue";
import type { ProjectStatus } from "@/engine/model";

describe("isProjectOverdue", () => {
  it("is not overdue on the last day of a monthly period", () => {
    expect(isProjectOverdue("in_progress", "monthly", "2026-08", new Date(2026, 7, 31))).toBe(false);
  });

  it("is overdue the day after a monthly period ends", () => {
    expect(isProjectOverdue("in_progress", "monthly", "2026-08", new Date(2026, 8, 1))).toBe(true);
  });

  it("is not overdue on the last day of a quarterly period", () => {
    expect(isProjectOverdue("in_progress", "quarterly", "2025-Q4", new Date(2025, 11, 31))).toBe(false);
  });

  it("is overdue the day after a quarterly period ends", () => {
    expect(isProjectOverdue("in_progress", "quarterly", "2025-Q4", new Date(2026, 0, 1))).toBe(true);
  });

  it("is not overdue while still within the end period", () => {
    expect(isProjectOverdue("in_progress", "monthly", "2026-08", new Date(2026, 7, 15))).toBe(false);
  });

  it("is not overdue on the last day of a total (yearly) period", () => {
    expect(isProjectOverdue("in_progress", "total", "2026", new Date(2026, 11, 31))).toBe(false);
  });

  it("is overdue the day after a total (yearly) period ends", () => {
    expect(isProjectOverdue("in_progress", "total", "2026", new Date(2027, 0, 1))).toBe(true);
  });

  const nonInProgressStatuses: ProjectStatus[] = [
    "planning",
    "ready_for_approval",
    "approved",
    "completed",
    "on_hold",
  ];

  it.each(nonInProgressStatuses)(
    "is never overdue for status %s, even long past the end period",
    (status) => {
      expect(isProjectOverdue(status, "monthly", "2026-08", new Date(2030, 0, 1))).toBe(false);
    },
  );

  it("exposes a tooltip explaining the marker", () => {
    expect(OVERDUE_TOOLTIP).toBe("Past end period — mark as completed or extend the end period.");
  });
});

describe("isFuturePeriod", () => {
  const today = new Date(2026, 9, 12); // 2026-10-12

  it("treats the current month as started and the next month as future", () => {
    expect(isFuturePeriod("monthly", "2026-10", today)).toBe(false);
    expect(isFuturePeriod("monthly", "2026-11", today)).toBe(true);
    expect(isFuturePeriod("monthly", "2026-09", today)).toBe(false);
  });

  it("treats the quarter containing today as started", () => {
    expect(isFuturePeriod("quarterly", "2026-Q4", today)).toBe(false);
    expect(isFuturePeriod("quarterly", "2027-Q1", today)).toBe(true);
  });

  it("starts a total (yearly) period on January 1", () => {
    expect(isFuturePeriod("total", "2026", today)).toBe(false);
    expect(isFuturePeriod("total", "2027", today)).toBe(true);
  });

  it("a period starts on its first day", () => {
    expect(isFuturePeriod("monthly", "2026-11", new Date(2026, 10, 1))).toBe(false);
  });
});
