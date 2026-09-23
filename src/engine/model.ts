// Pure type definitions for the CaseDeck engine. No runtime dependencies, no imports from
// react/next/DOM (see CLAUDE.md rule 1). Mirrors config/config.schema.json and
// config/project.schema.json — those schemas are the wire format; these types are what the engine
// and UI compute with.

export type Confidence = "committed" | "estimated" | "rough";

export type PeriodKey = string;

export type Periodization = "monthly" | "quarterly" | "total";

export type ProjectType = "customer" | "internal";

export type ProjectStatus =
  | "planning"
  | "ready_for_approval"
  | "approved"
  | "in_progress"
  | "completed"
  | "on_hold";

export type DisplayUnits = "whole" | "thousands";

export type PeriodValues = Record<PeriodKey, number>;
export type PeriodHours = Record<PeriodKey, number>;
export type ConfidencePerPeriod = Record<PeriodKey, Confidence>;

export type Allocation =
  | { type: "even" }
  | { type: "at_period"; period: PeriodKey }
  | { type: "custom"; values: PeriodValues };

export interface FixedPricingModel {
  type: "fixed";
  amount: number;
  allocation: Allocation;
  confidence: Confidence;
}

export interface HourlyPricingModel {
  type: "hourly";
  ratePerHour: number;
  hoursPerPeriod: PeriodHours;
  confidence: Confidence;
  confidencePerPeriod?: ConfidencePerPeriod;
}

export type PricingModel = FixedPricingModel | HourlyPricingModel | null;

export type DirectCostCategory = "consultancy" | "it_systems" | "travel" | "other_direct";
export type CostCategory = "salary" | DirectCostCategory;

export interface SalaryLineItem {
  id: string;
  category: "salary";
  label: string;
  role: string;
  hoursPerPeriod: PeriodHours;
  ratePerHour: number;
  confidence: Confidence;
  confidencePerPeriod?: ConfidencePerPeriod;
}

export interface DirectLineItem {
  id: string;
  category: DirectCostCategory;
  label: string;
  valuesPerPeriod: PeriodValues;
  confidence: Confidence;
  confidencePerPeriod?: ConfidencePerPeriod;
}

export type CostLineItem = SalaryLineItem | DirectLineItem;

export interface Stakeholder {
  role: string;
  name: string;
  email: string;
  viewer: boolean;
}

export interface Project {
  id: string;
  /** Planner-entered, trimmed, unique (case-insensitive) identifier — entered at creation and
   * locked afterwards. User-facing; `id` remains the internal storage key. */
  code: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  currency: string;
  displayUnits: DisplayUnits;
  periodization: Periodization;
  startPeriod: PeriodKey;
  endPeriod: PeriodKey;
  loadedCostMultiplier: number;
  pricingModel: PricingModel;
  costs: CostLineItem[];
  stakeholders: Stakeholder[];
  dependencies: string[];
}

export interface ConfidenceBand {
  bandPct: number;
}

export interface ConfidenceBands {
  committed: ConfidenceBand;
  estimated: ConfidenceBand;
  rough: ConfidenceBand;
}

export interface RateCardEntry {
  role: string;
  ratePerHour: number;
}

export interface CategoryMappingEntry {
  accountCode: string;
  category: string;
  note?: string;
}

export interface CategoryDef {
  id: string;
  label: string;
}

export interface StatusDef {
  id: ProjectStatus;
  label: string;
}

export interface GroupConfig {
  orgName: string;
  currency: string;
  displayUnitsDefault: DisplayUnits;
  loadedCostMultiplier: number;
  confidenceBands: ConfidenceBands;
  categories: CategoryDef[];
  statuses: StatusDef[];
  rateCard: RateCardEntry[];
  categoryMapping: CategoryMappingEntry[];
}

export type ActualSource = "csv" | "manual";

export interface ActualEntry {
  period: PeriodKey;
  category: string;
  amount: number;
  description: string;
  source: ActualSource;
  sourceFile?: string;
  sourceRow?: number;
  accountCode?: string;
}

/** best/worst/expected for a single value or period. Never NaN — callers must validate first. */
export interface ScenarioValue {
  expected: number;
  best: number;
  worst: number;
}

export type ScenarioByPeriod = Record<PeriodKey, ScenarioValue>;
