# Data model (Neon Postgres, Drizzle)

Money is `bigint` cents. Times are `timestamptz` in UTC. Every table has
`created_at`. Mutable tables have `updated_at`; ledger tables do not, because they are
never updated.

## Neon usage

- One Neon project. `main` = production.
- **A Neon branch per pull request**, seeded from a scrubbed snapshot. This is the
  single biggest reason to be on Neon: schema changes and replay tests run against a
  real copy of production shape without touching production.
- A long-lived `staging` branch for the sponsor demo environment.
- Connection pooling via Neon's pooled endpoint for the API; direct endpoint for
  migrations.
- Point-in-time restore retention set to the maximum the plan allows — the decision
  ledger is evidence.

## Core tables

### `sponsors`
`id`, `name`, `funder_type` (`manufacturer` | `employer` | `foundation` | `health_plan`),
`legal_entity`, `baa_status`, `created_at`.

### `programs`
`id`, `sponsor_id`, `name`, `brand_color`, `status` (`draft` | `live` | `paused` | `closed`),
`funding_mode` (`reimburse` | `prefund` | `direct_pay`),
`allowed_payer_classes` (array),
`policy_pack_id`, `rail_program_ref` (the rail's own program identifier),
`effective_from`, `effective_to`.

`funding_mode` and `allowed_payer_classes` are the two fields that carry the entire
compliance posture of a program. They are required, they have no default, and changing
either mints a new rule version.

### `policy_packs`
Named, versioned bundles of hard constraints that a program inherits and cannot
override downward: `id`, `name`, `version`, `constraints_json`, `authority_notes`.
Examples: `manufacturer-commercial-only`, `manufacturer-federal-reimburse`,
`trial-irb-approved`, `foundation-independent`.

### `rule_sets` / `rule_versions`
`rule_sets`: `id`, `program_id`, `name`.
`rule_versions`: `id`, `rule_set_id`, `version` (int, monotonic), `document_json`,
`compiled_json`, `source_document_id`, `authored_by`, `approved_by`, `approved_at`,
`effective_from`, `effective_to`, `content_hash`.

**Immutable after `approved_at`.** Enforce with a `BEFORE UPDATE` trigger that raises
when `approved_at IS NOT NULL`. Every rule links back to the clause in the source
document it came from — this is what lets a compliance lead read the program back
against the paper it was written from.

### `patients`
`id`, `program_id`, `external_ref`, `payer_class`
(`commercial` | `federal` | `cash_pay` | `trial`), `status`,
PHI fields encrypted at rest with a per-program data key (`pgcrypto` or app-layer
envelope encryption), `home_geo_hash` (not the address) for distance rules.

Store the **derived** facts the rules need — distance band, FPL band, on-label flag —
alongside the raw inputs, so a replay does not have to re-derive from PHI.

### Determinations — TWO tables, not one

**This changed after reading the primary regulation. Do not collapse them.**
42 CFR 422.102(f) separates the enrollee-level gate from the per-benefit gate, and only
the second must be recorded in both directions per benefit. Modelling this as one row is
non-compliant on the face of the rule, and it is the single most expensive thing to get
wrong, because every decision in the ledger points at it.

#### `subject_determinations`
The person-level gate. One row per person per evaluation event. Append-only.

`id`, `patient_id`, `program_id`, `coverage_year`, `rule_version_id`, `decided_at`,
`decided_by` (system or user), `outcome` (`met` | `not_met`),
`gate_results_json`, `inputs_hash`, `latency_ms`, `engine_version`,
`supersedes` / `superseded_by`.

`gate_results_json` holds one entry per gate condition — for `ma-ssbci` that is the three
statutory prongs, each **independently evidenced**:

```jsonc
{ "gate_id": "prong_2_hospitalization_risk", "met": true,
  "basis": [ { "means_type": "claims_review",      // hra | claims_review | other_similar
               "source_system": "...", "source_record_id": "...",
               "observed_at": "...", "retrieved_at": "...",
               "justification": null } ] }        // required when means_type = other_similar
```

A schema that stores a single boolean, or derives one gate from another, fails the
regulation's explicit statement that having the condition alone is not sufficient.
Also carry `sdoh_factors_considered` and an assertable `sdoh_sole_basis = false`.

#### `benefit_determinations`
The per-benefit gate. **One row per person per benefit per evaluation event.**
Append-only.

`id`, `subject_determination_id` (FK), `patient_id`, `program_id`, `benefit_id`,
`coverage_year`, `criteria_version_id`, `outcome` (`eligible` | `ineligible` |
`eligible_capacity_exhausted`), `criteria_evaluation_json`, `evaluated_at`,
`evaluated_by`, `engine_version`, `latency_ms`, `notified_at`,
`supersedes` / `superseded_by`.

`criteria_evaluation_json` is per criterion, not a summary:
`{criterion_id, operator, threshold, observed_value, met, data_source_ref}`.
Storing only the final boolean will not survive an auditor asking *which criterion
failed*.

**Ineligible outcomes are first-class rows**, never absences. No soft delete, no
overwrite, retrievable exactly as eligible ones are.

The third outcome value exists for `foundation-grant`: qualified, but the fund is closed.
Add it to the enum now — enum changes are free today and expensive once the ledger has
rows.

### The coverage-year freeze

`criteria_version_id` and the evidentiary standards it embeds are **frozen for the whole
coverage year**. `rule_versions` therefore carries `coverage_year` with
`effective_from`/`effective_to` bounded inside that year, and the system must **refuse**
to bind a determination for coverage year Y to a version created or altered mid-Y.

Enforce it in the database, not in application code. This is the one rule where a
permissive schema silently produces a violation nobody notices until an audit.

### `rule_evidence`
One bibliography per benefit per coverage year — not per plan, not per program.

`id`, `benefit_id`, `coverage_year`, `established_at`, `bid_submission_date`,
`recency_window_start`, `completeness_attested`, `fallback_invoked`,
`fallback_justification`, and child `citation` rows.

Two computed constraints: `established_at` must be on or before `bid_submission_date`;
and `recency_window_start` is **computed, never entered by hand** — it moves every
coverage year, so a bibliography carried forward unchanged silently falls out of window.

### `funds`
`id`, `patient_id`, `program_id`, `category`
(`lodging` | `ground_transport` | `airfare` | `meals` | `incidentals` | `prescription` | …),
`opened_amount_cents`, `remaining_amount_cents`, `period` (`per_day` | `per_night` | `per_episode` | `per_year`),
`cap_json`, `opened_by_determination_id`, `status`, `expires_at`, `balance_version` (int,
optimistic concurrency), `updated_at`.

### `fund_events`
Append-only. `id`, `fund_id`, `type` (`opened` | `topped_up` | `drawn` | `released` | `expired` | `clawed_back`),
`amount_cents`, `caused_by_decision_id`, `caused_by_care_event_id`, `occurred_at`.

Fund balance is derivable from `fund_events`. `funds.remaining_amount_cents` is a
maintained projection for the authorization hot path; a nightly job asserts the
projection equals the event sum and alarms on drift.

### `care_events`
`id`, `patient_id`, `program_id`, `type` (`appointment_scheduled` | `infusion_booked` |
`shipment_released` | `visit_completed` | …), `occurred_at`, `source_adapter`,
`source_payload_json`, `idempotency_key` (unique per program).

### `decisions` — the ledger
References `benefit_determinations`, not a single determination row.

Append-only, the single most important table.

`id`, `program_id`, `patient_id`, `surface` (`determination` | `funding` | `authorization`),
`outcome` (`approved` | `declined`), `reason_code`, `reason_text`,
`amount_cents`, `fund_id`, `merchant_json` (name, MCC, MID), `item_json` (NDC/UPC lines),
`rule_version_id`, `rules_evaluated_json` (which rules fired, in order, with results),
`inputs_hash`, `engine_version`, `latency_ms`, `decided_at`, `rail_auth_ref`.

Constraints: no `UPDATE` and no `DELETE` grant for the application role. A correction
is a new row with `corrects_decision_id` set. `reason_text` is generated from the rule,
never freehand — it is patient-facing and must not contradict the balance shown next
to it.

### `substantiations`
`id`, `decision_id`, `patient_id`, `document_id`, `extracted_json`,
`extraction_model`, `extraction_confidence`, `reviewed_by`, `review_outcome`,
`reviewed_at`.

Note `reviewed_by`: on the substantiation path a **human** reviews anything the model
is not certain about, and every model extraction records which model and version
produced it. This is the audit story for the AI layer.

### `webhook_deliveries`
`id`, `program_id`, `event_type`, `payload_json`, `signature`, `endpoint_id`,
`attempt`, `status`, `response_code`, `next_retry_at`. Replayable from the console.

### `audit_bundles`
`id`, `program_id`, `range_start`, `range_end`, `requested_by`, `manifest_json`,
`storage_ref`, `built_at`. A bundle is decisions + the rule versions that produced
them + the source documents those rules came from + a hash manifest.

## Indexes that matter

- `decisions (program_id, decided_at DESC)` — console and extracts.
- `decisions (patient_id, decided_at DESC)`.
- `funds (patient_id, category) WHERE status = 'open'` — the authorization hot path.
- `care_events (program_id, idempotency_key)` unique.
- BRIN on `decisions.decided_at` once the table is large; it is append-only and
  time-ordered, which is exactly BRIN's case.

## Retention

Decisions and rule versions: retain for the longer of the sponsor agreement term plus
seven years, or whatever counsel specifies. PHI minimization applies to everything
else — do not keep a raw address once the distance band is derived and recorded.
