import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseBudgetFile } from "./budget";
import exampleGroupConfig from "../../demo/example-group.config.json";
import project001 from "../../demo/projects/001-intranet-relaunch.json";
import project002 from "../../demo/projects/002-booking-integration-example-hotel-a.json";
import project003 from "../../demo/projects/003-erp-data-migration.json";
import type { CostLineItem, GroupConfig, Project } from "@/engine/model";

const categoryMapping = (exampleGroupConfig as GroupConfig).categoryMapping;

function readDemoFile(relativePath: string): string {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function withoutId(line: CostLineItem) {
  const rest: Record<string, unknown> = { ...line };
  delete rest.id;
  return rest;
}

describe("parseBudgetFile — reproduces the demo projects exactly from their source CSVs", () => {
  it("001: two salary lines + one consultancy line, no revenue", () => {
    const text = readDemoFile("demo/budgets/001-intranet-relaunch-budget.csv");
    const result = parseBudgetFile("001-intranet-relaunch-budget.csv", text, categoryMapping);

    expect(result.rejected).toEqual([]);
    expect(result.unmapped).toEqual([]);
    expect(result.pricingModel).toBeNull();
    expect(result.costs.map(withoutId)).toEqual(
      (project001 as Project).costs.map(withoutId),
    );
  });

  it("002: salary + consultancy + travel, fixed price at_period revenue", () => {
    const text = readDemoFile("demo/budgets/002-booking-integration-budget.csv");
    const result = parseBudgetFile("002-booking-integration-budget.csv", text, categoryMapping);

    expect(result.rejected).toEqual([]);
    expect(result.unmapped).toEqual([]);
    expect(result.costs.map(withoutId)).toEqual(
      (project002 as Project).costs.map(withoutId),
    );
    expect(result.pricingModel).toEqual((project002 as Project).pricingModel);
  });

  it("003: two salary lines + consultancy, hourly revenue with a confidence override", () => {
    const text = readDemoFile("demo/budgets/003-erp-data-migration-budget.csv");
    const result = parseBudgetFile("003-erp-data-migration-budget.csv", text, categoryMapping);

    expect(result.rejected).toEqual([]);
    expect(result.unmapped).toEqual([]);
    expect(result.costs.map(withoutId)).toEqual(
      (project003 as Project).costs.map(withoutId),
    );
    expect(result.pricingModel).toEqual((project003 as Project).pricingModel);
  });
});

describe("parseBudgetFile — unmapped account codes (the /setup interview trigger)", () => {
  it("a blank category is not a parse error — it's grouped for interview resolution", () => {
    const text = [
      "line_type,account_code,line_label,category,role,period,confidence,hours,rate,amount",
      "cost,9100,Office supplies,,,2026-01,estimated,,,5000",
      "cost,9100,Office supplies,,,2026-02,estimated,,,5000",
    ].join("\n");
    const result = parseBudgetFile("new-org.csv", text, []);

    expect(result.costs).toEqual([]);
    expect(result.rejected).toEqual([]);
    expect(result.unmapped).toEqual([
      { accountCode: "9100", lineType: "cost", sampleLabel: "Office supplies", rowNumbers: [1, 2] },
    ]);
  });

  it("re-parsing with the resolved mapping produces the line item", () => {
    const text = [
      "line_type,account_code,line_label,category,role,period,confidence,hours,rate,amount",
      "cost,9100,Office supplies,,,2026-01,estimated,,,5000",
    ].join("\n");
    const result = parseBudgetFile("new-org.csv", text, [{ accountCode: "9100", category: "other_direct" }]);

    expect(result.unmapped).toEqual([]);
    expect(result.costs).toHaveLength(1);
    expect(result.costs[0]).toMatchObject({ category: "other_direct", label: "Office supplies" });
  });

  it("derives a categoryMapping from resolved rows, ready to write into a new config", () => {
    const text = [
      "line_type,account_code,line_label,category,role,period,confidence,hours,rate,amount",
      "cost,9100,Office supplies,other_direct,,2026-01,estimated,,,5000",
    ].join("\n");
    const result = parseBudgetFile("new-org.csv", text, []);
    expect(result.categoryMapping).toEqual([{ accountCode: "9100", category: "other_direct" }]);
  });
});

describe("parseBudgetFile — structural validation, fail-loud per CLAUDE.md rule 4", () => {
  it("rejects a row with the wrong column count", () => {
    const text = [
      "line_type,account_code,line_label,category,role,period,confidence,hours,rate,amount",
      "cost;9100;Office supplies;other_direct;;2026-01;estimated;;;5000",
    ].join("\n");
    const result = parseBudgetFile("broken.csv", text, []);
    expect(result.rejected).toEqual([
      { rowNumber: 1, message: "broken.csv, row 1: expected 10 columns (comma-delimited), got 1 — check for a stray delimiter" },
    ]);
  });

  it("rejects an invalid confidence value", () => {
    const text = [
      "line_type,account_code,line_label,category,role,period,confidence,hours,rate,amount",
      "cost,9100,Office supplies,other_direct,,2026-01,maybe,,,5000",
    ].join("\n");
    const result = parseBudgetFile("broken.csv", text, []);
    expect(result.rejected[0].message).toContain('column "confidence"');
  });

  it("rejects a non-numeric amount", () => {
    const text = [
      "line_type,account_code,line_label,category,role,period,confidence,hours,rate,amount",
      "cost,9100,Office supplies,other_direct,,2026-01,estimated,,,N/A",
    ].join("\n");
    const result = parseBudgetFile("broken.csv", text, []);
    expect(result.rejected[0].message).toBe(
      'broken.csv, row 1, column "amount": expected a number (comma or point decimals), got "N/A"',
    );
  });

  it("rejects a salary line missing a role", () => {
    const text = [
      "line_type,account_code,line_label,category,role,period,confidence,hours,rate,amount",
      "cost,4000,Some dev,salary,,2026-01,estimated,80,750,60000",
    ].join("\n");
    const result = parseBudgetFile("broken.csv", text, []);
    expect(result.rejected[0].message).toContain("missing a role");
  });
});

describe("parseBudgetFile — revenue allocation inference", () => {
  const header = "line_type,account_code,line_label,category,role,period,confidence,hours,rate,amount";

  it("infers 'even' when every period carries the same amount", () => {
    const text = [
      header,
      "revenue,3000,Retainer,revenue,,2026-01,committed,,,10000",
      "revenue,3000,Retainer,revenue,,2026-02,committed,,,10000",
      "revenue,3000,Retainer,revenue,,2026-03,committed,,,10000",
    ].join("\n");
    const result = parseBudgetFile("even.csv", text, []);
    expect(result.pricingModel).toEqual({
      type: "fixed",
      amount: 30000,
      allocation: { type: "even" },
      confidence: "committed",
    });
  });

  it("infers 'custom' when periods carry differing nonzero amounts", () => {
    const text = [
      header,
      "revenue,3000,Milestones,revenue,,2026-01,committed,,,10000",
      "revenue,3000,Milestones,revenue,,2026-02,committed,,,25000",
    ].join("\n");
    const result = parseBudgetFile("custom.csv", text, []);
    expect(result.pricingModel).toEqual({
      type: "fixed",
      amount: 35000,
      allocation: { type: "custom", values: { "2026-01": 10000, "2026-02": 25000 } },
      confidence: "committed",
    });
  });
});
