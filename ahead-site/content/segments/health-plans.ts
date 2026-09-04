import type { Segment } from '@/content/types'

export const healthPlans: Segment = {
  slug: 'health-plans',
  name: 'Health plans',
  navGloss: 'Chronic-condition and supplemental benefit eligibility',
  governedBy: 'CMS supplemental benefit rules',
  determines:
    'A documented qualifying condition, risk of hospitalization, and need for care coordination',

  hero: {
    eyebrow: 'Health plans',
    h1: 'Your criteria are written. A nurse is still reading them, one member at a time.',
    lede: "Ahead OS turns your plan's own eligibility criteria into versioned rules, determines every member against them, and documents the members who do not qualify as carefully as the ones who do.",
  },

  byHandToday: [
    {
      title: 'An internal claims query that refreshes weekly',
      body: 'Someone maintains it, someone reruns it, and the list it produces is a week old on the day it is used. Nothing in it records why a given member was on it.',
    },
    {
      title: 'A provider attestation form, and a fax fallback',
      body: 'The clinician confirms the prongs on paper. The form arrives, or it does not, and the follow-up is a person with a spreadsheet.',
    },
    {
      title: 'A clinical reviewer applying criteria case by case',
      body: 'Two reviewers reading the same criteria against the same facts do not always reach the same answer, and the criteria that produced either answer are not attached to it.',
    },
    {
      title: 'An approval or denial letter inside ten business days',
      body: 'By the time it arrives the member has already gone without, and the reason in the letter is a paraphrase of a document nobody versioned.',
    },
  ],

  criteria: {
    document:
      'Members with a documented qualifying chronic condition, at high risk of hospitalization, requiring intensive care coordination, receive a monthly healthy food allowance of $150, a monthly utility support amount of $75, and non-medical transportation to plan-approved destinations.',
    highlights: [
      'documented qualifying chronic condition',
      'high risk of hospitalization',
      'intensive care coordination',
    ],
    rules: [
      {
        title: 'Prong one — a documented qualifying chronic condition',
        body: 'Satisfied by claims history, a health risk assessment or a clinician attestation, at the strength your criteria name. The rule records which source satisfied it. Self-attestation alone does not.',
      },
      {
        title: 'Prong two — high risk of hospitalization',
        body: 'Inpatient and emergency utilization over the lookback your criteria define, or a risk score your criteria name. Evaluated against the same evidence for every member.',
      },
      {
        title: 'Prong three — requires intensive care coordination',
        body: 'Established from the care model the member is enrolled in, or from a reviewed attestation. All three prongs must hold — the condition alone is not sufficient.',
      },
      {
        title: 'The funds the determination opens',
        body: '$150 monthly healthy food, $75 monthly utility support, and non-medical transportation to plan-approved destinations. Each fund carries its own approved list, cap and period.',
      },
    ],
  },

  record: {
    approved: {
      outcome: 'approved',
      title: 'Fair Market Grocers · produce and staples',
      amount: '$38.20',
      fund: 'Healthy Food',
      reason: 'Produce and staples are on the approved product list. $111.80 remains this month.',
      detail: [
        { label: 'Member', value: 'MBR-40118' },
        { label: 'Determination', value: 'DET-2027-004411 · three prongs established' },
        { label: 'Acted', value: 'Member' },
        { label: 'Rule version', value: 'v1.4.0' },
        { label: 'Decision latency', value: '287 ms' },
        { label: 'Recorded', value: '11:05:14 UTC−05:00' },
      ],
    },
    declined: {
      outcome: 'declined',
      title: 'Fair Market Grocers · energy drink',
      amount: '$6.40',
      fund: 'Healthy Food',
      reason:
        'Energy drink is not on the approved product list. $111.80 of the monthly healthy food allowance is still available.',
      detail: [
        { label: 'Member', value: 'MBR-40118' },
        { label: 'Determination', value: 'DET-2027-004411 · three prongs established' },
        { label: 'Acted', value: 'Member' },
        { label: 'Rule version', value: 'v1.4.0' },
        { label: 'Decision latency', value: '458 ms' },
        { label: 'Recorded', value: '13:20:02 UTC−05:00' },
      ],
    },
  },

  obligations: [
    {
      title: 'Written, objective criteria for every benefit',
      body: 'Not a description of intent — the criteria a determination is actually made against, in a form a reviewer can read and a rule can execute.',
    },
    {
      title: 'A documented determination for enrollees deemed ineligible',
      body: 'Not only for the members who qualify. The refusal carries the same record, the same reason detail and the same rule version, retrievable on request.',
    },
    {
      title: 'An evidence bibliography per benefit',
      body: 'High-quality clinical literature published within ten years, attached to the rule it supports — a first-class object linking rule to citation and publication date, not a folder of PDFs.',
    },
    {
      title: 'Criteria published on a public-facing page',
      body: 'Generated from the rule version actually running, so the page and the engine can never drift apart.',
    },
    {
      title: 'Determinations that reconcile to the approved bid',
      body: 'Supplemental benefit encounter data with the correct service category codes, tying back to the determination record that authorized the spend.',
    },
  ],

  note: 'Self-attestation alone does not establish eligibility.',
}
