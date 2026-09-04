# Build plan — how to run Claude Code on this

## The short answer

**Yes, start building — but not the whole thing, and not the rail first.**

Four things are decided enough to build against today: the domain model, the
deterministic engine, the ledger, and the rule-drafting AI. Two things are not
decided and must not be baked in: which rail you are actually on, and whether
pre-funding is legal for federal beneficiaries. The architecture handles both by making
them configuration (`funding_mode`) and interfaces (`CardRail`) instead of assumptions.

The thing that unblocks the most is also the cheapest to build and the best demo:
**document → drafted rules → human approval → replay against a cohort.** It needs no
rail, no bank, no BAA, no card, and no money. It is the five-day onboarding story from
the deck, and it is the only claim in your whole pitch that no competitor makes.

## How to actually drive Claude Code

**Give it specs, not vibes.** The single biggest determinant of output quality is
whether the repo tells the model what "correct" means before it writes a line.

1. **Seed the repo with this pack.** `CLAUDE.md` at the root, `docs/` beside it. Claude
   Code reads `CLAUDE.md` on every session; the non-negotiables live there so they
   survive context resets.
2. **Work in vertical slices, one work package per session.** Not "build the API" —
   "make `POST /v1/care-events` open a lodging fund for a patient beyond the distance
   threshold, with a golden test for both the approval and the refusal." A slice that
   ends with a passing test is resumable; a slice that ends with scaffolding is not.
3. **Contracts before implementation.** Every session that adds behavior starts by
   changing `packages/contracts` (Zod), then the migration, then core, then the route.
   Ask for the schema and the test first, review them, then let it implement.
4. **Use a Neon branch per work package.** `neonctl branches create`; point
   `DATABASE_URL` at it; let it run migrations freely. Throw the branch away if the
   slice goes wrong. This is the main reason Neon is the right call here — cheap,
   disposable, real-shaped databases make an agent much safer to let loose.
5. **Make the guardrails executable.** A rule the model can violate silently is a rule
   that will be violated. Write these as CI checks in week one:
   - dependency-graph check: `core` must not import `ai`, `db`, or any adapter
   - banned-globals check in `core`: `Date.now`, `Math.random`, `fetch`, `process.env`
   - a test asserting `decisions` cannot be updated or deleted by the app role
   - a test asserting gate G1 declines, with no configuration that flips it
6. **Keep a `docs/decisions/` log.** One short ADR per real decision (why Hono, why
   Drizzle, why funding_mode is a column not a flag). Agents re-litigate settled
   questions when nothing says the question is settled.
7. **Let it write the replay harness early.** It is the best regression suite you will
   have, it is the thing you demo to compliance leads, and it makes every later change
   safe. Build it in WP-3, not "later".

## Work packages, in order

Each is one focused Claude Code session (or two). Each ends with tests passing.

**WP-0 — Repo skeleton.** pnpm workspaces, TypeScript strict, Vitest, lint, CI, the
four guardrail checks above, Neon connection with pooled/direct split, Drizzle
configured, a `hello` route and a `hello` test. *No product code.* Done when CI is green
and the guardrail checks actually fail on a deliberate violation.

**WP-1 — Domain + rule model.** `packages/core` types, `packages/rules` RuleSet schema
(requirements, fund rules, spend controls, `source` provenance on every rule),
compilation, and the pure `decide()` for the determination surface. Property test:
determinism. Golden tests: a qualified patient and a not-qualified patient from the
Meridian Oncology example in the deck.

**WP-2 — Ledger + persistence.** Drizzle schema per `docs/02-data-model.md`. Append-only
enforcement on `decisions` at the database level (revoke UPDATE/DELETE, trigger on
`rule_versions` immutability). Repositories. Migration applied to a Neon branch.

**WP-3 — Replay harness.** Given a rule version and a set of stored decisions, re-run
and diff. CLI + a function the console will call. This is the "review a replay before a
dollar moves" feature and the regression suite in one.

**WP-4 — Authorization surface.** `decide()` for authorization, with the fixed
evaluation order and reason-code enum from `docs/04-rules-engine.md`. Period caps that
account for what earlier attempts consumed the same day. Golden tests for every reason
code — every one needs a refusal test, not just a happy path. Benchmark against the
250 ms p99 budget with the fund state cached.

**WP-5 — Ports + in-memory adapters.** All ports defined. `InMemoryCardRail`,
`InMemoryWebhookPublisher`, `InMemoryDocumentStore`. The entire system runs end to end
with no external dependency. This is what makes WP-8 a swap rather than a rewrite.

**WP-6 — API surface.** Hono, Zod validation, idempotency middleware, per-program API
keys, RFC 9457 errors, generated OpenAPI. Endpoints: enrollments, care-events,
authorizations, substantiations. A declined decision returns 200.

**WP-7 — Rule drafting (the AI slice).** Document upload → structured extraction against
the RuleSet schema → rule-by-rule review UI showing the sponsor's quoted clause beside
the drafted rule → approval mints version 1 → replay diff before it binds. Include the
eval harness and a small gold corpus. **This is the demo.**

**WP-8 — Lynx adapter.** Only now. Implement `CardRail` against Lynx's sandbox; normalize
their authorization webhook into `AuthorizationRequest`. If anything Lynx-shaped wants
to reach `core`, stop and fix the model instead.

**WP-8b — Policy packs.** `packages/policy`. `ma-ssbci` in full: the `clinical_prong`
requirement kind, claims and assessment inbound ports, the attestation surface, deeming
windows, the evidence bibliography as a first-class object, the generated public criteria
page. Then `foundation-grant` as the second pack, which proves the pack abstraction is
real rather than a wrapper around one funder.

**WP-8c — Patient journey.** Invitation with consent gating, signed single-use enrollment
tokens, question generation projected from the requirement set, virtual card issue,
wallet push provisioning behind a capability check with the fallback ladder, physical
card request lifecycle, and the caregiver as a first-class person with `actor_id`
attribution. See `docs/07-patient-journey.md`.

**WP-9 — Console + hosted enrollment.** Next.js. The console is: programs, rule versions
with their source documents, the decision ledger with filters, replay, webhook
deliveries with manual replay, spend against budget. Enrollment is the one-page flow
whose questions are generated from the requirements — turn a requirement off and its
question disappears.

**WP-10 — Webhooks out, extracts, audit bundle.** Signed delivery with retry and replay,
the scheduled ledger extract with a hash manifest, and the audit bundle builder.

The marketing site from the design handoff is a separate, parallel track — hand
`AheadWebsite.dc.html`, `design-brief.md` and the `README.md` to a fresh Claude Code
session with no access to this repo, and let it build in Next.js against the tokens in
the handoff. Do not entangle it with the platform.

## What still needs deciding before WP-8

1. **Rail terms.** The 40% interchange figure is single-sourced to one conversation and
   undefined. At Durbin-exempt debit (~1.21%), 40% is ~48 bps of settled spend — real
   money at scale, a rounding error at pilot. Get in writing: 40% of gross or of Lynx's
   net; whether travel and lodging MCCs are supported at all (nothing on their site
   mentions travel or lodging); whether a purse can be funded per-event via API rather
   than on a benefit-year schedule; and whether Lynx will commit to any exclusivity
   given Lynx RX already markets pharma-funded subsidies to pharma directly.
2. **Beachhead segment.** Trial participants (cleanest, cheapest compliance floor,
   pre-funded cards already normal) versus commercial-only patients versus federal
   beneficiaries in reimburse mode. This decides which policy pack ships first — not the
   architecture, which is why the build can start before it is answered.
3. **Sell direct or through hubs.** Pharma procurement requires SOC 2 Type II, named
   staff with backup coverage, production evidence and live end-to-end case demos, on a
   6–18 month cycle — a hard gate, not a scored deduction, and not clearable at 10–20
   hrs/week with no reference customer. Selling *through* a hub (the way the existing
   card vendors do) puts someone else's MSA, security review and money-movement
   licensing in front of yours. Your hub and specialty-pharmacy network is a bigger
   asset here than the software is.
4. **Counsel.** Before WP-8, not after. The pre-funding question in
   `docs/05-compliance-constraints.md` is the thing to put in front of a
   fraud-and-abuse lawyer first, and the answer decides which `funding_mode` leads the
   pitch.
