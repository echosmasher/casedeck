import { describe, expect, it } from "vitest";
import { formatCompactAmount, formatRange } from "./format";

describe("formatRange", () => {
  it("orders low to high and writes the currency once", () => {
    expect(formatRange(1626280, 1478920, "NOK", "whole")).toBe("1,478,920 to 1,626,280 NOK");
  });

  it("uses a true minus sign for negative values", () => {
    expect(formatRange(-1626280, -1478920, "NOK", "whole")).toBe("−1,626,280 to −1,478,920 NOK");
  });

  it("collapses a zero-width band to one value", () => {
    expect(formatRange(666000, 666000, "NOK", "whole")).toBe("666,000 NOK");
  });

  it("follows thousands display units", () => {
    expect(formatRange(1478920, 1626280, "NOK", "thousands")).toBe("1,479k to 1,626k NOK");
  });
});

describe("formatCompactAmount", () => {
  it("scales to M with two decimals and k with none", () => {
    expect(formatCompactAmount(1552600, "whole")).toBe("1.55M");
    expect(formatCompactAmount(263250, "whole")).toBe("263k");
    expect(formatCompactAmount(-809775, "whole")).toBe("−810k");
    expect(formatCompactAmount(450, "whole")).toBe("450");
  });

  it("rounds across the k/M boundary without printing 1000k", () => {
    expect(formatCompactAmount(999800, "whole")).toBe("1.00M");
    expect(formatCompactAmount(999.7, "whole")).toBe("1k");
  });

  it("keeps the thousands convention", () => {
    expect(formatCompactAmount(1552600, "thousands")).toBe("1,553k");
  });
});
