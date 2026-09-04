import type { Segment } from '@/content/types'

export const foundations: Segment = {
  slug: 'foundations',
  name: 'Foundations',
  navGloss: 'Grant eligibility and award records',
  governedBy: 'Independent charity guidance',
  determines:
    'Published criteria applied identically to every applicant, with the award and the refusal both recorded',

  hero: {
    eyebrow: 'Foundations',
    h1: 'Published criteria, applied identically, with the refusals on the record.',
    lede: 'A grant decision is a determination. Ahead OS runs your published criteria as written, records every award and every refusal the same way, and keeps donors on the other side of a wall the system enforces.',
  },

  byHandToday: [
    {
      title: 'A grants team reading criteria applicant by applicant',
      body: 'The criteria are published. The application of them lives in the heads of the people reading, and identical treatment cannot be demonstrated afterwards.',
    },
    {
      title: 'Fund capacity checked separately from eligibility',
      body: 'Two questions answered in two places, so an applicant who qualified against a closed fund is recorded the same way as one who did not qualify at all.',
    },
    {
      title: 'Award letters written from templates',
      body: 'The letter says what the template says. The reasoning that produced the award is somewhere else, if it was written down.',
    },
    {
      title: 'Refusals documented inconsistently',
      body: 'The awards are the record. The refusals are a note, a call, or nothing — and the refusals are what an audit asks about.',
    },
  ],

  criteria: {
    document:
      'Applicants with a diagnosis within the published disease fund, a household income at or below 500% of the Federal Poverty Level, and insurance coverage for the associated therapy, receive a grant of $5,000 per twelve-month period, awarded in the order applications are received while the fund remains open.',
    highlights: [
      'within the published disease fund',
      'at or below 500% of the Federal Poverty Level',
      'while the fund remains open',
    ],
    rules: [
      {
        title: 'Diagnosis within the published disease fund',
        body: 'Evaluated against the fund definition as published, at the version that was running on the day the application was received.',
      },
      {
        title: 'Income against the Federal Poverty Level',
        body: 'Household size and income against the FPL table for the year, from the evidence the published criteria name. The table is versioned with the rule.',
      },
      {
        title: 'Insurance coverage for the associated therapy',
        body: 'Established from the evidence the criteria name. The requirement is part of the published criteria, so it is part of the record on both outcomes.',
      },
      {
        title: 'Fund capacity — a separate question, recorded separately',
        body: 'Capacity is evaluated after eligibility, never as part of it. An applicant who qualifies against a closed fund is recorded as qualified, fund closed — which is a different outcome from did not qualify, and is treated as one.',
      },
      {
        title: 'Order of receipt',
        body: 'Applications are decided in the order they arrive. The order is part of the record, so identical treatment is demonstrable rather than asserted.',
      },
    ],
  },

  record: {
    approved: {
      outcome: 'approved',
      title: 'Grant application · 2027 disease fund',
      amount: '$5,000.00',
      fund: 'Copayment assistance — twelve-month period',
      reason:
        'All three published criteria established, and the fund was open at the time of receipt. Awarded in order of receipt, position 412.',
      detail: [
        { label: 'Applicant', value: 'APP-2027-00412' },
        { label: 'Determination', value: 'DET-2027-000412 · qualified, awarded' },
        { label: 'Acted', value: 'Engine · application received' },
        { label: 'Rule version', value: 'v1.2.0' },
        { label: 'Decision latency', value: '268 ms' },
        { label: 'Recorded', value: '08:19:44 UTC−05:00' },
      ],
    },
    declined: {
      outcome: 'declined',
      title: 'Grant application · 2027 disease fund',
      amount: 'Not awarded',
      fund: 'Copayment assistance — twelve-month period',
      reason:
        'Qualified against all three published criteria. The fund closed at position 500 and this application was received at position 517. Recorded as qualified, fund closed — not as ineligible.',
      detail: [
        { label: 'Applicant', value: 'APP-2027-00517' },
        { label: 'Determination', value: 'DET-2027-000517 · qualified, fund closed' },
        { label: 'Acted', value: 'Engine · application received' },
        { label: 'Rule version', value: 'v1.2.0' },
        { label: 'Decision latency', value: '271 ms' },
        { label: 'Recorded', value: '16:33:02 UTC−05:00' },
      ],
    },
  },

  obligations: [
    {
      title: 'Donor-facing reporting that is aggregate only',
      body: 'No setting, role or export unlocks applicant detail. The wall is enforced by the system rather than by a policy that asks people not to look.',
    },
    {
      title: '"Qualified, but the fund is closed" recorded distinctly from "did not qualify"',
      body: 'Two different answers to two different questions. Collapsing them into one refusal is the failure this segment is most often audited on.',
    },
    {
      title: 'Criteria published and versioned',
      body: 'The public page is generated from the rule version actually running, and every determination names the version it was decided under.',
    },
    {
      title: 'Identical treatment demonstrable across applicants',
      body: 'Any two applications with the same facts replay to the same outcome — and the replay, not an assurance, is the evidence.',
    },
  ],
}
