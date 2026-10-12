import { describe, expect, it } from "vitest";
import { headlineCopy } from "./headlineCopy";
import type { HeadlineSummary } from "@/engine/headline";

const label = (c: string) => ({ consultancy: "Consultancy", travel: "Travel" })[c] ?? c;
const text = (copy: ReturnType<typeof headlineCopy>) =>
  copy.verdict.map((s) => s.text).join("").replaceAll("\u00a0", " ");
const negatives = (copy: ReturnType<typeof headlineCopy>) =>
  copy.verdict.filter((s) => s.negative).map((s) => s.text.replaceAll("\u00a0", " "));

const base: HeadlineSummary = {
  measure: "cost",
  value: { expected: 1552600, best: 1478920, worst: 1626280 },
  budget: 1473600,
  deltaVsBudget: 79000,
  deltaPct: 79000 / 1473600,
  unfavourable: true,
  budgetGapFlag: "warning",
  gapFlagged: true,
  bestCaseOverBudget: false,
  stage: "in_progress",
  status: "red",
  driver: "consultancy",
  costActualToDate: 815800,
  costBudgetedToDate: 736800,
  lastClosedPeriod: "2026-04",
  projectedFrom: "2026-05",
  projectedTo: "2026-08",
  worstCaseBelowZero: false,
};

describe("headlineCopy", () => {
  it("001 internal: cost against budget, the driving category, and the cost range in the source", () => {
    const copy = headlineCopy(base, "NOK", "whole", label);
    expect(copy.reason).toBe("Consultancy is past its worst-case ceiling.");
    expect(text(copy)).toBe("Expected to cost 1.55M NOK, 79k over budget.");
    expect(negatives(copy)).toEqual(["79k over budget"]);
    expect(copy.source).toBe("Actuals through 2026-04, projected 2026-05–2026-08 · range 1,478,920 to 1,626,280 NOK");
  });

  it("003 customer: margin with a range crossing zero, worded as loss and gain", () => {
    const copy = headlineCopy(
      {
        ...base,
        measure: "margin",
        value: { expected: 263250, best: 1336275, worst: -809775 },
        budget: 263250,
        deltaVsBudget: 0,
        deltaPct: 0,
        unfavourable: false,
        gapFlagged: false,
        stage: "not_started",
        status: "ok",
        driver: null,
        lastClosedPeriod: null,
        projectedFrom: "2026-10",
        projectedTo: "2027-03",
        worstCaseBelowZero: true,
      },
      "NOK",
      "whole",
      label,
    );
    expect(copy.reason).toBe("Worst case is a loss.");
    expect(text(copy)).toBe("Expected margin 263k NOK, anywhere from a loss of 810k to a gain of 1.34M.");
    expect(negatives(copy)).toEqual(["a loss of 810k"]);
    expect(copy.source).toBe("No actuals yet; every period is projected");
  });

  it("002 customer, finished: reported in the past tense, and a drift inside the band is not marked", () => {
    const copy = headlineCopy(
      {
        ...base,
        measure: "margin",
        value: { expected: 234000, best: 234000, worst: 234000 },
        budget: 236750,
        deltaVsBudget: -2750,
        unfavourable: true,
        budgetGapFlag: "ok",
        gapFlagged: false,
        stage: "finished",
        status: "ok",
        driver: null,
        lastClosedPeriod: "2025-Q4",
        projectedFrom: null,
        projectedTo: null,
      },
      "NOK",
      "whole",
      label,
    );
    expect(copy.reason).toBe("Every category finished within its range.");
    expect(text(copy)).toBe("Finished with a 234k NOK margin, 3k below budget.");
    expect(negatives(copy)).toEqual([]);
    expect(copy.source).toBe("Actuals for every period, through 2025-Q4");
  });

  it("Watch status names the category; cost under budget is not negative", () => {
    const copy = headlineCopy(
      { ...base, status: "warning", driver: "travel", deltaVsBudget: -12000, unfavourable: false, gapFlagged: false },
      "NOK",
      "whole",
      label,
    );
    expect(copy.reason).toBe("Travel has used over half its contingency.");
    expect(text(copy)).toBe("Expected to cost 1.55M NOK, 12k under budget.");
    expect(negatives(copy)).toEqual([]);
  });

  it("only a delta that rounds to zero reads as on budget; small real differences are still named", () => {
    const onBudget = headlineCopy({ ...base, deltaVsBudget: 0.3, status: "ok", driver: null }, "NOK", "whole", label);
    expect(text(onBudget)).toBe("Expected to cost 1.55M NOK, on budget.");
    expect(onBudget.reason).toBe("Every category is within its range.");
    const small = headlineCopy({ ...base, deltaVsBudget: 300 }, "NOK", "whole", label);
    expect(text(small)).toBe("Expected to cost 1.55M NOK, 300 over budget.");
  });

  it("an expected loss leads with the loss, and an all-negative range stays in loss words", () => {
    const copy = headlineCopy(
      {
        ...base,
        measure: "margin",
        value: { expected: -120000, best: -40000, worst: -210000 },
        status: "ok",
        driver: null,
        worstCaseBelowZero: true,
      },
      "NOK",
      "whole",
      label,
    );
    expect(text(copy)).toBe("Expected loss 120k NOK, anywhere from a loss of 40k to 210k.");
    expect(negatives(copy)).toEqual(["Expected loss 120k NOK", "a loss of 40k to 210k"]);
  });

  it("001 with the best case still over budget says so in the reason", () => {
    const copy = headlineCopy({ ...base, bestCaseOverBudget: true }, "NOK", "whole", label);
    expect(copy.reason).toBe("Consultancy is past its worst-case ceiling.");
    expect(copy.reasonNote).toBe("Even the best case is over budget.");
  });

  it("a finished internal project, and a finished loss", () => {
    const cost = headlineCopy(
      { ...base, value: { expected: 1552600, best: 1552600, worst: 1552600 }, stage: "finished", projectedFrom: null, projectedTo: null },
      "NOK",
      "whole",
      label,
    );
    expect(text(cost)).toBe("Finished at a cost of 1.55M NOK, 79k over budget.");
    const loss = headlineCopy(
      {
        ...base,
        measure: "margin",
        value: { expected: -50000, best: -50000, worst: -50000 },
        budget: 20000,
        deltaVsBudget: -70000,
        stage: "finished",
        status: "ok",
        driver: null,
        worstCaseBelowZero: true,
      },
      "NOK",
      "whole",
      label,
    );
    expect(text(loss)).toBe("Finished with a loss of 50k NOK, 70k below budget.");
    expect(negatives(loss)).toEqual(["Finished with a loss of 50k NOK", "70k below budget"]);
  });

  it("not started without a risk says every category is still at budget", () => {
    const copy = headlineCopy(
      { ...base, status: "ok", driver: null, stage: "not_started", deltaVsBudget: 0, gapFlagged: false },
      "NOK",
      "whole",
      label,
    );
    expect(copy.reason).toBe("Every category is still at its budget.");
  });
});
