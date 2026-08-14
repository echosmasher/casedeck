import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseActualsFile } from "./actuals";
import exampleGroupConfig from "../../demo/example-group.config.json";
import type { GroupConfig } from "@/engine/model";

const categoryMapping = (exampleGroupConfig as GroupConfig).categoryMapping;

function readDemoFile(relativePath: string): string {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

describe("parseActualsFile — broken-example.csv produces the three documented errors verbatim", () => {
  const text = readDemoFile("demo/actuals/broken-example.csv");
  const result = parseActualsFile("broken-example.csv", text, categoryMapping);

  it("accepts the well-formed rows (1, 2, 6)", () => {
    expect(result.accepted).toHaveLength(3);
    expect(result.accepted.map((r) => r.rowNumber)).toEqual([1, 2, 6]);
    expect(result.totalsByCategory.salary).toBe(124200 + 123700);
    expect(result.totalsByCategory.consultancy).toBe(60000);
  });

  it("row 3: wrong delimiter", () => {
    const row3 = result.rejected.find((r) => r.rowNumber === 3);
    expect(row3?.message).toBe(
      "broken-example.csv, row 3: expected 4 columns (comma-delimited), got 1 — check for a stray delimiter",
    );
  });

  it("row 4: text value in amount", () => {
    const row4 = result.rejected.find((r) => r.rowNumber === 4);
    expect(row4?.message).toBe(
      'broken-example.csv, row 4, column "amount": expected a number (comma or point decimals), got "N/A"',
    );
  });

  it("row 5: unknown account code", () => {
    const row5 = result.rejected.find((r) => r.rowNumber === 5);
    expect(row5?.message).toBe(
      'broken-example.csv, row 5, column "account_code": expected a known account code (present in category mapping), got "6234"',
    );
  });

  it("surfaces the unknown code as a single unmapped entry, not per-row noise", () => {
    expect(result.unmapped).toEqual([
      { accountCode: "6234", rowNumbers: [5], sampleDescription: "Unrecognized code" },
    ]);
  });

  it("rejects nothing silently — every non-accepted row is accounted for", () => {
    expect(result.totalDataRows).toBe(6);
    expect(result.accepted.length + result.rejected.length + result.ignored).toBe(
      result.totalDataRows,
    );
  });
});

describe("parseActualsFile — 001's real actuals files", () => {
  it("all four months parse cleanly with no rejections, matching demo/README.md's numbers", () => {
    const months = ["01", "02", "03", "04"];
    const salaryByMonth = [124200, 123700, 125300, 124100];
    const consultancyByMonth = [60000, 86000, 87500, 85000];

    let totalSalary = 0;
    let totalConsultancy = 0;

    months.forEach((month, i) => {
      const text = readDemoFile(`demo/actuals/001-actuals-2026-${month}.csv`);
      const result = parseActualsFile(`001-actuals-2026-${month}.csv`, text, categoryMapping);
      expect(result.rejected).toEqual([]);
      expect(result.unmapped).toEqual([]);
      expect(result.totalsByCategory.salary).toBe(salaryByMonth[i]);
      expect(result.totalsByCategory.consultancy).toBe(consultancyByMonth[i]);
      totalSalary += result.totalsByCategory.salary;
      totalConsultancy += result.totalsByCategory.consultancy;
    });

    expect(totalSalary).toBeCloseTo(497300, 2);
    expect(totalConsultancy).toBeCloseTo(318500, 2);
  });
});

describe("parseActualsFile — 002's Nordic-format file (semicolon delimiter, decimal comma)", () => {
  it("detects the convention and parses correctly", () => {
    const text = readDemoFile("demo/actuals/002-actuals-full-lifetime.csv");
    const result = parseActualsFile("002-actuals-full-lifetime.csv", text, categoryMapping);

    expect(result.convention).toEqual({ delimiter: ";", decimal: "," });
    expect(result.rejected).toEqual([]);
    expect(result.totalsByCategory.salary).toBeCloseTo(123000 + 120000 + 124000 + 59500, 2);
    expect(result.totalsByCategory.travel).toBeCloseTo(8300 + 7600 + 5200 + 1900, 2);
  });
});

describe("parseActualsFile — category mapping resolution", () => {
  it("excludes rows mapped to 'ignore' from both accepted and rejected", () => {
    const text = "period,account_code,description,amount\n2026-01,8990,Bank fee,50\n";
    const result = parseActualsFile("bank-fees.csv", text, categoryMapping);
    expect(result.accepted).toEqual([]);
    expect(result.rejected).toEqual([]);
    expect(result.ignored).toBe(1);
  });

  it("resolving an unmapped code (re-parsing with an updated mapping) accepts the row", () => {
    const text = "period,account_code,description,amount\n2026-01,6234,Mystery cost,15000\n";
    const first = parseActualsFile("mystery.csv", text, categoryMapping);
    expect(first.unmapped).toHaveLength(1);
    expect(first.accepted).toEqual([]);

    const resolvedMapping = [...categoryMapping, { accountCode: "6234", category: "other_direct" }];
    const second = parseActualsFile("mystery.csv", text, resolvedMapping);
    expect(second.unmapped).toEqual([]);
    expect(second.accepted).toHaveLength(1);
    expect(second.accepted[0].category).toBe("other_direct");
  });
});
