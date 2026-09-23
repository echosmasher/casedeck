import { describe, expect, it } from "vitest";
import { formatImportRowError, validateProjectInvariants } from "./validate";
import type { Project } from "./model";
import project001 from "../../demo/projects/001-intranet-relaunch.json";
import project002 from "../../demo/projects/002-booking-integration-example-hotel-a.json";
import project003 from "../../demo/projects/003-erp-data-migration.json";

describe("formatImportRowError — matches DATA_REQUIREMENTS.md verbatim", () => {
  it("wrong delimiter (no column — the whole row is malformed)", () => {
    const message = formatImportRowError({
      file: "broken-example.csv",
      row: 3,
      expected: "4 columns (comma-delimited), got 1 — check for a stray delimiter",
    });
    expect(message).toBe(
      'broken-example.csv, row 3: expected 4 columns (comma-delimited), got 1 — check for a stray delimiter',
    );
  });

  it("omits the got clause when no offending value is given", () => {
    const message = formatImportRowError({
      file: "broken-example.csv",
      row: 3,
      column: "period",
      expected: "a value",
    });
    expect(message).toBe('broken-example.csv, row 3, column "period": expected a value');
  });

  it("text value in a numeric column", () => {
    const message = formatImportRowError({
      file: "broken-example.csv",
      row: 4,
      column: "amount",
      expected: "a number (comma or point decimals)",
      got: "N/A",
    });
    expect(message).toBe(
      'broken-example.csv, row 4, column "amount": expected a number (comma or point decimals), got "N/A"',
    );
  });

  it("unknown account code", () => {
    const message = formatImportRowError({
      file: "broken-example.csv",
      row: 5,
      column: "account_code",
      expected: "a known account code (present in category mapping)",
      got: "6234",
    });
    expect(message).toBe(
      'broken-example.csv, row 5, column "account_code": expected a known account code (present in category mapping), got "6234"',
    );
  });
});

describe("validateProjectInvariants — demo fixtures are all valid", () => {
  it.each([
    ["001", project001],
    ["002", project002],
    ["003", project003],
  ])("%s has zero validation errors", (_id, project) => {
    expect(validateProjectInvariants(project as Project)).toEqual([]);
  });
});

describe("validateProjectInvariants — catches invalid model states", () => {
  const base = project002 as Project;

  it("accepts a custom allocation that does sum to the fixed amount", () => {
    const project: Project = {
      ...base,
      pricingModel: {
        type: "fixed",
        amount: 900000,
        allocation: { type: "custom", values: { "2025-Q4": 900000 } },
        confidence: "committed",
      },
    };
    const errors = validateProjectInvariants(project);
    expect(errors.some((e) => e.field === "pricingModel.allocation.values")).toBe(false);
  });

  it("flags a custom allocation that doesn't sum to the fixed amount", () => {
    const project: Project = {
      ...base,
      pricingModel: {
        type: "fixed",
        amount: 900000,
        allocation: { type: "custom", values: { "2025-Q4": 500000 } },
        confidence: "committed",
      },
    };
    const errors = validateProjectInvariants(project);
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "pricingModel.allocation.values" }),
    );
  });

  it("flags an at_period allocation pointing outside the project lifetime", () => {
    const project: Project = {
      ...base,
      pricingModel: {
        type: "fixed",
        amount: 900000,
        allocation: { type: "at_period", period: "2026-Q1" },
        confidence: "committed",
      },
    };
    const errors = validateProjectInvariants(project);
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "pricingModel.allocation.period" }),
    );
  });

  it("flags negative hours on a salary line", () => {
    const project: Project = {
      ...base,
      costs: [
        {
          ...base.costs[0],
          hoursPerPeriod: { ...(base.costs[0] as { hoursPerPeriod: Record<string, number> }).hoursPerPeriod, "2025-Q1": -10 },
        } as Project["costs"][number],
        ...base.costs.slice(1),
      ],
    };
    const errors = validateProjectInvariants(project);
    expect(errors.some((e) => e.field.includes("hoursPerPeriod"))).toBe(true);
  });

  it("flags a non-positive loadedCostMultiplier", () => {
    const project: Project = { ...base, loadedCostMultiplier: 0 };
    const errors = validateProjectInvariants(project);
    expect(errors).toContainEqual(expect.objectContaining({ field: "loadedCostMultiplier" }));
  });

  it("flags a blank project code", () => {
    const errors = validateProjectInvariants({ ...base, code: "" });
    expect(errors).toContainEqual(expect.objectContaining({ field: "code" }));
  });

  it("flags a project code that is only whitespace", () => {
    const errors = validateProjectInvariants({ ...base, code: "   " });
    expect(errors).toContainEqual(expect.objectContaining({ field: "code" }));
  });

  it("accepts a non-blank project code", () => {
    const errors = validateProjectInvariants({ ...base, code: "PRO-2601" });
    expect(errors.some((e) => e.field === "code")).toBe(false);
  });

  it("flags a negative ratePerHour on a salary line", () => {
    const project: Project = {
      ...(project001 as Project),
      costs: [
        { ...(project001 as Project).costs[0], ratePerHour: -750 } as Project["costs"][number],
        ...(project001 as Project).costs.slice(1),
      ],
    };
    const errors = validateProjectInvariants(project);
    expect(errors).toContainEqual(expect.objectContaining({ field: "costs[0] (salary-senior-dev).ratePerHour" }));
  });

  it("flags a negative value on a direct (non-salary) cost line", () => {
    const consultancy = (project001 as Project).costs[2] as Extract<
      Project["costs"][number],
      { valuesPerPeriod: Record<string, number> }
    >;
    const project: Project = {
      ...(project001 as Project),
      costs: [
        ...(project001 as Project).costs.slice(0, 2),
        { ...consultancy, valuesPerPeriod: { ...consultancy.valuesPerPeriod, "2026-01": -1000 } } as Project["costs"][number],
      ],
    };
    const errors = validateProjectInvariants(project);
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "costs[2] (consultancy-vendor).valuesPerPeriod.2026-01" }),
    );
  });

  it("flags a negative fixed-price amount", () => {
    const project: Project = {
      ...base,
      pricingModel: { type: "fixed", amount: -1, allocation: { type: "even" }, confidence: "committed" },
    };
    const errors = validateProjectInvariants(project);
    expect(errors).toContainEqual(expect.objectContaining({ field: "pricingModel.amount" }));
  });

  it("accepts closed periods that are a contiguous prefix from the start", () => {
    const project: Project = { ...(project001 as Project), closedPeriods: ["2026-01", "2026-02"] };
    const errors = validateProjectInvariants(project);
    expect(errors.some((e) => e.field.startsWith("closedPeriods"))).toBe(false);
  });

  it("flags a closed period outside the project lifetime", () => {
    const project: Project = { ...(project001 as Project), closedPeriods: ["2025-12"] };
    const errors = validateProjectInvariants(project);
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "closedPeriods[0]", message: expect.stringContaining("outside the project lifetime") }),
    );
  });

  it("flags closed periods that skip the start of the project", () => {
    const project: Project = { ...(project001 as Project), closedPeriods: ["2026-02", "2026-03"] };
    const errors = validateProjectInvariants(project);
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "closedPeriods", message: expect.stringContaining("contiguous") }),
    );
  });

  it("flags closed periods with a gap in the middle", () => {
    const project: Project = { ...(project001 as Project), closedPeriods: ["2026-01", "2026-03"] };
    const errors = validateProjectInvariants(project);
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "closedPeriods", message: expect.stringContaining("contiguous") }),
    );
  });

  it("accepts closed periods stored out of order, as long as they form a contiguous prefix", () => {
    const project: Project = { ...(project001 as Project), closedPeriods: ["2026-02", "2026-01"] };
    const errors = validateProjectInvariants(project);
    expect(errors.some((e) => e.field.startsWith("closedPeriods"))).toBe(false);
  });

  it("flags duplicate entries in closedPeriods", () => {
    const project: Project = { ...(project001 as Project), closedPeriods: ["2026-01", "2026-01"] };
    const errors = validateProjectInvariants(project);
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "closedPeriods", message: expect.stringContaining("duplicate") }),
    );
  });

  it("accepts an empty closedPeriods set", () => {
    const project: Project = { ...(project001 as Project), closedPeriods: [] };
    const errors = validateProjectInvariants(project);
    expect(errors.some((e) => e.field.startsWith("closedPeriods"))).toBe(false);
  });

  it("flags a negative hourly ratePerHour and negative hoursPerPeriod", () => {
    const project: Project = {
      ...(project003 as Project),
      pricingModel: {
        type: "hourly",
        ratePerHour: -900,
        hoursPerPeriod: { "2026-10": -400 },
        confidence: "rough",
      },
    };
    const errors = validateProjectInvariants(project);
    expect(errors).toContainEqual(expect.objectContaining({ field: "pricingModel.ratePerHour" }));
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "pricingModel.hoursPerPeriod.2026-10" }),
    );
  });
});
