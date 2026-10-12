import { describe, expect, it } from "vitest";
import type { Project } from "@/engine/model";
import { fieldLabel } from "./fieldLabel";

const project = { costs: [{ label: "Senior Developer" }] } as unknown as Project;

describe("fieldLabel", () => {
  it("names a cost line by its label, with the period and what the value is", () => {
    expect(fieldLabel("costs[0] (line-1).hoursPerPeriod.2026-05", project)).toBe("Senior Developer, 2026-05 hours");
    expect(fieldLabel("costs[0] (line-1).valuesPerPeriod.2026-Q2", project)).toBe("Senior Developer, 2026-Q2 amount");
    expect(fieldLabel("costs[0] (line-1).ratePerHour", project)).toBe("Senior Developer, hourly rate");
  });

  it("falls back to the line's position when the index is out of range", () => {
    expect(fieldLabel("costs[3] (x).ratePerHour", project)).toBe("Cost line 4, hourly rate");
  });

  it("names project-level fields and keeps an unknown path as it is", () => {
    expect(fieldLabel("closedPeriods[2]", project)).toBe("Closed periods");
    expect(fieldLabel("pricingModel.hoursPerPeriod.2026-05", project)).toBe("Billable hours, 2026-05");
    expect(fieldLabel("pricingModel.amount", project)).toBe("Fixed price");
    expect(fieldLabel("somethingNew", project)).toBe("somethingNew");
  });
});
