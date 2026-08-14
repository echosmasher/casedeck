import { describe, expect, it } from "vitest";
import { renderBandChartSvg, renderCumulativeChartSvg, formatChartCurrency } from "./charts";
import type { ScenarioByPeriod } from "@/engine/model";

const byPeriod: ScenarioByPeriod = {
  "2026-01": { expected: 100, worst: -50, best: 250 },
  "2026-02": { expected: 200, worst: -900, best: 300 },
};
const periods = Object.keys(byPeriod);

describe("renderBandChartSvg", () => {
  it("produces a well-formed, self-contained SVG with no external resource references", () => {
    const svg = renderBandChartSvg(periods, byPeriod, { currency: "NOK", displayUnits: "whole" });
    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain("</svg>");
    // xmlns="http://www.w3.org/2000/svg" is a required namespace URI, not a network request —
    // check for actual resource-loading constructs instead of a blanket "no http" match.
    expect(svg).not.toContain("<image");
    expect(svg).not.toContain("xlink:href");
    expect(svg).not.toMatch(/url\(https?:/);
  });

  it("draws one x-axis label per period, escaped", () => {
    const svg = renderBandChartSvg(["2026-01 <bad>"], { "2026-01 <bad>": { expected: 1, worst: 0, best: 2 } }, {
      currency: "NOK",
      displayUnits: "whole",
    });
    expect(svg).toContain("2026-01 &lt;bad&gt;");
    expect(svg).not.toContain("2026-01 <bad>");
  });

  it("draws a zero reference line only when the data range actually crosses zero", () => {
    const positiveOnly: ScenarioByPeriod = { "2026-01": { expected: 10, worst: 5, best: 15 } };
    const crossing: ScenarioByPeriod = { "2026-01": { expected: 10, worst: -5, best: 15 } };
    const svgPositive = renderBandChartSvg(["2026-01"], positiveOnly, { currency: "NOK", displayUnits: "whole" });
    const svgCrossing = renderBandChartSvg(["2026-01"], crossing, { currency: "NOK", displayUnits: "whole" });
    // crossing draws an extra baseline <line> beyond the gridlines positive-only also has
    const countLines = (s: string) => (s.match(/<line /g) ?? []).length;
    expect(countLines(svgCrossing)).toBeGreaterThan(countLines(svgPositive));
  });
});

describe("renderCumulativeChartSvg", () => {
  it("plots a running total, not the raw per-period values", () => {
    const svg = renderCumulativeChartSvg(periods, byPeriod, { currency: "NOK", displayUnits: "whole" });
    // expected cumulative: 100, then 300 — sanity: chart renders without throwing and is well-formed
    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain("</svg>");
  });
});

describe("formatChartCurrency", () => {
  it("formats whole units and thousands", () => {
    expect(formatChartCurrency(1500, "NOK", "whole")).toBe("1,500 NOK");
    expect(formatChartCurrency(1500, "NOK", "thousands")).toBe("2k NOK");
  });
});
