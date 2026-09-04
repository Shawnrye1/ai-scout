# Architecture

## The shape of the thing

Ahead OS is a **decision engine with a ledger**, wrapped in adapters. Everything
valuable is in the middle; everything replaceable is at the edge.

```
   INBOUND                    CORE                       OUTBOUND
   ─────────                  ────                       ────────
   hosted enrollment  ─┐                            ┌─→  card rail (Lynx)
   enrollment API     ─┤                            │      issue card
   eligibility SFTP   ─┼→  determination  ─┐        ├─→  decision webhooks
   hub / CRM push     ─┘                   │        │
                                           ├→ LEDGER├─→  ledger extracts
   care events (hub,  ─┐                   │        │
     site, EHR/FHIR)  ─┼→  funding         │        ├─→  audit bundle
   scheduler          ─┘                   │        │
                                           │        └─→  notifications
   authorization      ──→  authorization  ─┘
     (from the rail)
```

Three decision surfaces, one engine:

1. **Determination** — at enrollment. Does this patient qualify, and which funds open,
   sized how? Runs once, recorded once, re-runnable on rule change as a *replay* that
   does not move money.
2. **Funding** — on a care event. Does this event open or top up a fund, and by how
   much? Governed by `funding_mode`.
3. **Authorization** — at the register, in real time, from the rail's webhook. Is this
   merchant/item/amount allowed against this fund right now? Must answer inside the
   rail's authorization window (budget: **p99 under 250 ms** of our own compute; the
   rail's total window is typically 1–2 s and we do not own all of it).

All three call the same pure function shape:

```ts
decide(input: DecisionInput, rules: CompiledRuleSet, clock: Instant): Decision
```

## Layering

**`packages/core` — pure domain.** No I/O, no network, no clock, no randomness. Time
and identifiers are injected. This is the only reason replay works and the only reason
we can honestly tell a compliance lead "same inputs, same answer, every time."

**`packages/rules` — the rule model.** A `RuleSet` is a versioned, immutable document.
Compiling it produces a `CompiledRuleSet` that `core` evaluates. Versions are
effective-dated; a decision names the version that produced it and that version can
never be edited afterward.

**`packages/db` — persistence.** Repositories return domain types, not rows. The
decision ledger is append-only and enforced as such at the database level, not by
convention (see `docs/02-data-model.md`).

**`apps/api` — transport.** Authenticates, validates against `packages/contracts`,
resolves the program, calls a use case, returns. No business logic. If a route file
contains an `if` about eligibility, it is in the wrong place.

**`packages/adapters` — the outside world.** Each adapter is a translation layer and
nothing more. It must not interpret. If Lynx returns a field we care about, it becomes
a domain concept in `ports`, not a Lynx type in `core`.

## Why ports and adapters is load-bearing here, not architecture astronomy

Three concrete reasons, all commercial:

1. **The rail will change.** The first rail is Lynx. Lynx is Series A, ~$44M raised,
   with CVS Health Ventures and McKesson Ventures on the cap table — both strategics
   whose parents own the patient-support market. Being unable to move rails is an
   existential dependency, and a sponsor's procurement team will ask about it.
2. **Every sponsor integrates differently.** One hub sends care events over a webhook;
   another drops a flat file on SFTP nightly; a third has an EHR that speaks FHIR
   `Appointment` and `Encounter`. These are four adapters against one
   `CareEventSource` port, not four forks of the product.
3. **The funder changes but the arithmetic does not.** Manufacturer, employer,
   foundation and health plan differ in governing rules and triggers, not in
   determine → fund → restrict → record. Program-level policy packs carry the
   difference; the engine does not branch on funder type.

## Modularity contract for integrations

Every inbound integration, no matter the transport, normalizes to one of four
canonical events before it reaches core:

| Canonical event | Meaning | Sources |
|---|---|---|
| `enrollment.submitted` | A patient is asking to be determined | hosted page, API, hub push, eligibility file row |
| `care_event.occurred` | Something happened that may open or top up a fund | hub webhook, site portal, FHIR subscription, scheduler |
| `authorization.requested` | The rail is asking us to decide a purchase | card rail only |
| `substantiation.submitted` | A receipt or document arrived | patient app, hub upload, email intake |

Every outbound emission is one of five:

| Emission | Payload | Consumers |
|---|---|---|
| `decision.recorded` | every determination, funding and authorization decision | sponsor systems, hub, data warehouse |
| `fund.lifecycle` | opened, topped up, closed, expired, clawed back | sponsor finance, hub |
| `determination.completed` | eligibility result + funds opened | hub, enrollment UI, patient app |
| `ledger.extract` | periodic reconciliation file | sponsor finance |
| `audit.bundle` | on demand: decisions + rule versions + provenance | compliance, external counsel |

Adding a sponsor should mean writing one adapter and one policy pack. If it means
touching `core`, the design failed.

## Latency budget for authorization

| Step | Budget |
|---|---|
| Transport + auth + validation | 15 ms |
| Load program + patient + fund state (single indexed read, cached) | 40 ms |
| Compile/fetch rule version (cached, immutable so cacheable forever) | 5 ms |
| Evaluate | 10 ms |
| Write decision (async-committed, but the row must exist) | 60 ms |
| Respond | — |
| **p99 total** | **250 ms** |

The rule version cache is the trick: rule versions are immutable, so they cache
indefinitely with no invalidation logic. Fund balance is the only hot mutable state;
keep it in one row with a monotonic version column and use optimistic concurrency.

## What the AI layer may and may not touch

Drawn as a hard boundary because the product's whole claim rests on it.

**Allowed (proposal, always human-approved before it binds):**
- Draft a `RuleSet` from a sponsor's criteria document, with each rule linked to the
  clause and page it came from. A human approves before it becomes a version.
- Extract structured fields from a receipt or invoice for the substantiation path.
- Answer a patient's question about what is covered, reading the compiled rules.
- Flag anomalies for human review. Flagging never blocks a decision.

**Forbidden:**
- Determining eligibility.
- Setting or adjusting an amount, cap or ceiling.
- Approving or declining an authorization.
- Granting an exception outside the approved rule matrix.

Enforced structurally: `packages/core` does not depend on `packages/ai`, and the
dependency graph is checked in CI. A model output can only become binding by passing
through a human-approval workflow that mints a new rule version.
