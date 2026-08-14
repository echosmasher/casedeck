import { describe, expect, it } from "vitest";
import { renderBusinessCase } from "./businessCase";
import type { ActualEntry, ConfidenceBands, Project } from "@/engine/model";
import project001 from "../../demo/projects/001-intranet-relaunch.json";
import project002 from "../../demo/projects/002-booking-integration-example-hotel-a.json";
import project003 from "../../demo/projects/003-erp-data-migration.json";

const bands: ConfidenceBands = {
  committed: { bandPct: 0 },
  estimated: { bandPct: 10 },
  rough: { bandPct: 30 },
};

const actuals001: ActualEntry[] = [
  { period: "2026-01", category: "salary", amount: 124200, description: "a", source: "csv" },
  { period: "2026-01", category: "consultancy", amount: 60000, description: "b", source: "csv" },
  { period: "2026-02", category: "salary", amount: 123700, description: "c", source: "csv" },
  { period: "2026-02", category: "consultancy", amount: 86000, description: "d", source: "csv" },
  { period: "2026-03", category: "salary", amount: 125300, description: "e", source: "csv" },
  { period: "2026-03", category: "consultancy", amount: 87500, description: "f", source: "csv" },
  { period: "2026-04", category: "salary", amount: 124100, description: "g", source: "csv" },
  { period: "2026-04", category: "consultancy", amount: 85000, description: "h", source: "csv" },
];

const generatedAt = new Date("2026-08-14T12:00:00.000Z");

describe("renderBusinessCase — 003 (the flagship scenario story)", () => {
  const result = renderBusinessCase({
    project: project003 as Project,
    bands,
    actuals: [],
    generatedAt,
  });

  it("succeeds and reports the exact planted numbers", () => {
    if (!result.ok) throw new Error("expected ok result");
    expect(result.html).toContain("263,250 NOK"); // expected margin
    expect(result.html).toContain("-809,775 NOK"); // worst-case margin
    expect(result.html).toContain("1,336,275 NOK"); // best-case margin
  });

  it("states the confidence bands explicitly", () => {
    if (!result.ok) throw new Error("expected ok result");
    expect(result.html).toContain("±10%");
    expect(result.html).toContain("±30%");
    expect(result.html).toContain("±0%");
  });

  it("includes both charts as inline SVG", () => {
    if (!result.ok) throw new Error("expected ok result");
    expect(result.html.match(/<svg /g)?.length).toBe(2);
  });

  it("omits the budget-vs-actual section when there are no actuals", () => {
    if (!result.ok) throw new Error("expected ok result");
    expect(result.html).not.toContain("Budget vs. actual");
  });

  it("is fully self-contained: no external requests of any kind", () => {
    if (!result.ok) throw new Error("expected ok result");
    // The SVG's xmlns="http://www.w3.org/2000/svg" is a required namespace URI, not a network
    // request — check for actual resource-loading constructs instead of a blanket "no http" match.
    expect(result.html).not.toMatch(/<link\s/);
    expect(result.html).not.toMatch(/<script[^>]*\ssrc=/);
    expect(result.html).not.toMatch(/<img[^>]*\ssrc=["']https?:/);
    expect(result.html).not.toMatch(/url\(https?:/);
    expect(result.html).not.toContain("fonts.googleapis.com");
  });

  it("shows a fallback note when no executive summary is provided", () => {
    if (!result.ok) throw new Error("expected ok result");
    expect(result.html).toContain("No executive summary provided");
  });
});

describe("renderBusinessCase — 001 with actuals (the overrun story)", () => {
  it("surfaces the consultancy overrun as Over budget", () => {
    const result = renderBusinessCase({
      project: project001 as Project,
      bands,
      actuals: actuals001,
      generatedAt,
      riskCommentary: "Consultancy is running well over budget.",
    });
    if (!result.ok) throw new Error("expected ok result");
    expect(result.html).toContain("Budget vs. actual");
    expect(result.html).toContain("Over budget");
    expect(result.html).toContain("Consultancy is running well over budget.");
  });
});

describe("renderBusinessCase — 002 (the clean case)", () => {
  it("reports the trough-then-spike total profitably", () => {
    const result = renderBusinessCase({
      project: project002 as Project,
      bands,
      actuals: [],
      generatedAt,
    });
    if (!result.ok) throw new Error("expected ok result");
    expect(result.html).toContain("236,750 NOK");
  });
});

describe("renderBusinessCase — refuses to render an invalid project", () => {
  it("returns validation errors instead of a broken export", () => {
    const invalid: Project = {
      ...(project002 as Project),
      pricingModel: {
        type: "fixed",
        amount: 900000,
        allocation: { type: "custom", values: { "2025-Q4": 500000 } },
        confidence: "committed",
      },
    };
    const result = renderBusinessCase({ project: invalid, bands, actuals: [], generatedAt });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected a failure result");
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: "pricingModel.allocation.values" }),
    );
  });
});

describe("renderBusinessCase — HTML-escapes user-provided text", () => {
  it("escapes a malicious project name rather than injecting it raw", () => {
    const project: Project = { ...(project003 as Project), name: '<script>alert(1)</script> & Co' };
    const result = renderBusinessCase({ project, bands, actuals: [], generatedAt });
    if (!result.ok) throw new Error("expected ok result");
    expect(result.html).not.toContain("<script>alert(1)</script>");
    expect(result.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt; &amp; Co");
  });

  it("escapes executive summary and risk commentary text", () => {
    const result = renderBusinessCase({
      project: project003 as Project,
      bands,
      actuals: [],
      generatedAt,
      executiveSummary: "<img src=x onerror=alert(1)>",
    });
    if (!result.ok) throw new Error("expected ok result");
    expect(result.html).not.toContain("<img src=x onerror=alert(1)>");
    expect(result.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
});
