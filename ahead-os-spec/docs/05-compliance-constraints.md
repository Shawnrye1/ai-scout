# Compliance constraints that must live in code

**This is engineering guidance derived from regulatory research. It is not legal
advice and no one here is a lawyer. Retain fraud-and-abuse counsel before a dollar
moves. The constraints below are the floor, not the opinion.**

## Why this file exists

The research finding that most affects the build: **pre-funding is the legally exposed
part of the design, not the restriction.**

Every OIG authority that blesses manufacturer-funded patient travel and lodging does so
for **receipt-verified reimbursement or direct third-party payment**:

- **AO 24-03** (June 17, 2024, favorable) — gene therapy; airfare beyond 300 miles,
  ground transport 100–300, lodging beyond 100, up to $50/day meals and $50/day
  incidentals; income ≤600% FPL; on-label; no alternative assistance.
- **AO 25-06** (July 1, 2025, favorable) — near-identical, per diem pegged to GSA
  rates. OIG expressly credited that the manufacturer *"did not provide cash"* and
  offered *"direct reimbursement… following expense verification, requiring recipients
  to submit receipts within 10 business days,"* with a vendor reviewing receipts to
  identify prohibited purchases.
- The **financial-need CMP exception** (42 C.F.R. § 1003.110) covers items and services
  *"excluding cash or cash equivalents such as checks or debit cards."*
- **AO 20-08** held a big-box gift card is a cash equivalent outside the
  Promotes-Access-to-Care exception (while declining AKS sanctions on low-risk grounds).
- The **local transportation safe harbor** (§ 1001.952(bb)) excludes entities that
  primarily supply health care items — i.e. it is drafted to keep manufacturers out.

Whether an MCC/SKU-restricted pre-loaded purse is a "cash equivalent" or an in-kind
"item or service" is **an open question with no authority either way**. That question
sits directly under the hero line "the money is already there."

**Engineering consequence:** the product must be correct and sellable without
depending on the answer. Hence `funding_mode` as first-class configuration, and hence
the payer-class gate below.

## Hard gates — implement in `packages/core`, no override path

These are not configuration. There must be no flag, no exception, no admin action and
no model output that can unlock them.

| Gate | Rule |
|---|---|
| **G1** | `payer_class = federal` + category in {`copay`, `coinsurance`, `cost_sharing`} → **always declined**, at determination and at authorization. Do not build the code path at all. |
| **G2** | `payer_class = federal` + `funding_mode = prefund` → **program cannot go live** without an explicit `legal_clearance_ref` recorded on the program (an OIG advisory opinion number or a counsel memo id). Absent it, the program is forced to `reimburse`. |
| **G3** | A fund may only open for a patient whose determination recorded `qualified` under a rule version that is effective at the care event's timestamp. No retroactive fund opening. |
| **G4** | No manufacturer-facing data export may correlate an individual patient's funding with that manufacturer's product dispensing. Sponsor exports are aggregate by default; patient-level detail requires a separate scope and is firewalled from product-linked fields. |
| **G5** | Every fund has an expiry. Unspent value returns to the sponsor. There is no path by which residual value becomes the patient's. |
| **G6** | The platform never holds funds. Money flows sponsor → sponsor bank → rail. We send instructions and record decisions. Any design that would put us in the flow of funds requires a money-transmitter analysis first. |

## The three funding modes

All three must produce a recorded decision with identical fidelity. The difference is
only what happens downstream.

**`reimburse`** — the AO 24-03 / 25-06 template, and the lowest-risk mode.
Determination and the funding decision happen up front and are recorded; the patient
incurs the expense; substantiation is submitted; the reimbursement is authorized
against the same rules. The card can still be the disbursement instrument. The
patient-facing promise becomes *"you already know what's approved, and you'll be paid
in days not weeks"* rather than *"the money is already there."*

**`prefund`** — the current pitch. Best UX, unresolved legal question for federal
beneficiaries. Mitigations that materially improve the posture and should be built as
first-class features, not afterthoughts: **expiry**, **clawback of unspent value**,
**mandatory post-hoc substantiation above a threshold**, and the **tightest possible
merchant set**. Those four together make the "in-kind service, not cash equivalent"
argument as strong as it can be made.

**`direct_pay`** — the most defensible design of all: the platform *books the service*
rather than funding the patient. Contract with a hotel aggregator and a rideshare API;
the patient never touches value. Worth building for at least lodging and ground
transport, because it is the mode a cautious compliance lead will say yes to fastest.

## Where each mode is clean

| Segment | Clean today | Notes |
|---|---|---|
| Clinical trial participants (IRB-approved) | all three modes | Pre-funded cards are already market norm; FDA guidance treats travel/lodging reimbursement as not undue influence. Cheapest compliance floor by a wide margin. |
| Commercially insured / cash-pay, travel & ancillary | all three modes | Enforce "no federal beneficiaries" at enrollment *and* at authorization, not just in the contract. |
| Federal beneficiaries, travel & ancillary | `reimburse`, `direct_pay` | `prefund` requires G2 clearance. |
| Federal beneficiaries, cost-sharing | none | G1. Never. |
| Employer / health-plan funded | different regime (ERISA / CMS supplemental) | Policy pack differs; the engine does not. |

## Other constraints the build must respect

- **HIPAA:** the manufacturer is generally not a covered entity, so the BAA chain is
  not automatic. Model the actual data flow; where the platform receives PHI from a
  covered entity (a site, a hub acting for a provider), a BAA is required. Patient
  authorization architecture needs privacy counsel. Assume WA My Health My Data,
  Nevada SB 370, and CCPA/CPRA apply to the consumer-facing surfaces.
- **Prepaid access (31 C.F.R. § 1010.100(ff)):** design toward an exclusion —
  closed-loop, low daily limits, no P2P, no international, no non-depository reload.
  Get a FinCEN memo before scale.
- **Reg E / CFPB Prepaid Accounts Rule:** if the patient holds a prepaid account, error
  resolution, disclosures and provisional credit obligations attach. Build the error
  workflow; do not discover it in production.
- **Tax:** pre-funded value is more likely to be treated as income to the patient than
  substantiated reimbursement. Build W-9 / 1099 infrastructure as an option per program
  from the start rather than retrofitting.
- **SOC 2 Type II** is a procurement gate at every pharma buyer. Instrument for it from
  commit one: access logs, change management, no shared credentials, encrypted at rest,
  least privilege. Retrofitting SOC 2 is far more expensive than building to it.

## Copy constraints that are also product constraints

From the design brief, and they are correct: never claim merchant controls prove
eligibility. Controls prove the *spend* was in policy. Eligibility is income, distance,
on-label prescription and absence of duplicate assistance — no merchant check produces
those facts. The determination surface is what proves eligibility, and that is exactly
why it is a separate, recorded, replayable decision rather than a form field.
