import { site } from '@/content/site'

/** Section 2 — the record. */
export const record = {
  id: 'the-record',
  eyebrow: 'The same day, on the record',
  heading: 'A refusal is a record, not an error.',
  lede: 'Both answers carry the same detail: the merchant, the amount, the fund, the reason in plain words, the latency, and the rule version that produced it. That is what makes a program defensible a year later.',
  /**
   * ⚠️ Open item (HANDOFF §8): these come from a synthetic replay, not
   * production traffic. Re-verify or replace before external use. The
   * provenance line below stays until they are real.
   */
  stats: [
    { value: '2,340', label: 'decisions replayed' },
    { value: '1,670', label: 'approvals · 670 refusals' },
    { value: '380 ms', label: 'median decision' },
  ],
  statsProvenance: 'Figures from a synthetic replay of one program year, not production traffic.',
}

/** Section 4 — the four segments. */
export const segmentsSection = {
  id: 'who-its-for',
  eyebrow: "Who it's for",
  heading: 'One operating system. Whoever is funding it.',
  lede: 'The governing rules and the trigger change with the funder. What the system does with them does not.',
  constant:
    'Determine, fund, restrict, record. The last four never change — which is why the second program is configuration rather than a second implementation.',
}

/** Section 6 — controls. */
export const controls = {
  id: 'controls',
  eyebrow: 'Controls',
  heading: 'Two different questions, answered in two different places.',
  lede: 'Eligibility is settled before a dollar opens. Whether a given purchase is in policy is settled at the register. Conflating them is how programs get into trouble.',
  columns: [
    {
      title: 'Eligibility — determined up front',
      body: 'Income, distance, a documented condition, an on-label prescription, the absence of duplicate assistance. Established from evidence your criteria name, recorded with the rule version that produced the determination.',
      foot: 'No merchant check produces any of these.',
    },
    {
      title: 'The spend — decided at the register',
      body: 'Merchant category, the approved product list, the fund the purchase draws from, the cap and the period. Decided where the purchase happens, in a fraction of a second, and recorded either way.',
      foot: 'Controls prove the spend was in policy. They do not prove eligibility.',
    },
  ],
}

/** Section 7 — platform boundaries. */
export const platform = {
  id: 'platform',
  eyebrow: 'Platform',
  heading: 'Ahead OS is a decision layer. Not a hub, not a pharmacy, not a bank.',
  lede: 'Money moves on a regulated partner rail. Decisions happen here, deterministically, and every one of them replays.',
  is: [
    {
      title: 'Rules you can read',
      body: "Drafted from your own criteria document, approved by a person, versioned and immutable once effective. They are your rules, not a model's opinion.",
    },
    {
      title: 'Determinations that replay',
      body: 'Same inputs and same rule version produce the same output, forever. The ledger is append-only; a correction is a new row that references the original.',
    },
    {
      title: 'An API, not a destination',
      body: 'Your app, a hub portal, or a card with no app at all. The patient surface is a client of the API — distribution is yours.',
    },
  ],
  isNot: [
    'No case managers and no call center — we are not a hub.',
    'No dispensing and no claims adjudication — we are not a pharmacy.',
    'No custody of funds — we are not a bank.',
    'We do not pick centers or guide patients — we are not a navigator.',
    'Every program runs one product. Nothing is bespoke.',
  ],
}

/** Section 8 — close. */
export const close = {
  eyebrow: 'Start',
  heading: 'Bring us the document you already have.',
  lede: 'The criteria are written. That document is the input — there is nothing to specify first.',
  asks: [
    {
      title: 'Send the criteria',
      body: 'The eligibility language as it stands today, in whatever form it exists. A policy PDF is enough.',
    },
    {
      title: 'See it drafted as rules',
      body: 'We return the rules drafted from it, clause by clause, with the source quoted beside each one. A person on your side approves them.',
    },
    {
      title: 'Run one program',
      body: 'One program, live, with determinations and refusals on the record from the first day.',
    },
  ],
  email: site.contactEmail,
}
