# Use-case selection — where the engine goes first
**September 4, 2026.** Research and information, not legal advice.

## The frame: one engine, three markets, one axis that decides

OTC and Rx are not separate businesses. They are **spend categories** — what the money
buys once someone has been determined eligible. The axis that decides whether Ahead OS
has anything to do is a different one:

> **Who writes the eligibility document, and does a human currently read it?**

Where a funder writes prose criteria that a person applies by hand, the engine is the
product. Where the criteria are one national list, the engine has nothing to bite on —
regardless of how good the restricted-spend surface looks.

| Who writes the criteria | Spend category | Governed by | Engine has work to do? |
|---|---|---|---|
| MA plan (SSBCI, in its CMS bid) | OTC, groceries, produce, utilities, transport | 42 CFR 422.102(f) | **Yes — strongest** |
| Employer / plan (specialty and GLP-1 coverage policy) | Rx | plan documents, ERISA | **Yes — live and expensive** |
| Manufacturer (patient support program) | travel, ancillary, copay | AKS, OIG advisory opinions | Yes, but the AKS crux |
| Foundation (grant criteria) | any | independent charity guidance | Yes — purest, fewest buyers |
| State Medicaid (1115 HRSN) | food, housing, utilities | waiver terms | Yes, but mostly services not merchant spend |
| **IRS (§213(d))** | **OTC** | **IRC** | **No — SIGIS solved it nationally** |

The last row is the trap, and it is where the OTC instinct lands if you follow the
*surface* rather than the *document*. The rest of this note works through it and then
ranks the others by which produces a first paying reference fastest.

## What Silver actually indicates

Silver is the right thing to have noticed, but read it precisely. Silver did not build
a payments product — it built an **intelligence layer** (AI extraction and
adjudication of unstructured claim documents, with exception routing to humans) and
Lynx **embedded it and took it to Lynx's own customers**. That establishes three things:

1. Lynx will host a partner's decision logic on their rails.
2. Lynx is a **channel**, not only a rail. Their named customers include Centene and
   Priority Health.
3. Lynx sells banking, ledgering, restricted payments, e-commerce and supplemental
   benefits. They make **no claim** to eligibility determination or a benefit rules
   engine. That is the open slot on their platform.

Silver took the substantiation slot. **Determination is still open**, and determination
is what Ahead OS is.

## Why HSA/OTC is the wrong host for this engine

The instinct about the surface is right — SKU-restricted spend is exactly what Lynx is
best at. But the engine has nothing to bite on:

- The eligible product list is **national and centrally maintained by SIGIS**, not
  written per program. IIAS verifies eligibility at authorization and those purchases
  auto-substantiate without receipts.
- The criteria come from **IRS §213(d)** — one uniform rule set for every employer.
  There is no sponsor prose document, so there is no drafting, no versioning, no
  per-program variance, and no replay diff worth showing anyone.
- The residual manual pocket is the **90% rule** at pharmacies without IIAS, where
  receipts are still required. That is a substantiation problem — Silver's slot.
- The one place a real determination happens is the **Letter of Medical Necessity**
  layer (the Truemed model), and it is a formality under active legal attack. IRS
  IR-2024-65 (March 2024) warned about companies misrepresenting wellness expenses as
  medical care, and as of June 2, 2026 Migliaccio & Rathod is investigating Truemed
  over approvals allegedly issued with minimal individualized review after brief online
  questionnaires. Building rigor into a market whose economics depend on the
  determination *not* being rigorous is a business-model contradiction.

Same verdict for **ICHRA** (eligibility is 11 enumerated classes plus an IRS
affordability safe harbor — arithmetic, not judgment, and Lynx already administers it)
and for **employer LSAs** (prose criteria, yes — but no regulator audits the
determination, refusals are a UX annoyance rather than a compliance artifact, and 15+
funded incumbents already own the buyer).

## The strongest first market: SSBCI

**Special Supplemental Benefits for the Chronically Ill**, in Medicare Advantage.
Every criterion the engine needs is present, and the regulation has pre-written the
data model.

**The determination is genuinely hard.** 42 CFR 422.102(f) requires three conjunctive
prongs: one or more comorbid and medically complex chronic conditions that is
life-threatening or significantly limits health or function; **high risk of
hospitalization** or other adverse outcomes; and **requires intensive care
coordination**. The reg says plainly that having the condition alone "is not
sufficient." There is no CMS threshold for prongs two and three — each plan writes its
own operational criteria in prose, files them in its bid, and applies them by hand.

**The variance is the product.** HealthSun: a qualifying condition plus one of seven
utilization or functional markers, with a 180-day deeming period. UnitedHealthcare
(effective 1/1/2026): eligible diagnosis code or provider attestation, 60-day
verification window, benefit removed on failure. Wellcare/Centene: provider attests to
all three prongs in a portal, approval or **denial letter within 10 business days**.
Same statutory frame, entirely different documents.

**Refusals are already mandated.** The regulation requires the plan to document the
determination for enrollees "whether eligible or ineligible" and make it available to
CMS on request. Criterion (d) is not an inferred need here — it is black-letter text.

**Today it is paper.** Provider attestation forms, a fax fallback, a clinician reading
criteria, a letter, a clock. No dominant automated determination vendor exists. The card
vendors — NationsBenefits, Soda Health ($50M, Dec 2024) — sell the purse, not the
determination.

**The regulator is closing in, on a deadline.** The CY2027 final rule (effective June 1,
2026) requires plans to **publicly post their SSBCI eligibility criteria** and requires
supplemental benefit debit cards to carry **a real-time electronic verification
mechanism confirming enrollee eligibility at the point of sale**, with no cross-year
carryover. That is Ahead OS's architecture written into a federal rule with a 1/1/2027
compliance date. Separately, CMS's Fall 2025 HPMS memo requires encounter data for all
supplemental benefits and says CMS will follow up where submissions "appear incomplete
or inconsistent with their approved bids" — the determination record has to reconcile
to the bid. MedPAC (June 2025) supplies the motive: $86B in MA rebates in 2025, ~$130
PMPM on "other supplemental benefits" in SNPs, and CMS not knowing "which enrollees used
each benefit."

**The segment is where the growth is.** 35.2M MA enrollees; 8.2M in SNPs, which drove
85% of net MA growth; C-SNP up 45% year over year. SSBCI is concentrated there — food
and produce benefits in 85% of SNPs versus 11% of individual plans. Individual-plan
supplemental offerings are contracting, but the scrutiny per remaining benefit is
rising, which is the better shape for a compliance product.

**Two premises to drop.** VBID **ended 12/31/2025** for excess cost; CMS redirected
plans to SSBCI, so food-as-medicine is an SSBCI benefit category, not a separate market.
And the mid-year unused-benefits notification requirement was **rescinded** in the
CY2027 rule before the first mailing — do not build a wedge on it.

## Why this fits the founder specifically

SSBCI eligibility is chronic-condition adjudication against written criteria, producing
a documented approval or denial inside a clock. That is structurally identical to
benefits investigation and prior authorization in a specialty hub — twenty years of
operator experience pointed at a different vertical. And it removes the hardest problem
from the pharma version entirely: no manufacturer funder, so no Anti-Kickback Statute
crux, no beneficiary-inducement question, no unresolved pre-funding exposure. CMS
regulates it, and CMS has published the rules.

## What changes in the build

Very little, which is the point of the architecture.

- `packages/core`, the rule model, the ledger and the replay harness are unchanged.
- Policy pack becomes `ma-ssbci`; requirement kinds gain a `clinical_criteria` shape
  that evaluates chronic condition, risk and care-coordination prongs against claims,
  HRA and attestation inputs.
- `funding_mode` matters less; **`payer_class` and the audit trail matter more**.
- The rule-drafting AI now reads a plan's SSBCI criteria document instead of a
  manufacturer's. Same feature, better market: from CY2027 those documents are public,
  which means a free training and eval corpus.
- **Lead with the criteria-to-rules and audit-log slice, not the POS decision.** The
  point-of-sale decision is Lynx's job and is commodity. Determination and the record
  are not.

## Risks and how to hold them

MA rebate dollars are under pressure and individual-plan supplemental offerings are
shrinking. A health plan buyer runs a 6–12 month cycle with full third-party vendor
oversight diligence — the OIG's MA Compliance Program Guidance (Feb 3, 2026) puts heavy
weight on monitoring third-party contractors, which cuts both ways: harder to get in,
much harder to displace once in.

Mitigation: sell **through** Lynx or a supplemental-benefits card vendor as an embedded
component rather than direct to the MAO. Centene is a named Lynx customer, one of the
largest D-SNP operators, and runs the manual provider-attestation workflow across at
least eight state plans. That is a specific, warm, complementary first target.

## The Rx leg, which is a real second market

Lynx RX orchestrates employer funding, manufacturer support, HSA/FSA balances and
member out-of-pocket in one real-time transaction at NDC level, and names **GLP-1
access** as a use case. Lynx does the *waterfall* — which source pays which portion.
What it does not do is decide **whether this member qualifies for the employer's
program in the first place**, and that is now one of the most contested prose documents
in benefits: BMI thresholds, comorbidity requirements, prior therapy and step edits,
lifestyle-program participation, and continued-coverage criteria tied to documented
response. Written per employer, varying widely, applied today through PBM prior
authorization or a point solution, and expensive enough that employers argue about it.

That is the same engine with a different policy pack, sold to a buyer Lynx already
serves. It has not been researched to the depth of SSBCI — treat it as a strong
hypothesis, not a finding.

## Ranked

1. **SSBCI** — 5/5 on every criterion. Build here first; it produces the first paying
   reference and the audit story that sells everything else.
2. **Employer / plan specialty and GLP-1 coverage criteria (Rx)** — same engine, same
   channel, hot budget. Needs its own research pass.
3. **Medicaid HRSN / 1115** — same buyers via D-SNPs, but CMS rescinded the HRSN
   guidance in March 2025 and most benefits are provider-delivered services rather than
   merchant purchases. Later, through an SSBCI customer.
3. **Employer hardship / emergency relief funds** — genuine prose criteria and human
   reviewers; small budgets, no Lynx channel. A design partner, not a market.
5. **HEDIS/Stars incentive programs** — an upsell inside a plan you already serve.

The manufacturer patient-support program stays on the roadmap — it is where the
network is — but it is sequenced after a regulated-market reference exists, because it
carries the unresolved pre-funding question and a $250–500K compliance floor.

Weak, do not spend time: LSAs (no auditor, no consequential refusal, crowded), ICHRA
(mechanical), HSA/FSA OTC (SIGIS solved it nationally), VBID as a standalone (dead).

## Sources

[42 CFR 422.102](https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.102) · [CMS CY2027 MA/Part D final rule fact sheet](https://www.cms.gov/newsroom/fact-sheets/contract-year-2027-medicare-advantage-part-d-final-rule) · [Federal Register — CY2027 rule](https://www.federalregister.gov/documents/2026/04/06/2026-06600/medicare-program-contract-year-2027-and-certain-contract-year-2026-policy-and-technical-changes-to) · [Crowell & Moring — CY2027 implications](https://www.crowell.com/en/insights/client-alerts/cms-finalizes-cy-2027-medicare-advantage-and-part-d-rule-key-implications-for-plan-sponsors) · [CMS Fall 2025 HPMS memo — supplemental benefit encounter data](https://www.cms.gov/files/document/fall-2025-hpms-memo-submission-supplemental-benefits-data-ma-encounter-data-records-g.pdf) · [MedPAC June 2025, Ch. 2 — supplemental benefits](https://www.medpac.gov/wp-content/uploads/2025/06/Jun25_Ch2_MedPAC_Report_To_Congress_SEC.pdf) · [KFF — MA 2026 enrollment and key trends](https://www.kff.org/medicare/medicare-advantage-in-2026-enrollment-update-and-key-trends/) · [KFF — MA 2026 premiums and benefits](https://www.kff.org/medicare/medicare-advantage-2026-spotlight-a-first-look-at-plan-premiums-and-benefits/) · [Wellcare SSBCI provider attestation](https://www.wellcare.com/en/providers/ssbci-attestation) · [HealthSun SSBCI eligibility bulletin 2026](https://healthsun.com/forms-documents/special-supplemental-benefits-for-the-chronically-ill-ssbci-eligibility-changes-bulletin-2026/) · [UHC — documented chronic condition required for SNP benefits](https://www.uhcprovider.com/en/resource-library/news/2025/cms-chronic-condition-requirement-snp.html) · [CMS — VBID model to end after CY2025](https://cms.gov/blog/medicare-advantage-value-based-insurance-design-vbid-model-end-after-calendar-year-2025-excess-costs) · [Modern Healthcare — CMS drops unused-benefits notification](https://www.modernhealthcare.com/politics-regulation/mh-medicare-advantage-unused-supplemental-benefits-cms/) · [Sidley — OIG MA Compliance Program Guidance, Feb 2026](https://www.sidley.com/en/insights/newsupdates/2026/02/oig-releases-long-awaited-medicare-advantage-compliance-program-guidance) · [SIGIS — IIAS vs 90% comparison](https://sig-is.org/programs/iias-vs-90-comparison) · [SIGIS — eligible product list overview](https://www.sig-is.org/eligible-product-list/eligible-product-list-overview) · [Newfront — health FSA claim substantiation](https://www.newfront.com/blog/health-fsa-claim-substantiation) · [IRS IR-2024-65](https://content.govdelivery.com/accounts/USIRS/bulletins/38f2254) · [Migliaccio & Rathod — Truemed investigation, June 2026](https://classlawdc.com/2026/06/02/truemed-hsa-fsa-medical-necessity-investigation/) · [Fierce Healthcare — CMS rescinds Medicaid HRSN guidance](https://www.fiercehealthcare.com/payers/cms-rescinds-medicaid-health-related-social-needs-guidance) · [KFF — 1115 HRSN waiver watch](https://www.kff.org/medicaid/section-1115-medicaid-waiver-watch-a-closer-look-at-recent-approvals-to-address-health-related-social-needs-hrsn/) · [MedCity — Soda Health $50M](https://medcitynews.com/2024/12/benefits-administration-funding/) · [Lynx](https://www.lynx-fh.com/)
