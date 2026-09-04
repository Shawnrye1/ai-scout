# The patient journey, and what it forces us to build

The journey is short on purpose. Every step that exists, exists because a rule needs it.

```
  SMS link  ─→  one page  ─→  determined  ─→  virtual card  ─→  in the wallet
                              on submit       issued            tap to pay
                                  │
                                  ├─→ caregiver added in the same flow
                                  └─→ physical card requested, if wanted
```

## The five steps

**1. The invitation.** A text message with a link. No app to download, no account to
create, no password. The link carries a short-lived signed token scoped to one program
and one invitation — not to a patient record that already exists, because at this point
there isn't one.

Who sends it varies and must be configurable: the plan, the hub, the site, or us on the
program's behalf. That is an `InvitationSource` port with adapters, not a hard-coded
outbound SMS call.

**2. The page.** One page. The questions exist because a requirement needs the answer —
turn a requirement off and its question disappears. Mobile-first, because the link
arrived by text and will be opened on a phone. Per-program branding and language.
No save-and-resume in v1; the form is short enough not to need it.

**3. The determination, on submit.** Synchronous. Requirements evaluated in order, in
under a second, and the person is told what they qualify for on the same screen — the
funds that opened, what each covers, and where the card works. If they do not qualify,
they are told which requirement was not met, in plain words, and the determination is
recorded exactly as an approval would be.

**4. The virtual card.** Issued in the same minute, on the same screen. Funds already
shaped by the determination. Nothing to wait for and nothing to activate.

**5. Into the phone's wallet.** A button that adds the card to Apple Wallet or Google
Wallet without leaving the page.

## What step five actually requires — read this before promising it

Push provisioning is not a feature we build. It is a capability the rail and its issuer
either have or do not have, and it carries real dependencies:

- **Network certification.** Visa Digital Enablement Program (VDEP) or Mastercard Digital
  Enablement Service (MDES), held by the issuer.
- **Issuer participation** in Apple Pay and Google Pay in-app provisioning, with the
  entitlements and SDK integration that go with each.
- **Apple's `PKAddPaymentPassViewController`** flow on iOS and **Google's TapAndPay
  push-provisioning** on Android — each needs an encrypted payload minted by the issuer,
  which means our page hands off to their flow rather than owning it.
- **A web path.** Our enrollment page is a mobile web page, not a native app. Web-based
  push provisioning is materially more constrained than in-app; on iOS it generally
  requires the issuer's own app or a supported web flow. **This is the single most
  likely place the promised journey breaks, and it must be verified with the rail before
  it appears on the website.**

Fallbacks, in order, so the journey never dead-ends: add-to-wallet if supported; card
details shown on screen for manual wallet entry; a link that emails or texts the add
flow; and the physical card path.

**Open question for the rail:** does Lynx support push provisioning to Apple and Google
Wallet from a mobile web enrollment flow, on which networks, and is it available on
plan-owned filtered-spend programs specifically? Nothing public says so.

## The physical card path

Offered, never assumed, and never the default.

- Requested at enrollment or at any time afterwards from the patient view.
- Address verification against what was captured for the distance rules — a mismatch is
  a review task, not a silent failure.
- Fulfillment is the rail's; we hold the request, the status and the expected date, and
  we surface all three to the patient and to the program.
- Activation, replacement and lost-card flows exist and are recorded like anything else.
- The virtual card keeps working the whole time. A physical request never suspends it.

**The website shows virtual only.** The physical path lives in the product and in the
sales conversation, not on the marketing page — because the point of the page is that
the money is usable before anything arrives in the post.

## The caregiver

A caregiver is a person, not a checkbox, and the deck already commits to the right
behavior: added in the same flow, not a second one.

What that forces:

- **A `caregivers` table**, each row linked to a patient and to the determination that
  authorized them. A caregiver has their own name, contact and relationship.
- **Their own card**, virtual, issued the same way. Not a shared card — because a
  decision has to name who swiped.
- **Their own spend rules.** Some funds a caregiver may draw from (meals, transport,
  lodging when accompanying); others they may not (anything prescription-linked).
  This is a per-fund `caregiver_eligible` flag evaluated at authorization.
- **Attribution on every decision.** `actor_id` on the decision row distinguishes the
  patient from a named caregiver. Both appear in the record and in the audit bundle.
- **A cap on how many.** Programs set it; the advisory-opinion patterns commonly allow
  one or two, sometimes with per-person per-diem limits.
- **Their own consent.** A caregiver is a distinct data subject with their own contact
  details and their own authorization.

## What this adds to the build

Beyond what `docs/01-architecture.md` already covers:

| New capability | Why | Where it lives |
|---|---|---|
| Invitation and outreach | The journey starts with a text, not a portal login | New `InvitationSource` port; SMS adapter |
| Signed enrollment tokens | A link with no account behind it | `apps/enroll`, short TTL, single use, program-scoped |
| Question generation from requirements | "Turn a requirement off and its question disappears" | `packages/rules` → form schema projection |
| Card provisioning and wallet push | Step five | `CardRail` port extension; rail-specific, verify first |
| Physical card lifecycle | Request, verify, fulfil, activate, replace | `CardRail` port; status surfaced in patient view |
| Caregiver as a first-class person | Own card, own rules, own record | `caregivers` table; `actor_id` on decisions |
| Patient view | Funds, activity, card, and the reason for any refusal | `apps/patient`, or the program's own app via API |
| Consent capture | HIPAA authorization, and TCPA for the text message | New `consents` table; required before the first SMS |

## The consent problem nobody mentions on a slide

Texting a patient is regulated. Sending an enrollment link by SMS needs prior express
consent under the TCPA, and the consent has to come from somewhere — the plan's
enrollment materials, the site's intake, or the hub's existing relationship. **We will
almost never be the party that obtained it.**

So the invitation flow must record *who* obtained consent, *when*, and *through what*,
and must refuse to send when that record is absent. Build the refusal path first; it is
the one that protects the program.
