---
name: Precision Editorial Finance
colors:
  surface: '#fbf8ff'
  surface-dim: '#dad9e3'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f2fd'
  surface-container: '#eeedf7'
  surface-container-high: '#e8e7f1'
  surface-container-highest: '#e3e1ec'
  on-surface: '#1a1b22'
  on-surface-variant: '#47464b'
  inverse-surface: '#2f3038'
  inverse-on-surface: '#f1effa'
  outline: '#77767b'
  outline-variant: '#c8c5cb'
  surface-tint: '#5f5e61'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1e'
  on-primary-container: '#858387'
  inverse-primary: '#c8c5ca'
  secondary: '#5d5e66'
  on-secondary: '#ffffff'
  secondary-container: '#e3e1ec'
  on-secondary-container: '#63646c'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002114'
  on-tertiary-container: '#069669'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e4e1e6'
  primary-fixed-dim: '#c8c5ca'
  on-primary-fixed: '#1b1b1e'
  on-primary-fixed-variant: '#47464a'
  secondary-fixed: '#e3e1ec'
  secondary-fixed-dim: '#c6c5cf'
  on-secondary-fixed: '#1a1b22'
  on-secondary-fixed-variant: '#46464e'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#fbf8ff'
  on-background: '#1a1b22'
  surface-variant: '#e3e1ec'
typography:
  display-xl:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.025em
  display-xl-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.015em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.01em
  body-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  metric-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  metric-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.01em
  label-caps:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.005em
  caption:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system embodies high-conviction financial engineering, architectural restraint, and analytical clarity. Tailored for corporate FP&A leads, CFOs, and strategic operators executing scenario modeling and variance analysis, the visual tone eliminates decorative noise in favor of data legibility, low visual fatigue, and spatial discipline.

### Aesthetic Principles
- **Monochromatic Control:** Rely strictly on an austere slate-zinc grayscale foundation. Chromatic accents are reserved strictly for deterministic status communication (variance delta, run-rate alerts, confidence thresholds).
- **Architectural Flatness:** Depth is articulated through 1px boundaries, subtle canvas stratification, and hairline rules rather than heavy elevation shadows or simulated dimensionality.
- **Instrument Precision:** Every data point, threshold bar, and tabular cell adheres to strict horizontal and vertical metrics, conveying the authority of professional modeling software.

## Colors

The palette operates under a high-contrast monochromatic core with razor-thin line work and contextual semantic indicators.

### Palette Architecture
- **Primary Canvas (`#FFFFFF`):** High-efficiency, uncompromised pure white surface ensuring maximum contrast against fine hairlines and micro-typography.
- **Sub-Canvas / Shading (`#F4F4F5`, `#FAFAFA`):** Used strictly for table header bars, segmented control tracks, and structural navigation columns.
- **Structural Borders (`#E4E4E7`):** Systematic 1px division line applied to card perimeters, column boundaries, row dividers, and input strokes.
- **Primary Ink (`#18181B`):** Deep zinc-black utilized for active states, key data aggregates, and high-emphasis action triggers.
- **Secondary Ink (`#71717A`):** Neutral slate for auxiliary metrics, column labels, breadcrumbs, and non-active tool states.
- **Muted Ink (`#A1A1AA`):** Used for placeholder text, disabled actions, and table gridlines.

### Deterministic Status Colors
- **On-Track / Favorable:** `#059669` (Emerald 600) ink with `#ECFDF5` (Emerald 50) soft fill and `#A7F3D0` (Emerald 200) boundary.
- **Watch / Caution:** `#D97706` (Amber 600) ink with `#FFFBEB` (Amber 50) soft fill and `#FDE68A` (Amber 200) boundary.
- **Over-Budget / Unfavorable:** `#E11D48` (Rose 600) ink with `#FFF1F2` (Rose 50) soft fill and `#FECDD3` (Rose 200) boundary.

## Typography

The typographic hierarchy relies on **Geist**, an ultra-refined neutral geometric sans-serif engineered for precision instruments. 

### Implementation Rules
- **Tabular Figures (`tnum`):** All financial values, roll-up sums, variance deltas, percentages, and dates must enforce OpenType tabular figures (`font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1, "cv01" 1;`). This prevents horizontal jittering during live re-calculation and keeps vertical decimal alignments locked.
- **Label Capitalization:** Analytical headers and section dividers employ `label-caps` in uppercase format to clearly bifurcate schema tags from dynamic records.
- **Optical Kerning & Balance:** Display scales utilize micro-negative tracking (`-0.02em` to `-0.025em`) to produce tight, cohesive summary cards without reducing legibility.

## Layout & Spacing

The layout is governed by an asymmetric multi-pane desktop canvas optimized for dense financial dashboards and multi-scenario matrices.

### Layout Model
- **Structural Panes:** A fixed 240px utility sidebar, followed by a fluid main execution stage containing modular financial metric rows and horizontal split comparison grids.
- **Grid Architecture:** 12-column adaptive layout on desktop with a minimum content constraint of 1180px before initiating horizontal table virtualization.
- **Density Tiers:** Core dashboard cards and data cells utilize an 8px base rhythm with 4px sub-increments (`space-xs` through `space-md`) to ensure high information capacity on viewport screens without visual crowding.

### Breakpoint Matrix
- **Desktop (1280px+):** Full multi-pane workflow; simultaneous view of scenario controls, primary canvas, and drill-down inspector panel. Gutters locked at `gutter-lg` (`1.5rem`).
- **Tablet (768px - 1279px):** Inspector folds into an overlay slide-out drawer. Dashboard metrics stack into a 2-column or 3-column auto-flow layout.
- **Mobile (< 768px):** Single-column vertical stream. Data tables activate horizontal freeze-column scroll for primary account titles.

## Elevation & Depth

This system intentionally discards heavy ambient dropshadows and blurred glass surfaces, relying instead on structural plane segmentation.

### Elevation Hierarchy
- **Level 0 (App Shell Canvas):** Pure white background (`#FFFFFF`) with zero elevation.
- **Level 1 (Card & Module Shells):** `#FFFFFF` fill defined strictly by a sharp `1px solid #E4E4E7` boundary. Depth is suggested through hairline separation instead of diffusion.
- **Level 2 (Active Overlays, Dropdowns, Popovers):** `#FFFFFF` surface framed with `1px solid #E4E4E7`, underpinned by an ultra-crisp micro-shadow: `0 2px 4px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)`.
- **Level 3 (Scenario Comparison Floating Panels):** `#FFFFFF` framed with `1px solid #D4D4D8`, backed by an executive shadow profile: `0 8px 16px -4px rgba(0, 0, 0, 0.06), 0 2px 4px -1px rgba(0, 0, 0, 0.03)`.

## Shapes

The shape hierarchy is compact and utilitarian (`roundedness: 1`). Soft curves are constrained to ensure edges line up naturally against neighboring linear metrics.

### Geometry Specifications
- **Controls & Data Inputs:** Standard radius of `0.25rem` (4px). Preserves structural rigidity across adjacent numeric fields.
- **Containers, Cards, & Panels:** Outer boundaries use `rounded-lg` (`0.5rem` / 8px) with internal nested elements stepping down to `0.25rem` to eliminate optical radius distortion.
- **Pill Tags & Status Dots:** Fully circular/pill geometry (`rounded-full` / 9999px) strictly for status metadata to contrast against rectangular table cells and cards.

## Components

### Buttons
- **Primary:** Deep zinc background (`#18181B`), pure white text (`#FAFAFA`), `0.25rem` radius, 32px height (compact) or 36px height (standard). Hover: `#27272A`. Active: `#09090B`.
- **Secondary / Outline:** Pure white background (`#FFFFFF`), `1px solid #E4E4E7`, `#18181B` text. Hover: `#F4F4F5` fill with `#D4D4D8` border.
- **Ghost:** Transparent background, `#71717A` text. Hover: `#F4F4F5` fill with `#18181B` text.

### Segmented Controls (Planner / Viewer / Scenarios)
- **Track:** 4px padding container with `#F4F4F5` background, `1px solid #E4E4E7` frame, `0.375rem` radius.
- **Segments:** High-legibility text (`13px`, weight 500). Active segment features `#FFFFFF` fill, `#18181B` label, subtle inset border (`#E4E4E7`), and a precise hairline shadow (`0 1px 2px rgba(0,0,0,0.05)`). Inactive segments use `#71717A` text with zero background.

### Status Pill Tags
- **Structure:** `20px` total height, horizontal padding of `6px` or `8px`, pill radius (`9999px`), `label-sm` font.
- **Indicator Dot:** Integrated `6px` solid spherical indicator positioned left of the text with a 4px gap.
- **Status Variants:**
  - *On-Track:* Emerald dot (`#059669`), Emerald background (`#ECFDF5`), 1px border (`#A7F3D0`), text (`#065F46`).
  - *Watch:* Amber dot (`#D97706`), Amber background (`#FFFBEB`), 1px border (`#FDE68A`), text (`#92400E`).
  - *Over-Budget:* Rose dot (`#E11D48`), Rose background (`#FFF1F2`), 1px border (`#FECDD3`), text (`#9F1239`).

### Data Tables (Budget-vs-Actual)
- **Header:** Sticky top, `32px` height, `#FAFAFA` fill, `1px solid #E4E4E7` bottom border. Labels use `label-caps` in `#71717A`.
- **Rows:** `36px` compact data height. Single-line borders (`#F4F4F5` horizontal line; `#E4E4E7` on section summaries). Alternating hover effect using `#FAFAFA`.
- **Cells:** Text left-aligned; all currencies, percentages, and variances right-aligned with forced `tabular-nums`. 
- **Variance Markers:** Positive/favorable deltas preceded by `+` in muted emerald (`#059669`); negative/unfavorable deltas preceded by `-` in sharp rose (`#E11D48`).

### Input Fields & Selects
- **Canvas:** Pure white (`#FFFFFF`) with `1px solid #E4E4E7` perimeter, 32px height for dense data entry, `0.25rem` radius.
- **State:** Focus states draw a crisp `1px solid #18181B` boundary without fuzzy outer glow rings. Monospace or tabular figure font active for numeric entry.

### Cards & KPI Tiles
- **Surface:** White canvas bounded by `1px solid #E4E4E7` and `0.5rem` corner radius.
- **Header Row:** Label displayed via `label-caps` (`#71717A`) accompanied by status pill indicator on the right.
- **Metric Row:** Large bold tabular figures (`display-xl` or `metric-lg`) paired with secondary sub-text showing absolute vs percentage variance against the baseline forecast.