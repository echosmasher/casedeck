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

// Hand-transcribed from demo/actuals/002-actuals-full-lifetime.csv — see demo/README.md Story 2.
// No revenue account rows exist in that file (a pre-existing demo-data gap, not a bug — see
// ticket 12's commit message), so blended revenue for 002 is correctly zero throughout.
const actuals002: ActualEntry[] = [
  { period: "2025-Q1", category: "salary", amount: 123000, description: "Lonn Q1", source: "csv" },
  { period: "2025-Q1", category: "consultancy", amount: 61500, description: "Konsulentfaktura Q1", source: "csv" },
  { period: "2025-Q1", category: "travel", amount: 8300, description: "Reisekostnader Q1", source: "csv" },
  { period: "2025-Q2", category: "salary", amount: 120000, description: "Lonn Q2", source: "csv" },
  { period: "2025-Q2", category: "consultancy", amount: 64000, description: "Konsulentfaktura Q2", source: "csv" },
  { period: "2025-Q2", category: "travel", amount: 7600, description: "Reisekostnader Q2", source: "csv" },
  { period: "2025-Q3", category: "salary", amount: 124000, description: "Lonn Q3", source: "csv" },
  { period: "2025-Q3", category: "consultancy", amount: 67000, description: "Konsulentfaktura Q3", source: "csv" },
  { period: "2025-Q3", category: "travel", amount: 5200, description: "Reisekostnader Q3", source: "csv" },
  { period: "2025-Q4", category: "salary", amount: 59500, description: "Lonn Q4", source: "csv" },
  { period: "2025-Q4", category: "consultancy", amount: 24000, description: "Konsulentfaktura Q4", source: "csv" },
  { period: "2025-Q4", category: "travel", amount: 1900, description: "Reisekostnader Q4", source: "csv" },
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

  it("shows the project code next to the name in the header", () => {
    if (!result.ok) throw new Error("expected ok result");
    expect(result.html).toContain(project003.code);
  });
});

describe("renderBusinessCase — 001 with actuals (the overrun story)", () => {
  const result = renderBusinessCase({
    project: project001 as Project,
    bands,
    actuals: actuals001,
    generatedAt,
    riskCommentary: "Consultancy is running well over budget.",
  });

  it("surfaces the consultancy overrun as Over budget", () => {
    if (!result.ok) throw new Error("expected ok result");
    expect(result.html).toContain("Budget vs. actual");
    expect(result.html).toContain("Over budget");
    expect(result.html).toContain("Consultancy is running well over budget.");
  });

  it("shows the Actuals-through caption for the real partial-closure boundary (2026-01–04 closed of 2026-01–08)", () => {
    if (!result.ok) throw new Error("expected ok result");
    expect(result.html).toContain("Actuals through 2026-04, projected after");
  });

  it("marks both charts with the shaded actuals region and a boundary divider, since some periods stay open", () => {
    if (!result.ok) throw new Error("expected ok result");
    expect(result.html.match(/fill-opacity="0.08"/g)?.length).toBe(2);
    // The dashed divider only appears when there's an open period after the close point — 001 has
    // four (2026-05..08), so both charts should draw one.
    expect(result.html.match(/stroke-dasharray="3 3"/g)?.length).toBe(2);
  });
});

describe("renderBusinessCase — 002 (fully closed, blended headline numbers)", () => {
  it("uses blended actual totals, not the pure projection, once every period is closed", () => {
    const result = renderBusinessCase({
      project: project002 as Project,
      bands,
      actuals: actuals002,
      generatedAt,
    });
    if (!result.ok) throw new Error("expected ok result");
    // Sum of actuals002's cost rows; revenue is correctly zero (no revenue rows in the demo
    // actuals file), so blended margin is the negative of that total cost.
    expect(result.html).toContain("-666,000 NOK");
  });

  it("shows the Actuals-through caption once every period is closed", () => {
    const result = renderBusinessCase({
      project: project002 as Project,
      bands,
      actuals: actuals002,
      generatedAt,
    });
    if (!result.ok) throw new Error("expected ok result");
    expect(result.html).toContain("Actuals through 2025-Q4, projected after");
  });

  it("marks both charts' closed-period range with a shaded actuals region", () => {
    const result = renderBusinessCase({
      project: project002 as Project,
      bands,
      actuals: actuals002,
      generatedAt,
    });
    if (!result.ok) throw new Error("expected ok result");
    expect(result.html.match(/fill-opacity="0.08"/g)?.length).toBe(2);
    expect(result.html).toContain(">Actuals</text>");
  });
});

describe("renderBusinessCase — closed periods with no actuals at all (CLAUDE.md rule 4: no silent drops)", () => {
  it("surfaces the engine's closed-but-no-actuals warnings rather than silently zeroing the period", () => {
    const result = renderBusinessCase({
      project: project002 as Project,
      bands,
      actuals: [],
      generatedAt,
    });
    if (!result.ok) throw new Error("expected ok result");
    expect(result.html).toContain("2025-Q1 is closed but has no actuals");
    expect(result.html).toContain("Data warning");
  });
});

describe("renderBusinessCase — 003 (no closed periods, no actuals overlay)", () => {
  it("renders charts without the shaded actuals region or Actuals-through caption", () => {
    const result = renderBusinessCase({
      project: project003 as Project,
      bands,
      actuals: [],
      generatedAt,
    });
    if (!result.ok) throw new Error("expected ok result");
    expect(result.html).not.toContain("fill-opacity=\"0.08\"");
    expect(result.html).not.toContain(">Actuals</text>");
    expect(result.html).not.toContain("Actuals through");
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
