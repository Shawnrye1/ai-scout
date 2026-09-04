# What else we need to build

The register of everything the spec now implies but has not been designed. Ordered by
whether it blocks a first customer.

## Blocks the first customer

**The clinical prong evaluator.** `docs/08-policy-packs.md` names `clinical_prong` as a
requirement kind but does not specify it. It has to express: which evidence sources
satisfy a prong, at what strength, in what combination, over what lookback — as data,
not code, because every plan writes it differently. This is the hardest single piece of
design in the product and everything in the SSBCI market depends on it.

**Claims and assessment ingestion.** New inbound ports (`ClaimsSource`,
`AssessmentSource`) with no adapters designed. Plans will hand over a flat file, an
837/835 extract, an HL7 feed or an API, and the format will differ every time. Needs a
normalizer with a well-defined intermediate shape, and a decision about how much history
to hold versus derive.

**The attestation surface.** `apps/attest` is listed and unspecified: a clinician form,
a fax fallback, a review queue, an SLA clock, an approval or denial letter. This is how
the market runs today, so a product that cannot accept an attestation cannot replace the
process it is competing with.

**Consent capture and gating.** No `consents` table designed yet. Must record who
obtained consent, when, through what, and for which channel — and must refuse to send an
SMS when the record is absent. Build the refusal path first.

**Wallet push provisioning — verify before designing.** Whether the rail supports Apple
and Google Wallet provisioning from a mobile web flow, on which networks, on plan-owned
filtered-spend programs. If the answer is no, the patient journey on the website changes.
Nothing public answers this.

**SOC 2 Type II.** A procurement gate at every plan buyer, not a scored item. Instrument
for it from the first commit: access logs, change management, no shared credentials,
least privilege, encryption at rest. Retrofitting costs several times more.

## Blocks the second customer

**The appeal workflow** (`employer-coverage`). An ERISA §503 denial states the specific
reason, the plan provision relied on, and appeal rights — and something has to receive
and track the appeal. No other pack needs this, which is exactly why it will be
forgotten until it blocks a deal.

**Determination expiry and re-determination.** Deeming windows, continuation reviews,
annual re-verification, grant periods. Every pack expires determinations differently and
the engine currently treats a determination as permanent.

**The third outcome.** `foundation-grant` needs "qualified, but the fund is closed" as
distinct from "did not qualify." That is a change to the determination outcome enum, and
enum changes are cheap now and expensive later.

**Evidence bibliography as an object.** `rule_evidence` linking a rule to a citation with
a publication date, with a check that the date is inside the ten-year window. Small, and
required by the CY2025 rule.

**Encounter data output.** Supplemental benefit records with correct service category
codes, reconciling to the approved bid. CMS said it will follow up where submissions look
inconsistent with the bid — so this output has to tie to the determination record, which
is a design constraint on both.

**Multi-tenancy.** If we go to market through a card vendor or a hub, they are a tenant
above the funder. Child organizations, scoped keys, delegated administration, and data
isolation between tenants. Cheap to design now, painful to retrofit.

## Needed before scale, not before revenue

**Physical card lifecycle** — request, address verification, fulfillment status,
activation, replacement, loss.

**Patient view** — funds, activity, card, and the reason for any refusal. May be ours,
the program's own app, or a hub portal; the API has to serve all three.

**Notification and language** — what the patient is told, when, in which language, on
which channel, and the record that it was sent.

**Reconciliation** — the nightly assertion that the fund balance projection equals the
sum of fund events, and the alarm when it drifts.

**Rule authoring UI** — today the drafting flow assumes a document. Programs will also
want to edit a rule directly, which means the same approval and replay path from a
different entry point.

**Model evals in CI** — a gold corpus of criteria documents, scored on clause coverage,
rule correctness, hallucinated-rule rate and source-quote accuracy. A regression blocks
the change.

## Open questions that change the design

1. **Does the rail support per-event API funding**, or only benefit-year schedules?
2. **Does the rail support wallet push provisioning from mobile web?**
3. **Are travel and lodging merchant categories supportable** on a filtered-spend purse?
4. **Who is the tenant** — the plan, or the vendor we go to market through?
5. **How much claims history** do we hold versus derive and discard? This is a privacy
   and a cost question at once.
6. **Does an attestation bind, or propose?** If a clinician's attestation is an input to
   a rule rather than a determination itself, the model stays clean. If plans expect it
   to be dispositive, the record has to show that a human, not the engine, decided.

## Deliberately not building

Case management. Dispensing. Claims adjudication. Funds custody. Care navigation.
Choosing centers. Anything that makes us a hub, a pharmacy, a bank or a navigator —
per `docs/00-product-spec.md`.
