# The base system — what "built" means

The base system is **WP-0 through WP-6**. It is the part that is true regardless of
funder, rail, market or channel. Everything after it is configuration and surfaces.

When the base is done, the following is true: a rule set can be authored, versioned and
frozen; a person can be determined against it and the determination recorded in both
directions; funds open from that determination; a purchase is decided against those funds
in real time; every answer is written to an append-only ledger and can be replayed; and
all of it runs end to end **with no card rail, no bank, no policy pack, no AI, no
console and no money.**

## The instruction to give Claude Code

> Build only WP-0 through WP-6 from `docs/06-build-plan.md`, in order, one work package
> per session. Do not start WP-7 or later. Do not integrate any external service. Every
> package ends with contracts updated, a migration applied to a Neon branch, and tests
> passing. Stop and ask if a package seems to require something outside its scope.

Scoping it explicitly matters. Handed the whole pack, an agent will reasonably start
sketching the rail adapter and the console, and you end up with breadth instead of a
working core.

## Definition of done, checkable

**WP-0 — skeleton and guardrails**
- [ ] pnpm workspaces, TypeScript strict, Vitest, lint, CI green
- [ ] Neon wired with pooled endpoint for the app and direct for migrations
- [ ] Guardrail: `core` cannot import `ai`, `db`, or any adapter — **and the check fails
      on a deliberate violation**, proven
- [ ] Guardrail: banned globals in `core` — `Date.now`, `Math.random`, `fetch`,
      `process.env`
- [ ] Guardrail: a test proving the app role cannot UPDATE or DELETE ledger rows
- [ ] Guardrail: a test proving the federal cost-sharing gate cannot be configured open

**WP-1 — domain and rule model**
- [ ] `RuleSet` schema: requirements, fund rules, spend controls
- [ ] Every rule carries `source` — document, page, quoted clause
- [ ] Versions immutable after approval; `coverage_year` bound and enforced
- [ ] `decide()` is pure — time and ids injected
- [ ] Property test: same inputs twice, byte-identical output
- [ ] Golden tests: one person who qualifies, one who does not, both recorded

**WP-2 — ledger and persistence**
- [ ] `subject_determinations` and `benefit_determinations` as **separate tables**
- [ ] Per-gate basis and per-criterion evaluation stored, not summarised to a boolean
- [ ] Ineligible outcomes persist as rows
- [ ] Append-only enforced at the database; rule-version immutability by trigger
- [ ] The coverage-year freeze refuses a mid-year version binding
- [ ] Migration applied to a Neon branch, not just written

**WP-3 — replay harness**
- [ ] Re-run stored decisions against a version and assert byte-equality
- [ ] Diff a proposed version against real prior decisions: which flip, and why
- [ ] Runs in CI on every rule change

**WP-4 — authorization**
- [ ] Fixed evaluation order; reason codes as an enum
- [ ] Period caps account for what earlier attempts consumed the same day
- [ ] A refusal test for **every** reason code, not just the happy path
- [ ] Benchmarked against the 250 ms p99 budget with fund state cached

**WP-5 — ports and in-memory adapters**
- [ ] All ports defined in `packages/ports`, implementations nowhere near them
- [ ] `InMemoryCardRail`, `InMemoryWebhookPublisher`, `InMemoryDocumentStore`
- [ ] The whole system runs end to end with zero external dependencies

**WP-6 — API**
- [ ] Zod contracts; OpenAPI generated, never hand-edited
- [ ] Idempotency on every POST
- [ ] Per-program scoped keys
- [ ] RFC 9457 errors — and a decline returns **200**, not 4xx

## How to check it without reading the code

Ask Claude Code for three things:

1. **Run the guardrail checks after deliberately breaking each one.** If a violation does
   not fail the build, the guardrail is decoration.
2. **Show one approval and one refusal from the ledger**, with the rule version, the
   per-criterion evaluation, and the latency on each.
3. **Change a threshold, run the replay diff, and show which prior decisions flip.**
   If that works, the base system is real.

## What is deliberately not in the base

No card rail. No bank. No policy packs. No AI drafting. No console, patient view or
attestation portal. No wallet, no SMS, no caregiver. No webhooks out.

Those are WP-7 onward, and every one of them is easier once the base holds.
