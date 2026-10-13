import { describe, expect, it } from "vitest";
import { costAxisScale } from "./chartScale";

describe("costAxisScale", () => {
  it("raises the floor for a per-period cost band that sits far above zero (001 shape)", () => {
    const { domain, ticks } = costAxisScale(165_000, 212_000);
    expect(domain[0]).toBeGreaterThan(100_000);
    expect(domain[1]).toBeGreaterThanOrEqual(212_000);
    // The data takes most of the plot, not a sliver at the top.
    expect((212_000 - 165_000) / (domain[1] - domain[0])).toBeGreaterThan(0.5);
    expect(ticks).toHaveLength(5);
    expect(ticks[0]).toBe(domain[0]);
  });

  it("keeps zero when the data starts near it (a cumulative cost)", () => {
    expect(costAxisScale(185_000, 1_630_000).domain[0]).toBe(0);
  });

  it("lands every tick on a round value in equal steps", () => {
    const { ticks } = costAxisScale(165_000, 212_000);
    const step = ticks[1] - ticks[0];
    ticks.forEach((t, i) => expect(t).toBe(ticks[0] + step * i));
    ticks.forEach((t) => expect(t % 5_000).toBe(0));
  });

  it("gives a flat series a visible span", () => {
    const { domain } = costAxisScale(50_000, 50_000);
    expect(domain[0]).toBeLessThan(50_000);
    expect(domain[1]).toBeGreaterThan(50_000);
  });

  it("falls back to a unit axis with no cost", () => {
    expect(costAxisScale(0, 0)).toEqual({ domain: [0, 1], ticks: [0, 1] });
  });
});
