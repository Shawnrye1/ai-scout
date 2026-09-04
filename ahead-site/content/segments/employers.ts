import type { Segment } from '@/content/types'

export const employers: Segment = {
  slug: 'employers',
  name: 'Employers',
  navGloss: 'Specialty and GLP-1 coverage criteria',
  governedBy: 'Plan documents and ERISA',
  determines:
    'Clinical criteria, prior therapy, and continued coverage tied to documented response',

  hero: {
    eyebrow: 'Employers',
    h1: 'The coverage policy changes every year. The people applying it do not.',
    lede: 'Clinical thresholds, prior therapy, step edits, continued coverage tied to documented response. Ahead OS runs your policy as written and produces a denial your member can actually appeal.',
  },

  byHandToday: [
    {
      title: 'Prior authorization queues at the PBM',
      body: 'A request enters a queue, waits behind other requests, and comes back with an answer whose reasoning stays inside the queue.',
    },
    {
      title: 'A policy document interpreted differently by different reviewers',
      body: 'The same facts reach two reviewers and produce two answers. Neither answer carries the version of the policy that produced it.',
    },
    {
      title: 'Renewals that lapse because nobody re-checked',
      body: 'Continued coverage is supposed to turn on documented response at six months. In practice it turns on whether someone remembered.',
    },
    {
      title: 'Appeals answered without the rule that produced the original decision',
      body: 'The appeal is reviewed against the policy as it reads today, not against the version that was running when the denial was issued.',
    },
  ],

  criteria: {
    document:
      'Coverage is provided for members with a body mass index of 30 or greater, or 27 or greater with at least one weight-related comorbidity, who have completed a documented three-month trial of an intensive lifestyle program, and is continued beyond six months only on documented weight reduction of five percent or more from baseline.',
    highlights: [
      'body mass index of 30 or greater',
      'documented three-month trial',
      'documented weight reduction of five percent or more',
    ],
    rules: [
      {
        title: 'Clinical threshold, with the comorbidity branch',
        body: 'BMI ≥ 30, or BMI ≥ 27 with at least one comorbidity from the list the policy names. Evaluated from the values your policy names as acceptable evidence, and recorded with the value that satisfied it.',
      },
      {
        title: 'Step therapy — an ordered sequence with durations',
        body: 'A documented three-month trial of an intensive lifestyle program, established before coverage opens. The sequence and the duration are the rule, not a reviewer’s judgement of whether it was long enough.',
      },
      {
        title: 'Continuation review — a determination that expires',
        body: 'Coverage past six months is re-established on documented reduction of five percent or more from baseline. The determination is time-boxed by design; when it expires it is re-run, and the outcome is recorded either way.',
      },
      {
        title: 'The denial the policy owes',
        body: 'A written reason, the plan provision relied on, the rule version that produced it, and appeal rights — assembled from the decision record rather than written by hand.',
      },
    ],
  },

  record: {
    approved: {
      outcome: 'approved',
      title: 'Continued coverage · six-month review',
      amount: 'Continued',
      fund: 'Specialty — weight management',
      reason:
        'Documented reduction of 7.2% from baseline, above the 5% the policy requires. Next review in six months.',
      detail: [
        { label: 'Member', value: 'MBR-77204' },
        { label: 'Determination', value: 'DET-2027-011980 · continuation review' },
        { label: 'Acted', value: 'Engine · scheduled review' },
        { label: 'Rule version', value: 'v2.1.3' },
        { label: 'Decision latency', value: '311 ms' },
        { label: 'Recorded', value: '09:41:07 UTC−06:00' },
      ],
    },
    declined: {
      outcome: 'declined',
      title: 'Initial coverage request',
      amount: 'Not covered',
      fund: 'Specialty — weight management',
      reason:
        'The three-month intensive lifestyle program trial the policy requires before coverage is not documented. BMI of 31.4 meets the clinical threshold; the prior therapy requirement does not. Appealable through 12 March.',
      detail: [
        { label: 'Member', value: 'MBR-77661' },
        { label: 'Determination', value: 'DET-2027-012044 · initial request' },
        { label: 'Acted', value: 'Engine · submitted request' },
        { label: 'Rule version', value: 'v2.1.3' },
        { label: 'Decision latency', value: '294 ms' },
        { label: 'Recorded', value: '14:12:38 UTC−06:00' },
      ],
    },
  },

  obligations: [
    {
      title: 'A written denial stating the specific reason and the plan provision relied on',
      body: 'Not "does not meet criteria". The requirement that failed, in plain words, and the provision it comes from — generated from the decision record, so the two can never disagree.',
    },
    {
      title: 'Appeal rights, and somewhere for the appeal to go',
      body: 'A denial that cannot be appealed is not a denial the plan can defend. The appeal is received, tracked against a clock, and decided against the rule version that produced the original answer.',
    },
    {
      title: 'Continued coverage that expires and must be re-established on evidence',
      body: 'A determination with an end date, re-run when it reaches it. Lapsing quietly and continuing quietly are both defects.',
    },
    {
      title: 'The same answer for the same facts, every time',
      body: 'Two members with identical evidence get identical determinations, and either one replays to the same answer a year later.',
    },
  ],
}
