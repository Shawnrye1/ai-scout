# Ahead OS — repo constitution

Read this file first, every session. It outranks convenience.

## What this is

Ahead OS is the decision layer for funded patient programs. A sponsor's written
eligibility criteria go in. The system determines who qualifies, opens the right
funds, decides every purchase at the point of authorization, and records approvals
and refusals identically, each stamped with the rule version that produced it.

**Money moves on a partner rail. Decisions happen here.** We are not a bank, not a
hub, not a pharmacy, not a navigator. We never take custody of funds.

Company: Ahead. Platform: Ahead OS. Never call the company "the platform".

## The seven rules that are not negotiable

1. **The decision engine is deterministic. The model never decides.**
   An LLM may draft rules from a sponsor document, extract fields from a receipt,
   answer a patient's question, or flag an anomaly. It may never determine
   eligibility, set an amount, or approve/decline an authorization. Any code path
   where a model output reaches a funding or authorization decision without a
   human-approved deterministic rule in between is a defect, not a feature.

2. **Every decision is replayable.** Same inputs + same rule version = same output,
   forever. Rules are versioned and immutable once effective. The decision ledger is
   append-only. No decision row is ever updated or deleted; corrections are new rows
   that reference the original.

3. **Refusals are recorded with the same fidelity as approvals.** A decline is a
   correct outcome, not an error. It gets the same record, the same reason detail,
   the same latency stamp. This is the product.

4. **Funding mode is per-program configuration, never an assumption.**
   Every program declares `funding_mode`: `reimburse`, `prefund`, or
   `direct_pay`. The engine must produce a correct, recorded decision in all three.
   See `docs/05-compliance-constraints.md` — this exists because the legality of
   pre-funding turns on facts we do not control.

5. **A pack difference is never an `if` in core.**
   Every program names exactly one policy pack — `ma-ssbci`, `employer-coverage`,
   `manufacturer-support`, `foundation-grant` — which sets constraints the program may
   tighten but never loosen. If a funder difference seems to need a branch inside
   `packages/core`, the requirement model is missing a kind. Add the kind, not the branch.
   See `docs/08-policy-packs.md`.

6. **Every decision names who acted.**
   A caregiver is a person with their own card, their own per-fund permissions and their
   own consent — not a flag on the patient. `actor_id` on every decision distinguishes
   the patient from a named caregiver, and both appear in the record.

7. **Payer class gates behavior in code, not in policy documents.**
   `payer_class` (`commercial`, `federal`, `cash_pay`, `trial`) is a required field on
   every enrollment and is evaluated on every decision. Certain
   (payer_class, category) pairs are hard-blocked at the engine level and cannot be
   unlocked by configuration, by an exception, or by a model. See
   `docs/05-compliance-constraints.md`.

## Stack

- TypeScript everywhere. Node 22+. pnpm workspaces.
- Postgres on **Neon** (branch per PR; `main` branch is production).
- **Drizzle ORM** for schema and migrations. Schema is code; no console edits.
- **Zod** as the single source of truth for every contract; OpenAPI generated from Zod.
- **Hono** for the API (small, fast, runs anywhere including edge).
- **Next.js (App Router)** for the sponsor console and the hosted enrollment page.
- **Inngest** (or pg-boss if we stay self-hosted) for durable workflows, retries and
  scheduled work. No ad-hoc setTimeout, no cron in app code.
- **Anthropic SDK** for all model calls, behind `packages/ai` — never called directly
  from a route or a rule.
- Vitest for unit, Playwright for the two end-to-end journeys.

## Layout

```
apps/
  api/            Hono HTTP surface. Thin. Validates, authenticates, delegates.
  console/        Next.js funder console.
  enroll/         Next.js hosted enrollment page. Mobile-first — the link arrives by text.
  patient/        Next.js patient and caregiver view: funds, activity, card, reasons.
  attest/         Next.js clinician attestation portal (ma-ssbci pack).
packages/
  core/           Domain model + the deterministic decision engine. NO I/O. NO network.
  rules/          Rule schema, versioning, compilation, replay harness.
  policy/         Policy packs. Constraints, requirement kinds, obligations per funder.
  db/             Drizzle schema, migrations, repositories.
  contracts/      Zod schemas for every inbound and outbound payload. Generates OpenAPI.
  ports/          Interfaces only. No implementations.
  adapters/       One directory per external system. Implements a port. Swappable.
  ai/             Model calls. Prompts, structured output schemas, evals. Proposals only.
  audit/          Decision ledger writer, audit bundle builder, replay CLI.
```

`packages/core` must be pure: given a program, a patient, a rule version and an
authorization request, it returns a decision. It cannot read a database, call a
network, read the clock (time is injected), or generate randomness. This is what
makes replay possible and it is the most important constraint in the codebase.

## Ports and adapters

Every external system is a **port** (an interface in `packages/ports`) with one or more
**adapters**. Application code depends on the port, never on the adapter.

Inbound ports: `EnrollmentSource`, `CareEventSource`, `EligibilityFileSource`,
`ProductListSource`.
Outbound ports: `CardRail`, `LedgerSink`, `NotificationSink`, `DocumentStore`,
`WebhookPublisher`.

The first `CardRail` adapter is Lynx. There must be a second adapter — even a stub
`InMemoryCardRail` used by tests — before the Lynx adapter is considered done. If a
Lynx-shaped concept leaks into `packages/core`, the abstraction has failed.

## Conventions

- Every inbound write is **idempotent** on a caller-supplied `Idempotency-Key`.
- Every outbound webhook is **signed** (HMAC-SHA256, timestamped, replay window) and
  **replayable** from the console.
- Every persisted decision carries: `rule_version_id`, `decision_latency_ms`,
  `inputs_hash`, `engine_version`.
- No PHI in logs, ever. Log the `patient_ref`, never name, DOB, address or diagnosis.
- Money is integer cents. There is no float in this codebase.
- Times are UTC in the database, `America/*` only at the presentation edge.

## Definition of done

A change is done when: contracts updated in `packages/contracts`, migration written
and applied to a Neon branch, unit tests pass, the replay harness passes for any rule
change, and — for anything touching a decision — a golden-file test exists showing
both an approval and a refusal.

## Do not

- Do not add a code path that can pay cost-sharing (copay/coinsurance) for a
  `federal` payer class. Not behind a flag. Not as an exception. Not "for testing".
- Do not let a model call block or delay an authorization decision.
- Do not store card PANs. Ever. The rail holds them.
- Do not write a "quick fix" that mutates a decision row.
