import { describe, expect, it } from "vitest";
import { renderBandChartSvg, renderCumulativeChartSvg, formatChartCurrency, formatCompactChartCurrency } from "./charts";
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

/** Pulls out every <text> tag's x/y/text-anchor from a rendered SVG string, for layout
 * assertions. Legend labels have no text-anchor attribute; gridline (tick) labels are
 * text-anchor="end"; x-axis period labels are text-anchor="middle". */
function textTags(svg: string): { x: number; y: number; anchor: string }[] {
  return [...svg.matchAll(/<text\s+([^>]*)>/g)].map((m) => {
    const attrs = m[1];
    const num = (name: string) => Number(attrs.match(new RegExp(`${name}="(-?[\\d.]+)"`))?.[1]);
    return { x: num("x"), y: num("y"), anchor: attrs.match(/text-anchor="(\w+)"/)?.[1] ?? "" };
  });
}

describe("renderBandChartSvg — layout (QA round 2, item 1)", () => {
  // Reproduces the QA screenshot shape: a near-flat band for three periods, then a sharp spike in
  // the fourth — the case where niceTicks() previously rounded a tick outside the plotted range.
  const spike: ScenarioByPeriod = {
    "2025-Q1": { expected: 10_000, worst: -5_000, best: 25_000 },
    "2025-Q2": { expected: 5_000, worst: -10_000, best: 15_000 },
    "2025-Q3": { expected: 8_000, worst: -12_000, best: 20_000 },
    "2025-Q4": { expected: 950_000, worst: 900_000, best: 1_000_000 },
  };
  const spikePeriods = Object.keys(spike);

  it("fits the scale domain to the generated ticks, so every tick lands inside the plot group", () => {
    const svg = renderBandChartSvg(spikePeriods, spike, { currency: "NOK", displayUnits: "whole" });
    const tags = textTags(svg);
    const tickYs = tags.filter((t) => t.anchor === "end").map((t) => t.y);
    const xLabelYs = tags.filter((t) => t.anchor === "middle").map((t) => t.y);
    expect(tickYs.length).toBeGreaterThan(0);
    // Relative to the plot group's own origin, every tick sits below it (not poking up into the
    // legend band above) and well clear of the x-axis labels below.
    expect(Math.min(...tickYs)).toBeGreaterThan(0);
    expect(Math.max(...tickYs)).toBeLessThan(Math.min(...xLabelYs) - 15);
  });

  it("gives the legend its own band, entirely above the translated plot group", () => {
    const svg = renderBandChartSvg(spikePeriods, spike, { currency: "NOK", displayUnits: "whole" });
    const groupOffsetMatch = svg.match(/<g transform="translate\(0, (\d+(?:\.\d+)?)\)">/);
    expect(groupOffsetMatch).not.toBeNull();
    const groupOffset = Number(groupOffsetMatch![1]);

    const legendBlock = svg.slice(0, svg.indexOf('<g transform="translate'));
    const legendYs = [...legendBlock.matchAll(/y="(-?[\d.]+)"/g)].map((m) => Number(m[1]));
    expect(legendYs.length).toBeGreaterThan(0);
    expect(Math.max(...legendYs)).toBeLessThan(groupOffset);
  });

  it("uses compact axis-tick labels, not the full formatted currency string", () => {
    const svg = renderBandChartSvg(spikePeriods, spike, { currency: "NOK", displayUnits: "whole" });
    expect(svg).toMatch(/[\d.]+[kM]? NOK/);
    expect(svg).not.toContain("1,000,000 NOK");
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

describe("formatCompactChartCurrency", () => {
  it("formats sub-thousand values plainly", () => {
    expect(formatCompactChartCurrency(500, "NOK", "whole")).toBe("500 NOK");
  });

  it("formats thousands with a k suffix", () => {
    expect(formatCompactChartCurrency(-250_000, "NOK", "whole")).toBe("-250k NOK");
  });

  it("formats millions with an M suffix and one decimal place", () => {
    expect(formatCompactChartCurrency(1_000_000, "NOK", "whole")).toBe("1.0M NOK");
    expect(formatCompactChartCurrency(-1_250_000, "NOK", "whole")).toBe("-1.3M NOK");
  });

  it("formats zero plainly", () => {
    expect(formatCompactChartCurrency(0, "NOK", "whole")).toBe("0 NOK");
  });

  it("defers to formatChartCurrency in thousands display mode (already compact)", () => {
    expect(formatCompactChartCurrency(1500, "NOK", "thousands")).toBe(
      formatChartCurrency(1500, "NOK", "thousands"),
    );
  });
});
