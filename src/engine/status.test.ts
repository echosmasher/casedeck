import { describe, expect, it } from "vitest";
import { effectiveStatus, isStatusDerived } from "./status";
import type { ProjectStatus } from "./model";

const base = { periodization: "monthly" as const, startPeriod: "2026-01", endPeriod: "2026-03" };
const with_ = (status: ProjectStatus, closedPeriods: string[]) => ({ ...base, status, closedPeriods });

describe("effectiveStatus", () => {
  it("keeps the entered status until a period closes", () => {
    expect(effectiveStatus(with_("planning", []))).toBe("planning");
    expect(effectiveStatus(with_("approved", []))).toBe("approved");
    expect(isStatusDerived(with_("approved", []))).toBe(false);
  });

  it("reads in progress while periods are open, completed once all are closed", () => {
    expect(effectiveStatus(with_("approved", ["2026-01"]))).toBe("in_progress");
    expect(effectiveStatus(with_("completed", ["2026-01", "2026-02"]))).toBe("in_progress");
    expect(effectiveStatus(with_("in_progress", ["2026-01", "2026-02", "2026-03"]))).toBe("completed");
    expect(isStatusDerived(with_("in_progress", ["2026-01"]))).toBe(true);
  });

  it("leaves on hold alone", () => {
    expect(effectiveStatus(with_("on_hold", ["2026-01", "2026-02", "2026-03"]))).toBe("on_hold");
    expect(isStatusDerived(with_("on_hold", ["2026-01"]))).toBe(false);
  });
});
