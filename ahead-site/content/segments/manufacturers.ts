import type { Segment } from '@/content/types'

export const manufacturers: Segment = {
  slug: 'manufacturers',
  name: 'Manufacturers',
  navGloss: 'Patient support and ancillary programs',
  governedBy: 'Anti-Kickback Statute and OIG advisory opinions',
  determines:
    'Income, distance, an on-label prescription, and no duplicate assistance',

  hero: {
    eyebrow: 'Manufacturers',
    h1: 'The dollars were budgeted. The eligibility was never in question. A process stood in the way.',
    lede: 'Income, distance, an on-label prescription, no duplicate assistance. Ahead OS establishes all four before a dollar moves, and records the determination the way an advisory opinion expects to see it.',
  },

  byHandToday: [
    {
      title: 'A coordinator reading program criteria per patient',
      body: 'The criteria are the same for everyone. The reading of them is not, and nothing records which reading produced a given answer.',
    },
    {
      title: 'Receipts collected, submitted and queued',
      body: 'The patient pays first, keeps the paper, submits it, and then waits on a queue they cannot see.',
    },
    {
      title: 'Reimbursement weeks later',
      body: 'The support arrives long after the expense it was meant to cover — which is the same as not arriving, for the patients the program exists for.',
    },
    {
      title: 'Refusals rarely recorded at all',
      body: 'The approvals leave a trail. The refusals are a phone call, and the program cannot show a year later that it treated two similar patients the same way.',
    },
  ],

  criteria: {
    document:
      'Patients with a household income at or below 400% of the Federal Poverty Level, residing more than 100 miles from the treating center, holding an active on-label prescription for the therapy, and receiving no other source of assistance for the same expense, are eligible for travel and lodging support of up to $2,000 per treatment course.',
    highlights: [
      'at or below 400% of the Federal Poverty Level',
      'more than 100 miles from the treating center',
      'no other source of assistance for the same expense',
    ],
    rules: [
      {
        title: 'Income against the Federal Poverty Level',
        body: 'Household size and income evaluated against the FPL table for the benefit year, from the evidence the program names as acceptable. The table is versioned with the rule.',
      },
      {
        title: 'Distance from the treating center',
        body: 'Measured from the address captured at enrolment to the named center. The same measurement is used later for address verification, so a mismatch is a review task rather than a silent failure.',
      },
      {
        title: 'An active on-label prescription',
        body: 'Established before funds open, not asserted afterwards. Off-label use does not satisfy it, and the determination records which evidence did.',
      },
      {
        title: 'No duplicate assistance for the same expense',
        body: 'Checked against the other sources the program names. This is the requirement most often skipped by hand and the one an advisory opinion looks for.',
      },
      {
        title: 'The cap, and what happens to what is unspent',
        body: 'Up to $2,000 per treatment course. The fund expires with the course, and unspent value returns to the sponsor rather than lingering as an open balance.',
      },
    ],
  },

  record: {
    approved: {
      outcome: 'approved',
      title: 'Harbor Inn · lodging, night of treatment',
      amount: '$164.00',
      fund: 'Travel and lodging',
      reason:
        'Lodging within 25 miles of the treating center on a scheduled treatment date. $1,836.00 of the course cap remains.',
      detail: [
        { label: 'Patient', value: 'PT-90233' },
        { label: 'Determination', value: 'DET-2027-002187 · four requirements established' },
        { label: 'Acted', value: 'Caregiver · named on the determination' },
        { label: 'Rule version', value: 'v3.0.2' },
        { label: 'Decision latency', value: '347 ms' },
        { label: 'Recorded', value: '19:52:11 UTC−05:00' },
      ],
    },
    declined: {
      outcome: 'declined',
      title: 'Harbor Inn · lodging, four nights after the course',
      amount: '$656.00',
      fund: 'Travel and lodging',
      reason:
        'The treatment course closed on 8 February and the fund expired with it. Unspent value returned to the sponsor.',
      detail: [
        { label: 'Patient', value: 'PT-90233' },
        { label: 'Determination', value: 'DET-2027-002187 · four requirements established' },
        { label: 'Acted', value: 'Caregiver · named on the determination' },
        { label: 'Rule version', value: 'v3.0.2' },
        { label: 'Decision latency', value: '384 ms' },
        { label: 'Recorded', value: '20:04:56 UTC−05:00' },
      ],
    },
  },

  obligations: [
    {
      title: 'Eligibility established before funds open, not after',
      body: 'All four requirements settled up front, each recorded with the evidence that satisfied it and the rule version that evaluated it.',
    },
    {
      title: 'Federal and commercial populations separated in the system, not in a policy binder',
      body: 'Payer class is a required field on every enrolment and is evaluated on every decision. Certain combinations are blocked in the engine and cannot be unlocked by configuration or by an exception.',
    },
    {
      title: 'Every fund expiring, with unspent value returning to the sponsor',
      body: 'A fund with no end date is an open-ended benefit. Expiry is part of the determination, and the return is recorded.',
    },
    {
      title: "No export correlating an individual's funding with the sponsor's own product",
      body: 'Program reporting is aggregate. There is no setting, role or export that turns it into patient-level data tied to the product.',
    },
    {
      title: 'The reimbursement path and the pre-funded path producing the identical record',
      body: 'Funding mode is per-program configuration, never an assumption. Whichever mode a program runs, the determination, the reason and the rule version look the same on the record.',
    },
  ],

  note: 'Funding mode is set per program. Which modes are available to a given population is a legal determination made with your counsel, not a setting we recommend.',
}
