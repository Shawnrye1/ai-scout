# The rules engine, and where the model is allowed

## Rule model

A `RuleSet` is a document. It has three parts.

**1. Requirements** — evaluated at determination, all must pass.
```jsonc
{ "id": "req_income", "kind": "threshold",
  "subject": "household_income_fpl_pct", "op": "lte", "value": 600,
  "source": { "document_id": "doc_...", "page": 1, "quote": "at or below 600% of the federal poverty level" } }
```
Kinds: `threshold`, `boolean_attestation`, `set_membership` (designated centers),
`negative_attestation` (no duplicate assistance), `enum_match` (payer class).

**2. Fund rules** — what opens, for whom, sized how.
```jsonc
{ "id": "fnd_lodging", "category": "lodging",
  "opens_when": { "subject": "distance_miles", "op": "gt", "value": 100 },
  "amount": { "kind": "per_night_ceiling", "cents": 18000 },
  "period": "per_night", "max_periods": 6,
  "source": { "document_id": "doc_...", "page": 1, "quote": "Lodging beyond 100 miles, capped at $200 a night" } }
```

**3. Spend controls** — what the register allows.
```jsonc
{ "id": "ctl_lodging", "fund": "lodging",
  "allow": { "mcc": ["7011"] },
  "deny": { "mcc": ["7995"] },
  "item_list": null,
  "caps": [ { "kind": "per_transaction", "cents": 18000 } ] }
```
Item-level control uses versioned NDC/UPC approved product lists, referenced by id.

Every rule carries `source` — the document, page and exact quoted clause it came from.
This is not decoration. It is what makes the sponsor console able to show the program
back to a compliance lead as *their own words next to the machine's reading of them*,
and it is the provenance record when the model drafted the rule.

## Versioning and replay

- A `RuleVersion` is immutable once approved. Editing a rule mints a new version.
- Every decision stores its `rule_version_id`. Replay = re-run the stored inputs
  against the stored version and assert byte-equal output.
- The replay harness (`packages/audit`) runs on every rule change **before** approval:
  take the last N real decisions, run them against the proposed version, and show the
  diff — which decisions would flip, and why. Nothing moves until a human approves that
  diff. This is the "review a replay before a dollar moves" promise from the deck, and
  it should be built early because it is also the best regression test in the system.

## Evaluation order (authorization)

Fixed order, short-circuit on first refusal, and the order is part of the contract
because the reason text depends on it:

1. Program live, patient enrolled and active, card active.
2. Payer-class gate (`docs/05-compliance-constraints.md`) — hard block, no override.
3. Fund exists, open, not expired.
4. Merchant category allowed.
5. Named merchant allowed / denied.
6. Item list, where the fund carries one.
7. Per-transaction cap.
8. Period cap (daily/nightly), including what earlier attempts today already consumed.
9. Remaining balance.

Reason codes are an enum, not free text. Reason text is generated from the rule and
the current balance, and must never contradict the number shown beside it. Refusal
copy is specific and unapologetic: *"$50 of the $50 daily limit was already used
today"*, not *"Sorry, this purchase couldn't be approved."*

## Determinism, enforced

`packages/core` has no dependency on `packages/ai`, no network, no `Date.now()`, no
`Math.random()`. Time and ids are injected. CI fails the build if the dependency graph
is violated or if the banned globals appear. Property test: for any generated input,
`decide(x, v, t)` called twice returns identical output; and for any two rule versions,
a decision made under v1 replays under v1 forever regardless of what v2 says.

## Where the model is allowed

**Rule drafting.** Input: the sponsor's criteria document. Output: a *proposed*
`RuleSet` where every rule has a `source` quote and a confidence. A human reviews each
rule against the quoted clause and approves. Nothing binds until approved. This is the
single highest-value AI feature in the product — it collapses the months-long scoping
project into days — and it is safe precisely because a human signs the output.

Build it as: document → structured extraction (Anthropic, structured output against
the `RuleSet` Zod schema) → rule-by-rule review UI showing quote and drafted rule side
by side → approval mints version 1.

**Receipt and document extraction.** Input: a receipt image or PDF on the
substantiation path. Output: structured fields plus confidence. Below a confidence
threshold, or where the extraction implies an exception to the rules, it routes to a
human. Record the model and version on every extraction.

**Patient questions.** A retrieval-grounded answer over the *compiled rules for that
patient*, phrased as the rules are written. It may explain a refusal; it may not
reverse one.

**Anomaly flagging.** Patterns worth a human look — a merchant appearing across many
patients, a distance band that no longer matches a center list, an unusual refusal
rate after a rule change. Flags create review tasks. Flags never block a decision.

**Sponsor console assistance.** Natural-language queries over the decision ledger
("show me every lodging refusal last month and the rule that caused it") compiled into
parameterized SQL against a read replica, results rendered from the ledger. Read-only,
scoped to the sponsor's own programs.

## Where the model is forbidden

Determining eligibility. Setting or changing an amount, cap or ceiling. Approving or
declining an authorization. Granting an exception outside the approved matrix. Writing
patient-facing refusal reasons (those are generated from rules).

The reason is not squeamishness about models. It is that an automated system granting
individualized departures from an approved rule set is, functionally, making
inducement decisions at scale — and there is no regulatory authority saying that is
acceptable. Keeping the model on the proposal side of a human approval is what makes
the whole product defensible.

## Evals

Treat the drafting model like any other component under test:
- A corpus of real (redacted) criteria documents with human-authored gold rule sets.
- Score: clause coverage, rule correctness, hallucinated-rule rate (must be ~0),
  source-quote accuracy.
- Extraction evals on a receipt corpus: field accuracy, confidence calibration.
- Run on every prompt or model change. A regression blocks the change.
