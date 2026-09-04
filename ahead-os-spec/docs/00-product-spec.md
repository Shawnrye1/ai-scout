# Product spec (source of truth: the sponsor deck + design brief)

Ahead OS is the operating system for funded patient programs. The canonical product
narrative lives in `ahead-sponsor-deck.pptx` and `design-brief.md`; this file records
only what the build needs to treat as requirement.

## The three collapses

| Stage | Today | With Ahead OS |
|---|---|---|
| Onboarding | a scoping project, custom build per brand, months | rules entered, branded program live in days |
| Enrollment | forms, calls, a coordinator reading criteria | one page, questions generated from the rules, answered on submit |
| Transaction | patient pays, files, waits weeks | decided at the register, recorded either way |

## Requirements that are not cosmetic

- **Enrollment answers on submit.** The determination is synchronous. If it needs a
  queue, the claim is false.
- **Questions are generated from requirements.** Turn a requirement off and its question
  disappears, because nothing needs the answer. The enrollment form is a projection of
  the rule set, never a hand-built form.
- **Nothing is custom-built per program.** Income threshold, distance rules, caps,
  covered categories, program name and color all derive from the rules document. One
  product, configured differently.
- **Both answers on the record.** Approvals and refusals get identical detail, both
  stamped with the rule version and the latency.
- **Three enrollment doors, one engine:** patient self-enrolls by link/QR, site staff
  enrolls on the patient's behalf, or a hub/CRM/portal enrolls by API. Same rules, same
  record.
- **Distribution is the sponsor's:** own app, hub portal, or a wallet card with no app at
  all. The patient surface is a client of the API, not the product.

## What Ahead is not (build this into the boundaries, not just the copy)

Not a hub — no case managers, no call center. Not a pharmacy — no dispensing, no claims
adjudication. Not a bank — funds sit with the card partner, never with us. Not a
navigator — we do not pick centers or guide patients. Not a black box — rules are the
sponsor's, versioned and readable. Not bespoke — every program runs one product.

## One engine, whoever funds it

Manufacturer (AKS / OIG advisory opinions), employer (plan documents, ERISA), foundation
(independent charity guidance), health plan (CMS supplemental benefit rules). The
governing rules and the trigger change; determine → fund → restrict → record does not.
The difference is carried in policy packs, not in engine branches.

## Copy that must not drift

Never: "platform" for the company, seamless, revolutionize, empower. Never claim
merchant controls prove eligibility — they prove the spend was in policy. The banking
partner is named once, in the footer, as infrastructure. Ahead is the company; Ahead OS
is the platform. Declines are never styled as errors.
