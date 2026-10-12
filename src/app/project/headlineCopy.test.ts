import { describe, expect, it } from "vitest";
import { headlineCopy, spreadCopy } from "./headlineCopy";
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
  it("001 internal: cost against budget, the driving category, and where the numbers come from", () => {
    const copy = headlineCopy(base, "NOK", "whole", label);
    expect(copy.reason).toBe("Consultancy is past its worst-case ceiling.");
    expect(text(copy)).toBe("Expected to cost 1.55M NOK, 79k over budget.");
    expect(negatives(copy)).toEqual(["79k over budget"]);
    expect(copy.source).toBe("Actuals through 2026-04, projected 2026-05–2026-08");
  });

  it("ended periods without actuals: named in a note, and the lead stops forecasting once none are left", () => {
    const partly = headlineCopy(base, "NOK", "whole", label, ["2026-05", "2026-06", "2026-07"]);
    expect(text(partly)).toBe("Expected to cost 1.55M NOK, 79k over budget.");
    expect(partly.missing).toBe(
      "2026-05–2026-07 have ended with no actuals recorded, so they still count at budget.",
    );

    const all = headlineCopy(base, "NOK", "whole", label, ["2026-05", "2026-06", "2026-07", "2026-08"]);
    expect(text(all)).toBe("Estimated final cost 1.55M NOK, 79k over budget.");
    expect(all.source).toBe("Actuals through 2026-04");

    const one = headlineCopy(base, "NOK", "whole", label, ["2026-05"]);
    expect(one.missing).toBe("2026-05 has ended with no actuals recorded, so it still counts at budget.");

    expect(headlineCopy(base, "NOK", "whole", label).missing).toBeNull();
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

describe("spreadCopy", () => {
  const bands = { committed: { bandPct: 0 }, estimated: { bandPct: 10 }, rough: { bandPct: 30 } };
  const sentence = (c: ReturnType<typeof spreadCopy>) => (c ? `${c.label}${c.detail}` : null);

  it("001: names the widest cost category, its lines and confidence, and its share", () => {
    const copy = spreadCopy(
      {
        total: 147360,
        sources: [
          { source: "salary", width: 99360, lines: 2, mainConfidence: "estimated", mixedConfidence: false },
          { source: "consultancy", width: 48000, lines: 1, mainConfidence: "estimated", mixedConfidence: false },
        ],
      },
      bands,
      "whole",
      (c) => ({ salary: "Salary", consultancy: "Consultancy" })[c] ?? c,
    );
    expect(sentence(copy)).toBe(
      "Salary is the biggest source of uncertainty: 2 estimated lines (±10%), 99k of the 147k range.",
    );
    expect(copy?.category).toBe("salary");
  });

  it("003: revenue with mixed confidence reads as 'mostly' and has no row to link to", () => {
    const copy = spreadCopy(
      {
        total: 2146050,
        sources: [
          { source: "revenue", width: 1008000, lines: 0, mainConfidence: "rough", mixedConfidence: true },
          { source: "salary", width: 814050, lines: 2, mainConfidence: "rough", mixedConfidence: false },
        ],
      },
      bands,
      "whole",
      label,
    );
    expect(sentence(copy)).toBe(
      "Revenue is the biggest source of uncertainty: mostly rough (±30%), 1.01M of the 2.15M range.",
    );
    expect(copy?.category).toBeNull();
  });

  it("a single source is called the only one; a collapsed range says nothing", () => {
    const one = spreadCopy(
      { total: 48000, sources: [{ source: "consultancy", width: 48000, lines: 1, mainConfidence: "rough", mixedConfidence: false }] },
      bands,
      "whole",
      label,
    );
    expect(sentence(one)).toBe("Consultancy is the only source of uncertainty: 1 rough line (±30%).");
    expect(spreadCopy({ total: 0, sources: [] }, bands, "whole", label)).toBeNull();
  });
});
