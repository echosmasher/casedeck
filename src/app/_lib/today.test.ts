import { describe, expect, it } from "vitest";
import { parseAsOf } from "./today";

describe("parseAsOf", () => {
  it("reads YYYY-MM-DD as a local calendar date", () => {
    expect(parseAsOf("2026-05-15")).toEqual(new Date(2026, 4, 15));
  });

  it("returns null when absent or malformed, so the clock is used", () => {
    expect(parseAsOf(undefined)).toBeNull();
    expect(parseAsOf("15/05/2026")).toBeNull();
  });
});
