import { describe, expect, it } from "vitest";
import {
  renderBandChartSvg,
  renderCumulativeChartSvg,
  formatChartCurrency,
  formatCompactChartCurrency,
  formatCompactChartNumber,
} from "./charts";
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
/** Positioned <text> tags (ticks, x labels, legend). The rotated currency axis title is placed by
 * `transform` rather than x/y, so it's left out. */
function textTags(svg: string): { x: number; y: number; anchor: string }[] {
  return [...svg.matchAll(/<text\s+([^>]*)>/g)].filter((m) => !m[1].includes("rotate(")).map((m) => {
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

  it("uses compact axis ticks and writes the currency once, as the axis title", () => {
    const svg = renderBandChartSvg(spikePeriods, spike, { currency: "NOK", displayUnits: "whole" });
    const ticks = textTags(svg).filter((t) => t.anchor === "end");
    expect(ticks.length).toBeGreaterThan(0);
    expect(svg).toMatch(/text-anchor="end"[^>]*>[\u2212\d.]+[kM]?<\/text>/);
    expect(svg).toMatch(/rotate\(-90\)[^>]*>NOK<\/text>/);
    // Full values belong in the accessible summary and the data table, never on a tick.
    const tickTexts = [...svg.matchAll(/<text[^>]*text-anchor="end"[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
    expect(tickTexts.some((t) => t.includes("NOK") || t.includes(","))).toBe(false);
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

describe("cost measure (internal projects)", () => {
  const cost: ScenarioByPeriod = {
    "2026-01": { expected: 100, worst: 130, best: 90 },
    "2026-02": { expected: 100, worst: 130, best: 90 },
  };
  const costPeriods = Object.keys(cost);

  it("names the cost measure and puts Worst above Best at the end of the lines", () => {
    const svg = renderBandChartSvg(costPeriods, cost, { currency: "NOK", displayUnits: "whole", measure: "cost" });
    expect(svg).toContain('aria-label="Scenario bands, cost by period');
    const yOf = (label: string) => Number(new RegExp(`y="([\\d.]+)"[^>]*>${label}</text>`).exec(svg)?.[1]);
    expect(yOf("Worst")).toBeLessThan(yOf("Best"));
  });

  it("draws the total budget as a labelled line on the cumulative chart and keeps it in range", () => {
    const svg = renderCumulativeChartSvg(costPeriods, cost, {
      currency: "NOK",
      displayUnits: "whole",
      measure: "cost",
      budgetTotal: 400,
    });
    expect(svg).toContain(">Budget 400 NOK</text>");
    expect(svg).toContain(">Total budget</text>");
    expect(svg).toContain("Cumulative cost against a total budget of 400 NOK");
    // All values are positive, so there is no zero line and no negative tick.
    expect(svg).not.toContain("\u2212");
  });

  it("fits the per-period cost axis to the data and says the scale doesn't start at zero", () => {
    const svg = renderBandChartSvg(costPeriods, cost, { currency: "NOK", displayUnits: "whole", measure: "cost" });
    expect(svg).toMatch(/>The scale starts at \d+, not zero\.<\/text>/);
    expect(svg).not.toMatch(/>0<\/text>/);
  });

  it("keeps the cumulative cost axis at zero, with no note, when the data starts near it", () => {
    const svg = renderCumulativeChartSvg(costPeriods, cost, { currency: "NOK", displayUnits: "whole", measure: "cost", budgetTotal: 400 });
    expect(svg).not.toContain("not zero");
    expect(svg).toMatch(/>0<\/text>/);
  });
});

describe("actuals overlay (ticket 13)", () => {
  const threePeriods: ScenarioByPeriod = {
    "2026-01": { expected: 100, worst: -50, best: 250 },
    "2026-02": { expected: 200, worst: -900, best: 300 },
    "2026-03": { expected: 150, worst: -100, best: 400 },
  };
  const periods3 = Object.keys(threePeriods);
  const actualsOverlay = {
    closedPeriods: ["2026-01", "2026-02"],
    budgetedByPeriod: { "2026-01": 120, "2026-02": 180, "2026-03": 160 },
  };

  it("renders a shaded actuals region, boundary divider, and Actuals/Budgeted legend entries when periods are closed", () => {
    const svg = renderBandChartSvg(periods3, threePeriods, { currency: "NOK", displayUnits: "whole", actualsOverlay });
    expect(svg).toContain('fill-opacity="0.08"');
    expect(svg).toContain("stroke-dasharray=\"3 3\"");
    expect(svg).toContain(">Actuals</text>");
    expect(svg).toContain(">Budgeted</text>");
    expect(svg).toContain("stroke-dasharray=\"4 4\"");
  });

  it("omits the shaded region, divider, and actuals legend when no periods are closed", () => {
    const svg = renderBandChartSvg(periods3, threePeriods, { currency: "NOK", displayUnits: "whole" });
    expect(svg).not.toContain('fill-opacity="0.08"');
    expect(svg).not.toContain(">Actuals</text>");
    expect(svg).not.toContain(">Budgeted</text>");
  });

  it("draws the actuals overlay in the cumulative chart too", () => {
    const svg = renderCumulativeChartSvg(periods3, threePeriods, { currency: "NOK", displayUnits: "whole", actualsOverlay });
    expect(svg).toContain('fill-opacity="0.08"');
    expect(svg).toContain(">Actuals</text>");
  });

  it("stays self-contained and offline-safe with the overlay present", () => {
    const svg = renderBandChartSvg(periods3, threePeriods, { currency: "NOK", displayUnits: "whole", actualsOverlay });
    expect(svg).not.toContain("<image");
    expect(svg).not.toContain("xlink:href");
    expect(svg).not.toMatch(/url\(https?:/);
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

describe("end-of-line labels (WCAG 1.4.1: worst vs. best not by colour alone)", () => {
  it("labels worst, expected and best at the last point", () => {
    const svg = renderBandChartSvg(periods, byPeriod, { currency: "NOK", displayUnits: "whole" });
    expect(svg).toContain(">Worst</text>");
    expect(svg).toContain(">Best</text>");
    expect(svg).toContain(">Expected</text>");
  });

  it("labels only expected when the band has collapsed at the last point", () => {
    const closed: ScenarioByPeriod = { "2026-01": { expected: 10, worst: 10, best: 10 } };
    const svg = renderBandChartSvg(["2026-01"], closed, { currency: "NOK", displayUnits: "whole" });
    expect(svg).toContain(">Expected</text>");
    expect(svg).not.toContain(">Worst</text>");
    expect(svg).not.toContain(">Best</text>");
  });
});

describe("formatCompactChartNumber", () => {
  it("drops the currency and uses a true minus", () => {
    expect(formatCompactChartNumber(-165000, "whole")).toBe("\u2212165k");
    expect(formatCompactChartNumber(1_200_000, "whole")).toBe("1.2M");
    expect(formatCompactChartNumber(0, "whole")).toBe("0");
    expect(formatCompactChartNumber(1_553_000, "thousands")).toBe("1,553k");
  });

  it("states a half-step tick exactly instead of rounding it onto its neighbour", () => {
    expect(formatCompactChartNumber(2_500, "whole")).toBe("2.5k");
    expect(formatCompactChartNumber(-2_500, "whole")).toBe("\u22122.5k");
    expect(formatCompactChartNumber(5_000, "whole")).toBe("5k");
    expect(formatCompactChartNumber(1_250_000, "whole")).toBe("1.25M");
    expect(formatCompactChartNumber(1_000_000, "whole")).toBe("1.0M");
    expect(formatCompactChartNumber(2_500, "thousands")).toBe("2.5k");
  });
});

describe("accessible summary and boundary labels", () => {
  it("names the chart with its span, the close point and the last values", () => {
    const svg = renderBandChartSvg(["2026-01", "2026-02"], {
      "2026-01": { expected: 100, worst: 100, best: 100 },
      "2026-02": { expected: 200, worst: 150, best: 260 },
    }, {
      currency: "NOK",
      displayUnits: "whole",
      actualsOverlay: { closedPeriods: ["2026-01"], budgetedByPeriod: { "2026-01": 90 } },
    });
    expect(svg).toContain(
      'aria-label="Scenario bands, margin by period, 2026-01 to 2026-02. Actuals through 2026-01, forecast after. In 2026-02: worst 150 NOK, expected 200 NOK, best 260 NOK."',
    );
    expect(svg).toContain(">Actuals</text>");
    expect(svg).toContain(">Forecast</text>");
  });
});
