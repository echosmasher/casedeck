# PRD: CaseDeck

> Product intent for CaseDeck — a project profitability calculator built as a portfolio piece.
> Engineering decisions (stack, data model, storage architecture, phasing) live in `PLAN.md` and
> will be formalized by `plan-architecture`. This document exists so the bet behind the build can be
> challenged before building and judged after shipping.

---

## 1. Problem Statement

**Who:** Technical reviewers and hiring managers screening candidates for AI-native product engineer
roles — roles where "did this person exercise real judgment about where to use AI vs. write
deterministic code, and did they solve an actual business problem or just CRUD" is part of the
evaluation bar.

**What:** These reviewers encounter a candidate's portfolio link at the resume/application stage,
before any conversation has happened. In the seconds they're willing to spend there, they can't tell
a generic AI-generated repo (looks competent on skim, thin on inspection) from a candidate who
understood and directed what was built. That signal gap means real judgment goes unnoticed, and the
reviewer either advances candidates on weaker signal (resume bullets) or filters them out without
ever seeing the differentiator.

**Cost of not solving it:** the candidate doesn't get differentiated from every other applicant with
an AI-assisted GitHub repo, at exactly the stage (resume screen) where advancement decisions are
being made fastest and with the least information.

---

## 2. Evidence

**Assumption — not yet validated.** There is no user research, interview data, or documented reviewer
feedback behind this problem statement. It is built from direct personal experience/inference about
how technical screening currently works, not from evidence gathered from reviewers themselves.

Validation method: track real reviewer reactions once this piece is actually in circulation (see
Success Metrics) — this is a live-fire validation, not a pre-build research exercise, which is a
deliberate and acceptable tradeoff for a single-builder portfolio artifact (see MVP).

---

## 3. Thesis (why build it, why now, why this beats the status quo)

**Why this:** Solving the pain (differentiating from generic repos) is table stakes — most portfolio
projects at least *try* to look distinct. The bet is that CaseDeck clears the bar by a wide enough
margin that a reviewer who would otherwise skim for ~10 seconds instead engages for 2+ minutes: the
confidence-weighted scenario bands and budget-vs-actual tracking are visible on the first screen with
zero setup, and the repo's own structure (deterministic engine vs. AI-assisted interpretation,
explicitly separated and documented) *is itself* the judgment signal a reviewer for this specific role
is trying to find.

**Why now:** AI coding tools have made "generate a repo that looks competent on a skim" cheap and
common, which is degrading skimming as a screening signal. Reviewers for AI-native roles specifically
need a way to see *how* a candidate used AI, not just *that* they shipped something — and that's a
signal current portfolio conventions (README + screenshots) don't surface.

**Why this beats the status quo (skimming a repo cold):** the demo is live, boots pre-loaded, requires
no setup, and puts the differentiator (a defensible profitability range, not a single number, plus
live variance tracking) on the very first screen — collapsing the reviewer's cost of going deep from
"clone and run it" to "click a link."

---

## 4. Hypothesis

> We believe **shipping CaseDeck** — a zero-setup, demo-first tool that surfaces confidence-weighted
> scenario bands and budget-vs-actual tracking on the first screen, built with a visibly disciplined
> split between deterministic engine code and AI-assisted interpretation — will cause **technical
> reviewers screening for AI-native product engineer roles, who encounter it at the resume/application
> stage**, to **engage with the live demo and treat it as a positive, differentiating signal**,
> resulting in **a higher rate of advancement (interview invites / responses) on applications where
> this piece is linked, compared to applications without it.**
>
> **We'll know we're RIGHT if:** applications linking CaseDeck show a noticeably higher
> advancement/response rate than applications that don't, tracked across the active job search window.
>
> **We'll know we're WRONG if:** across a meaningful number of applications where it's linked,
> reviewers show no engagement with it — no mentions, no response-rate lift over baseline — i.e.
> silence, not just lack of enthusiasm.

**Open TBD:** the specific timeframe and sample size ("meaningful number of applications") aren't
fixed yet — the job search is open-ended with no target date, so this will be judged qualitatively
against the active search window rather than a pre-committed deadline. Worth revisiting once
applications are actually going out.

---

## 5. Target User & JTBD

**Primary user (the actual customer of this artifact):** a technical reviewer or hiring manager
evaluating candidates for AI-native product engineer roles, at the resume/application-screen stage of
the pipeline, deciding whether to advance a candidate with no prior conversation to go on.

**Job to be done:**
> When I'm screening a stack of applications for an AI-native product engineer role, I want to
> quickly verify that a candidate exercises real judgment about where AI belongs versus where it
> doesn't, and can reason about non-trivial business problems, so I can confidently advance them
> without spending live-interview time finding that out.

**Secondary, in-world persona (design constraint, not a validation target):** within the demo itself,
the tool simulates being used by a project manager who budgets for projects/departments — not an
accountant, gets rate cards and multipliers from one. This persona's believability is a *quality bar*
for the demo (per PLAN.md's planted stories), not a user this PRD is trying to win over. Real PM
adoption is explicitly not a success metric for v1 (see Non-goals).

**Non-users (explicitly not the target for this artifact):**
- Non-technical recruiters/HR doing resume-keyword screens — they won't evaluate engine purity or
  scenario math, and this piece isn't optimized to land at that stage.
- Reviewers for roles with no AI-judgment component (e.g. pure backend/infra roles) where "did you use
  AI well" isn't part of the bar.
- Pipelines that only trust live-coding signal and structurally discount take-home/portfolio evidence.

**Constraints:** solo builder, open-ended timeline (no hard deadline forcing scope cuts) — quality and
completeness of the signal matter more than speed to ship.

---

## 6. MVP

The MVP is the **full scope already defined in PLAN.md** (Phases 0–9: engine, storage, input,
dashboard, import/actuals + variance, export, demo mode, skills, docs, publish). This is a deliberate
call, not scope creep: the hypothesis depends on a reviewer seeing *both* halves of the differentiator
together on the same first look — confidence-weighted scenario bands **and** budget-vs-actual
tracking. Shipping only one half (e.g. scenarios without actuals, or vice versa) would read as a
generic budgeting calculator and likely fail to produce the "this person gets it" reaction the
hypothesis is betting on. A thinner slice was considered and rejected for this reason.

**Door check:** two-way door. A published portfolio piece can be iterated on, corrected, or
re-promoted after publishing without real cost — nothing here is a one-way commitment, so there's no
need to spike before building; PLAN.md's phased build-and-accept structure already provides the
staged checkpoints.

---

## 7. Success Metrics

| Metric | Target | How measured |
|---|---|---|
| Advancement/response rate on applications linking CaseDeck vs. not | Noticeably higher for linked applications | Manually tracked by the candidate across the active search window (which applications included the link, which got a response/interview invite) |
| Explicit reviewer engagement with the differentiator | At least one unprompted mention of a specific feature (scenario bands, engine/AI split, variance tracking, a planted demo story) | Logged qualitatively from interview conversations/feedback as they happen |
| README 2-minute walkthrough (leading indicator, pre-launch) | Full value clear within 2 minutes, timed | Manual timed walkthrough per PLAN.md §7/§10 — a precondition for the hypothesis being testable at all, not the outcome itself |

**TBD — needs validation:** a firm timeframe/sample-size threshold for "noticeably higher" — deferred
until applications are actively going out (see Hypothesis, open TBD).

---

## 8. Non-goals

- **Real PM/team adoption as a v1 success metric.** The in-demo PM persona must be *believable*, but
  actual usage by real project managers is not what this build is trying to achieve or measure in v1.
- **Winning over non-technical recruiter/HR screens.** Not optimized for keyword-matching screens.
- **Multi-user, real accounts, or production deployment for a real organization's actual budgets** —
  this is a demo-first artifact; PLAN.md §8 (ROADMAP exclusions) governs the underlying product scope.
- **A/B testing or rigorous causal measurement of advancement-rate lift.** Sample size (one person's
  job search) won't support statistical rigor — signal here is directional and qualitative, not proof.

---

## 9. Open Questions

- [ ] What timeframe and sample size will actually be used to judge the hypothesis right/wrong,
      once applications start going out?
- [ ] Should advancement-rate tracking be a lightweight spreadsheet, or is that overkill for the
      volume of applications expected?
- [ ] If early signal comes back as "silence" (the WRONG condition), what's the response — revise the
      artifact, revise which roles it's linked for, or treat it as a validated null result and move on?
- [ ] Does the sibling repo (TaskDeck) get linked alongside CaseDeck, and if so, does that change
      how advancement-rate signal should be attributed between the two?
