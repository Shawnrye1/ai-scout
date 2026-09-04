# API contracts — inbound and outbound

All schemas live in `packages/contracts` as Zod, and OpenAPI 3.1 is generated from
them. The Zod schema is the source of truth; the OpenAPI document, the TypeScript
client and the docs are all build artifacts. Never hand-edit generated output.

## Cross-cutting rules

- **Versioning:** `/v1/...` in the path. Additive changes only within a version.
  Breaking change means `/v2` and a documented sunset for `/v1`.
- **Idempotency:** every `POST` requires an `Idempotency-Key` header. Store the key
  with the response for 24 hours and replay the stored response on repeat.
- **Auth:** per-program API keys for server-to-server, scoped to a program and a set of
  capabilities. OAuth client credentials for the console. Short-lived signed tokens for
  the hosted enrollment page.
- **Errors:** RFC 9457 problem details. A declined decision is **not** an error — it is
  a `200` with `outcome: "declined"`. Never return 4xx for a refusal.
- **Pagination:** cursor-based, opaque cursors, `limit` max 200.
- **Rate limits:** per API key, returned in `RateLimit-*` headers.

## Inbound

### `POST /v1/enrollments`
Submit a patient for determination. Works identically whether the caller is the hosted
page, a hub, or a batch file processor.

```jsonc
{
  "program_id": "prg_...",
  "external_ref": "hub-12345",           // caller's own id, for reconciliation
  "payer_class": "commercial",           // REQUIRED. commercial|federal|cash_pay|trial
  "patient": {
    "given_name": "...", "family_name": "...", "dob": "1980-01-01",
    "address": { "line1": "...", "city": "...", "state": "..", "postal_code": "....." },
    "contact": { "email": "...", "phone": "..." }
  },
  "attestations": {
    "household_income_cents": 6400000, "household_size": 3,
    "on_label_prescription": true, "other_assistance": false,
    "assigned_center_id": "ctr_..."
  },
  "caregivers": [ { "given_name": "...", "family_name": "...", "relationship": "spouse" } ],
  "consent": { "hipaa_authorization_id": "...", "obtained_at": "..." }
}
```

Response is a determination: outcome, per-requirement results, funds opened with
amounts and periods, rules version, latency. Synchronous — this is the "answered on
submit" claim and it must actually be true.

### `POST /v1/care-events`
```jsonc
{
  "program_id": "prg_...", "patient_ref": "pat_...",
  "type": "infusion_booked",
  "occurred_at": "2026-09-04T14:00:00Z",
  "context": { "center_id": "ctr_...", "nights": 2, "distance_miles": 182 }
}
```
Returns the funding decision: which funds opened or topped up, by how much, or the
recorded refusal and why. In `reimburse` mode this records entitlement rather than
moving money — same record, different downstream effect.

### `POST /v1/authorizations` *(called by the card rail)*
The rail's authorization webhook, normalized by the rail adapter.
```jsonc
{
  "rail_auth_ref": "auth_...", "card_ref": "crd_...",
  "amount_cents": 13800,
  "merchant": { "name": "Hampton Inn", "mcc": "7011", "mid": "...", "country": "US" },
  "items": [ { "upc": "...", "ndc": null, "amount_cents": 13800, "qty": 1 } ]
}
```
Response: `approved` | `declined`, `reason_code`, `reason_text`, `fund_id`,
`remaining_after_cents`, `rule_version`, `latency_ms`. Must fit the latency budget in
`docs/01-architecture.md`.

### `POST /v1/substantiations`
Receipt or document upload against a decision. Returns the extraction as a
**proposal** with a confidence score and a review state. Never auto-binds.

### `PUT /v1/eligibility-files/:batch_id` (SFTP-equivalent over HTTP)
Batch enrollment. Each row becomes an `enrollment.submitted` event. Per-row results,
partial success, no all-or-nothing.

### Also inbound, not public API
- SFTP drop → same normalizer as the batch endpoint.
- FHIR subscription (`Appointment`, `Encounter`) → `care_event.occurred`.
- Product list ingest: NDC/UPC approved product lists, versioned like rules.

## Outbound

All outbound webhooks: HMAC-SHA256 over `timestamp.body`, header
`Ahead-Signature: t=<unix>,v1=<hex>`, five-minute replay window, at-least-once
delivery with exponential backoff to 24 hours, and manual replay from the console.
Consumers must be idempotent on `event_id`.

### `decision.recorded`
Fires on every determination, funding and authorization decision — approvals and
refusals alike.
```jsonc
{
  "event_id": "evt_...", "type": "decision.recorded", "occurred_at": "...",
  "data": {
    "decision_id": "dec_...", "surface": "authorization", "outcome": "declined",
    "reason_code": "daily_cap_exhausted",
    "reason_text": "$50 of the $50 daily meal limit was already used today.",
    "amount_cents": 6400, "fund": { "id": "fnd_...", "category": "meals",
      "remaining_after_cents": 0 },
    "merchant": { "name": "Airport Grill", "mcc": "5812" },
    "rule_version": 4, "latency_ms": 336, "patient_ref": "pat_..."
  }
}
```

### `fund.lifecycle`
`opened` | `topped_up` | `drawn` | `released` | `expired` | `clawed_back`, with amounts
and the cause.

### `determination.completed`
Eligibility outcome, per-requirement detail, funds opened. This is what a hub writes
back into its own case record.

### `ledger.extract`
Scheduled reconciliation file (CSV + JSON manifest): every decision, every fund
movement, every rail settlement reference for the period, with a hash so the sponsor's
finance team can prove the file was not altered.

### `audit.bundle.ready`
On-demand bundle: decisions in range, the rule versions that produced them, the source
criteria documents those rules were drafted from, model-extraction provenance for any
substantiation, and a hash manifest.

## Ports (what an adapter must implement)

```ts
interface CardRail {
  createProgram(p: RailProgramSpec): Promise<RailProgramRef>
  issueCard(patient: PatientRef, kind: 'virtual' | 'physical'): Promise<CardRef>
  openPurse(fund: FundSpec): Promise<PurseRef>
  fundPurse(purse: PurseRef, cents: bigint, ref: string): Promise<void>
  closePurse(purse: PurseRef, reason: string): Promise<void>
  // inbound: the adapter normalizes the rail's auth webhook into AuthorizationRequest
}

interface CareEventSource { /* push, pull or file; normalizes to CareEvent */ }
interface EnrollmentSource { /* hosted page, API, hub, batch */ }
interface WebhookPublisher { publish(e: DomainEvent): Promise<void> }
interface DocumentStore { put(...): Promise<DocRef>; get(...): Promise<Stream> }
interface LedgerSink { write(extract: LedgerExtract): Promise<void> }
```

**Rule:** no adapter type ever appears in a `packages/core` signature. The Lynx
adapter translates Lynx concepts into these; if a Lynx concept has no domain
equivalent, either it does not matter or the domain model is missing something —
decide which, deliberately, rather than leaking it.
