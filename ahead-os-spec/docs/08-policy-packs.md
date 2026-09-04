# Policy packs — four funders, one engine

A policy pack is a named, versioned bundle of constraints, requirement kinds, input
sources and output obligations that a program inherits. It is how the same engine
serves four regulatory worlds without branching in `packages/core`.

A program names exactly one pack. The pack sets hard floors a program may tighten but
never loosen.

---

## `ma-ssbci` — Health plan

**Funder:** a Medicare Advantage organization. **Governed by:** 42 CFR 422.102(f) and
the CY2025 and CY2027 final rules. **Trigger:** a documented qualifying condition.

**What the determination must establish** — three conjunctive prongs, and the regulation
is explicit that the condition alone is not sufficient:

1. one or more comorbid and medically complex chronic conditions that is life-threatening
   or significantly limits overall health or function;
2. high risk of hospitalization or other adverse health outcomes;
3. requires intensive care coordination.

**New requirement kind: `clinical_prong`.** Unlike a threshold or an attestation, a prong
is satisfied by evidence from one of several sources, and the plan's own written criteria
say which sources count and at what strength. This is the hardest requirement kind in the
system and it is the reason this pack exists.

**Inputs this pack needs that no other pack does:**

- **Claims history** — diagnosis codes, utilization markers, inpatient and ED counts.
  New inbound port: `ClaimsSource`. Batch file or API.
- **Health risk assessment results** — new inbound port: `AssessmentSource`.
- **Provider attestation** — a clinician confirms the prongs. This is a whole surface:
  a portal form, a fax fallback, a review queue and a clock. Today this is how most of
  the market runs, and any credible product must support it as an input even while
  automating around it.
- **Deeming windows.** Plans commonly grant benefits provisionally and verify within a
  window — 60 days at one large plan, 180 at another. The pack must model a provisional
  determination that expires into a full one or into a documented removal.

**Outputs this pack owes:**

- A determination record for every enrollee assessed, **eligible and ineligible alike**,
  retrievable on CMS request.
- A **public criteria page**, generated from the version actually running.
- An **evidence bibliography** per benefit — high-quality clinical literature published
  within ten years, attached to the rule it supports. This is a first-class object, not
  an attachment: `rule_evidence` rows linking a rule to a citation with a publication date.
- **Supplemental benefit encounter data** with the correct service category codes.
- A **chronic-condition disclaimer** rendered across member communications.

**Hard constraints:** self-attestation alone never satisfies a prong — CMS has issued
enforcement actions on exactly this. No cross-plan-year carryover of unspent value.
Determination and its criteria must exist at bid time.

**Calendar:** bids are due the first Monday in June. Criteria are locked at bid. The
program year starts 1 January. Everything about this pack's timing follows from those
three dates.

---

## `employer-coverage` — Employer

**Funder:** an employer or its plan. **Governed by:** plan documents and ERISA.
**Trigger:** a documented qualifying condition or a covered service.

**What the determination establishes:** whatever the employer's written coverage policy
says — for a specialty or GLP-1 program that typically means clinical thresholds,
comorbidity requirements, prior therapy and step edits, participation in an accompanying
program, and continued-coverage criteria tied to documented response.

**Distinctive requirement kinds:** `step_therapy` (an ordered sequence of prior trials
with durations) and `continuation_review` (a determination that expires and must be
re-established on evidence of response). The second one matters: it is the first pack
where a determination is explicitly time-boxed by design.

**Inputs:** pharmacy claims, medical claims, prescriber attestation, lab values where
the policy names them.

**Outputs this pack owes:** ERISA §503 shape — a written denial stating the specific
reason, the plan provision relied on, and appeal rights. **This pack must produce an
appealable denial, with an appeal workflow behind it.** No other pack requires that.

**Hard constraints:** the denial notice content is regulated. Do not let it be freehand.

---

## `manufacturer-support` — Manufacturer

**Funder:** a pharmaceutical manufacturer. **Governed by:** the Anti-Kickback Statute and
OIG advisory opinions. **Trigger:** treatment at a designated center.

**What the determination establishes**, following the AO 24-03 and AO 25-06 pattern:
income at or below a stated percentage of the federal poverty level, an on-label
prescription, US residency, assignment to a designated treatment center, distance from
that center, and the absence of alternative assistance from an insurer, the center or a
charity.

**Distinctive requirement kinds:** `fpl_threshold` (income against household size and the
current federal poverty guidelines, which change annually and must be versioned like any
other rule input) and `no_duplicate_assistance` (a negative attestation with a real
consequence).

**Hard constraints — these are the gates from `docs/05-compliance-constraints.md`:**

- `payer_class = federal` plus any cost-sharing category is **always declined**. The code
  path does not exist.
- `payer_class = federal` plus `funding_mode = prefund` requires a recorded
  `legal_clearance_ref` before the program can go live; absent it the program is forced
  to `reimburse`.
- No export may correlate an individual's funding with the funder's own product
  dispensing. Aggregate by default.
- Every fund expires and unspent value returns to the sponsor.

**This pack is not enabled by default.** A program using it requires the clearance
reference on file.

---

## `foundation-grant` — Foundation

**Funder:** an independent 501(c)(3). **Governed by:** independent charity guidance.
**Trigger:** a grant award.

**What the determination establishes:** the foundation's own published criteria — disease
fund, income band, insurance status, residency — applied identically to every applicant.

**The distinctive constraint is architectural, not clinical: independence.** A donor may
not learn who received assistance or how funds were allocated. So this pack inverts the
usual reporting model — **donor-facing outputs are aggregate only, and there is no scope
that unlocks patient-level detail to a donor.** Not a setting. Not an admin override.

**Distinctive requirement kind:** `fund_capacity` — a determination can be correct and
still result in no award because the disease fund is closed. That is a third outcome
beyond qualified and not-qualified, and the record must distinguish "did not qualify"
from "qualified, fund closed."

---

## What the packs share, and what they must not

| | ma-ssbci | employer | manufacturer | foundation |
|---|---|---|---|---|
| Criteria authored by | the plan, in its bid | the employer | the manufacturer | the foundation |
| Public criteria required | **yes** | no | no | usually yes |
| Denial must be appealable | no | **yes** | no | varies |
| Evidence bibliography | **yes** | no | no | no |
| Clinical prongs | **yes** | partial | no | no |
| Income threshold | sometimes | no | **yes** | **yes** |
| Distance rules | rarely | no | **yes** | sometimes |
| Federal-beneficiary gate | n/a | n/a | **hard** | routed |
| Donor/funder data firewall | no | no | **yes** | **absolute** |
| Determination expires | deeming window | **yes** | per episode | per grant period |

Everything in that table is a pack, not an engine branch. If a pack difference ever
requires an `if` inside `packages/core`, the requirement model is missing a kind — add
the kind, not the branch.

## Build order

`ma-ssbci` first, in full. `foundation-grant` second — it is the simplest and a
foundation will actually take a design-partner meeting. `employer-coverage` third, and
it is the one that adds the appeal workflow. `manufacturer-support` last, gated on
counsel.
