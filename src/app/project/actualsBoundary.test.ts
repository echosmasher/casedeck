import { describe, expect, it } from "vitest";
import { computeActualsBoundary } from "./actualsBoundary";

const periods = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"];

describe("computeActualsBoundary", () => {
  it("no closed periods: nothing is closed, no boundary", () => {
    const boundary = computeActualsBoundary(periods, []);
    expect(boundary.firstClosed).toBeNull();
    expect(boundary.lastClosed).toBeNull();
    expect(boundary.firstOpenAfterClose).toBeNull();
    expect(boundary.closedSet.size).toBe(0);
  });

  it("partially closed: boundary sits at the first open period after the close point", () => {
    const boundary = computeActualsBoundary(periods, ["2026-01", "2026-02", "2026-03"]);
    expect(boundary.firstClosed).toBe("2026-01");
    expect(boundary.lastClosed).toBe("2026-03");
    expect(boundary.firstOpenAfterClose).toBe("2026-04");
    expect(boundary.closedSet.has("2026-02")).toBe(true);
  });

  it("fully closed: no open period follows, so no boundary to draw", () => {
    const boundary = computeActualsBoundary(periods, periods);
    expect(boundary.lastClosed).toBe("2026-05");
    expect(boundary.firstOpenAfterClose).toBeNull();
  });
});
