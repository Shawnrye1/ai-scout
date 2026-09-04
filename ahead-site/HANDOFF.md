# Handoff — Ahead site, v2: segment pages and the patient journey

Three changes from the current single-page site. Everything else in
`design-brief.md` and the existing `README.md` still stands.

1. **Navigation becomes a dropdown**, with four segment child pages behind it.
2. **The main page gains a patient journey section**, and gains a compact outline of the
   four segments linking to those pages.
3. **The main page hero re-skins from manufacturer travel to a health plan member.**
   Same interaction, same code, different data — see §4.

---

## 1. Routes

```
/                     the main page
/health-plans         Medicare Advantage — SSBCI and chronic-condition determination
/employers            employer coverage criteria — specialty and GLP-1
/manufacturers        manufacturer patient support programs
/foundations          independent charity grant programs
```

Segment pages share one layout component and one content shape. Adding a fifth segment
must mean adding a content module, not a page.

## 2. Navigation

Sticky, ink, `min-height:62px`, wordmark "Ahead" in Newsreader 24px on the left.

Right side, in order: a **"Who it's for" dropdown**, then the existing secondary links
(Patient journey, Under the hood, Controls, Platform), then the amber CTA
"Start a program".

**Dropdown behavior**
- Opens on click and on `Enter`/`Space`; also opens on hover at ≥960px, but hover alone
  must never be the only way in.
- `aria-expanded` on the trigger, `role="menu"` on the panel, arrow-key navigation
  between items, `Escape` closes and returns focus to the trigger.
- Panel: white on ink, 6px radius, one row per segment. Each row is the segment name in
  Instrument Sans 15px with a 13px `#5E7382` gloss beneath it:

  | Row | Gloss |
  |---|---|
  | Health plans | Chronic-condition and supplemental benefit eligibility |
  | Employers | Specialty and GLP-1 coverage criteria |
  | Manufacturers | Patient support and ancillary programs |
  | Foundations | Grant eligibility and award records |

- Below 760px the whole secondary set collapses; the dropdown becomes a plain expanded
  list of the four segments inside the mobile menu. **The bar must never wrap.**
- The current segment is marked in the panel (amber left rule, 2px) when on a child page.

## 3. New section on the main page — the patient journey

Place it directly after the hero, before "The same day, on the record". This is the
section the client specifically wants foregrounded.

**Heading:** *"A text message, and the money is ready before they are."*

**Lede:** "No app to download, no account to create, no password. The link arrives by
text, the questions are the ones a rule actually needs, and the card is in their wallet
before they leave the page."

**Five steps**, laid out as a horizontal band on desktop and stacked on mobile. Each step
has an eyebrow (teal, 12.5px, tracked, uppercase), a Newsreader 20px title, and a 14px
muted description.

| Eyebrow | Title | Description |
|---|---|---|
| Step one | The text arrives | A link. No app, no account, no password. It opens on the phone it arrived on. |
| Step two | One page | The questions exist because a rule needs the answer. Turn a requirement off and its question disappears. |
| Step three | Answered on submit | Under a second. They are told what they qualify for on the same screen — or which requirement was not met, in plain words. |
| Step four | The card is issued | Virtual, in the same minute, with funds already shaped to what they qualify for. |
| Step five | Into their wallet | Added to the phone's wallet without leaving the page. Nothing to activate, nothing to wait for. |

**Below the band**, one line in Newsreader 18px: *"A caregiver is added in the same flow,
not a second one."*

**Do not mention physical cards on this page.** They exist in the product and in the
sales conversation. The point of this section is that the money is usable before anything
arrives in the post.

**Do not build an animated sequence here.** The hero already owns the interaction budget.
This band is static.

⚠️ **Blocking check before this ships:** step five claims add-to-wallet. That depends on
the banking partner holding network certification and supporting provisioning from a
mobile web flow. If that is unconfirmed, change step five to *"Ready to use"* — "The card
works immediately, on the phone or added to their wallet" — which is true either way.

## 4. Hero re-skin

Keep every mechanic in `AheadWebsite.dc.html`: the seven-beat day, the time chips, the
play/pause/replay control, the 620ms pending pulse, the phone with its three tabs and
fixed 404px scroll area, the amber fund flash, the deterministic latency
`236 + ((round(amount) * 37) % 184)`.

Change only the data, so the demo lands in the market the company is entering.

- Sponsor becomes a health plan rather than an oncology brand. Default `sponsorName`:
  **"Northline Health Plan"**. Default `sponsorColor` unchanged.
- Patient becomes a plan member. Keep the name Dana.
- Funds become: **Healthy Food** ($150 per month), **Utilities** ($75 per month),
  **Transportation** ($60 per month), **Over-the-counter** ($40 per quarter).
- The seven beats become a member's day:

| Time | Merchant | Amount | Fund | Outcome |
|---|---|---|---|---|
| 07:10 | *(leaving home)* | — | — | no transaction |
| 08:40 | Metro Transit | $2.75 | Transportation | approved |
| 11:05 | Fair Market Grocers | $38.20 | Healthy Food | approved — produce and staples on the approved list |
| 13:20 | Fair Market Grocers | $6.40 | Healthy Food | **declined** — item not on the approved product list |
| 15:55 | City Power & Light | $75.00 | Utilities | approved |
| 18:30 | Corner Pharmacy | $14.00 | Over-the-counter | approved — NDC on the list |
| Next day | — | — | — | nothing to file |

The 13:20 decline is the most important beat on the page. Its reason must name the item,
not the category, and must not contradict the balance shown beside it.

- The rules panel numbers change from mileage and meal caps to **the monthly food
  allowance** and **the over-the-counter quarterly cap**. Editing either still increments
  the rule version and recomputes every decision, exactly as now.
- The document phrase in "Under the hood" becomes a plan's own criteria language rather
  than a manufacturer's. Suggested text, with three amber-underlined phrases:

  > "Members with a documented qualifying chronic condition, at high risk of
  > hospitalization, requiring intensive care coordination, receive a monthly healthy food
  > allowance of $150, a monthly utility support amount of $75, and non-medical
  > transportation to plan-approved destinations."

  The three clickable phrases: *documented qualifying chronic condition*, *high risk of
  hospitalization*, *intensive care coordination* — because those are the three prongs a
  plan must actually establish, and showing all three is the whole differentiator.

## 5. New section on the main page — the four segments

Replaces the existing "One operating system. Whoever is funding it." funder table, or
sits immediately after it. Four cards in a `repeat(auto-fit,minmax(min(280px,100%),1fr))`
grid, each linking to its child page.

Card content: segment name (Newsreader 23px), the governing authority (13px muted), one
sentence on what the determination establishes, and a teal "See how it works →" link.

| Segment | Governed by | What the determination establishes |
|---|---|---|
| Health plans | CMS supplemental benefit rules | A documented qualifying condition, risk of hospitalization, and need for care coordination |
| Employers | Plan documents and ERISA | Clinical criteria, prior therapy, and continued coverage tied to documented response |
| Manufacturers | Anti-Kickback Statute and OIG advisory opinions | Income, distance, an on-label prescription, and no duplicate assistance |
| Foundations | Independent charity guidance | Published criteria applied identically to every applicant, with the award and the refusal both recorded |

Keep the existing teal constant line beneath the grid: *"Determine, fund, restrict,
record. The last four never change — which is why the second program is configuration
rather than a second implementation."*

## 6. Segment page template

One layout, six sections, driven entirely by a content module.

1. **Hero (ink).** Eyebrow with the segment name. H1 — the segment's specific problem, in
   their language. Lede. Two CTAs: amber "Start a program", outlined "See the record".
2. **What is decided by hand today (paper).** Three to four short blocks describing the
   current process in that segment, concretely enough that a practitioner recognizes it.
3. **The criteria, as written (ink).** The segment's own document language on paper, in
   Newsreader 19px/1.75, with money-carrying phrases amber-underlined — then the rules
   drafted from it. Reuse the "Under the hood" component from the main page.
4. **What opens, and what is refused (white).** Two record cards side by side — one
   approval on `#E4EFE9`, one refusal on `#F7EAE3` — with identical `<dl>` detail and the
   rule version on both. Segment-specific content.
5. **What this segment specifically requires (paper).** Three to five obligations unique
   to that funder — the thing that proves we understand their world.
6. **Close (ink).** "Bring us the document you already have." Three asks, amber email CTA.

### Content per segment

**`/health-plans`**

- H1: *"Your criteria are written. A nurse is still reading them, one member at a time."*
- Lede: "Ahead OS turns your plan's own eligibility criteria into versioned rules,
  determines every member against them, and documents the members who do not qualify as
  carefully as the ones who do."
- Decided by hand today: an internal claims query that refreshes weekly; a provider
  attestation form and a fax fallback; a clinical reviewer applying criteria case by case;
  an approval or denial letter inside ten business days.
- Section 5 obligations: written, objective criteria for every benefit · a documented
  determination for enrollees deemed **ineligible**, not only eligible · an evidence
  bibliography of clinical literature per benefit · criteria published on a public-facing
  page · determinations that reconcile to the approved bid.
- Note in section 5, small: "Self-attestation alone does not establish eligibility."

**`/employers`**

- H1: *"The coverage policy changes every year. The people applying it do not."*
- Lede: "Clinical thresholds, prior therapy, step edits, continued coverage tied to
  documented response. Ahead OS runs your policy as written and produces a denial your
  member can actually appeal."
- Decided by hand today: prior authorization queues at the PBM; a policy document
  interpreted differently by different reviewers; renewals that lapse because nobody
  re-checked; appeals answered without the rule that produced the original decision.
- Section 5 obligations: a written denial stating the specific reason and the plan
  provision relied on · appeal rights, and somewhere for the appeal to go · continued
  coverage that expires and must be re-established on evidence · the same answer for the
  same facts, every time.

**`/manufacturers`**

- H1: *"The dollars were budgeted. The eligibility was never in question. A process stood in the way."*
- Lede: "Income, distance, an on-label prescription, no duplicate assistance. Ahead OS
  establishes all four before a dollar moves, and records the determination the way an
  advisory opinion expects to see it."
- Decided by hand today: a coordinator reading program criteria per patient; receipts
  collected, submitted and queued; reimbursement weeks later; refusals rarely recorded at
  all.
- Section 5 obligations: eligibility established before funds open, not after · federal
  and commercial populations separated in the system, not in a policy binder · every fund
  expiring, with unspent value returning to the sponsor · no export correlating an
  individual's funding with the sponsor's own product · the reimbursement path and the
  pre-funded path producing the identical record.
- ⚠️ Copy constraint: this page must **not** claim that pre-funding is available for
  federal beneficiaries, and must not lead with "the money is already there."

**`/foundations`**

- H1: *"Published criteria, applied identically, with the refusals on the record."*
- Lede: "A grant decision is a determination. Ahead OS runs your published criteria as
  written, records every award and every refusal the same way, and keeps donors on the
  other side of a wall the system enforces."
- Decided by hand today: a grants team reading criteria applicant by applicant; fund
  capacity checked separately from eligibility; award letters written from templates;
  refusals documented inconsistently.
- Section 5 obligations: donor-facing reporting that is aggregate only, with no setting
  that unlocks applicant detail · "qualified, but the fund is closed" recorded distinctly
  from "did not qualify" · criteria published and versioned · identical treatment
  demonstrable across applicants.

## 7. Content shape

```ts
export type Segment = {
  slug: 'health-plans' | 'employers' | 'manufacturers' | 'foundations'
  name: string
  navGloss: string
  governedBy: string
  determines: string
  hero: { eyebrow: string; h1: string; lede: string }
  byHandToday: { title: string; body: string }[]
  criteria: { document: string; highlights: string[]; rules: { title: string; body: string }[] }
  record: { approved: RecordCard; declined: RecordCard }
  obligations: { title: string; body: string }[]
  note?: string
}
```

`content/segments/*.ts` exports one of these each; the page reads the module for its
slug. No copy in JSX.

## 8. Open items for the client

- Contact email for the CTAs — currently `hello@example.com` throughout.
- Whether the banking partner is named in the footer or stays generic.
- **Whether add-to-wallet is confirmed with the banking partner.** Blocks the wording of
  step five, per §3.
- The stats on the main page (2,340 / 1,670 / 380 ms) come from a synthetic replay.
  Re-verify or replace before external use.

## 9. Definition of done

Nav dropdown keyboard-operable and correct at 360px. Four segment pages rendering from
content modules. Patient journey band on the main page. Hero re-skinned to plan data with
the 13:20 refusal reading correctly. No horizontal scroll at 360px. No browser storage.
Lighthouse accessibility ≥ 95.
