/**
 * Hero data — a health plan member's day.
 *
 * The mechanic is unchanged from the manufacturer-travel version: seven beats,
 * time chips, a 620ms pending pulse, a deterministic latency, editable rule
 * numbers that increment the rule version and recompute every decision. Only the
 * data changed, so the demo lands in the market the company is entering.
 */

export type FundKey = 'food' | 'utilities' | 'transport' | 'otc'

export type Fund = {
  key: FundKey
  name: string
  /** Cents. Money is integer cents; there is no float here either. */
  allowanceCents: number
  period: 'per month' | 'per quarter'
  covers: string
  /** True when the amount is set by an editable rule in the panel. */
  editable?: boolean
}

export type Beat = {
  time: string
  /** Null for the beats that are not a purchase. */
  merchant: string | null
  amountCents: number | null
  fund: FundKey | null
  /** The specific thing bought — a refusal names the item, not the category. */
  item: string | null
  /** Why an approval was correct. Refusal reasons are generated, so they can never
   *  contradict the balance shown beside them. */
  approvalReason?: string
  /** Whether the item itself is on the program's approved product list. */
  onList: boolean
  /** Shown when there is no transaction at this beat. */
  note?: string
}

export const sponsorName = 'Northline Health Plan'
export const memberName = 'Dana'

export const funds: Fund[] = [
  {
    key: 'food',
    name: 'Healthy Food',
    allowanceCents: 15000,
    period: 'per month',
    covers: 'Produce, staples and approved grocery items',
    editable: true,
  },
  {
    key: 'utilities',
    name: 'Utilities',
    allowanceCents: 7500,
    period: 'per month',
    covers: 'Electricity, gas, water and heat',
  },
  {
    key: 'transport',
    name: 'Transportation',
    allowanceCents: 6000,
    period: 'per month',
    covers: 'Non-medical transport to plan-approved destinations',
  },
  {
    key: 'otc',
    name: 'Over-the-counter',
    allowanceCents: 4000,
    period: 'per quarter',
    covers: 'Approved OTC health items by NDC',
    editable: true,
  },
]

export const beats: Beat[] = [
  {
    time: '07:10',
    merchant: null,
    amountCents: null,
    fund: null,
    item: null,
    onList: true,
    note: 'Dana leaves home. The funds opened the day the determination was made.',
  },
  {
    time: '08:40',
    merchant: 'Metro Transit',
    amountCents: 275,
    fund: 'transport',
    item: 'Bus fare',
    onList: true,
    approvalReason: 'Plan-approved destination, within the monthly transportation amount.',
  },
  {
    time: '11:05',
    merchant: 'Fair Market Grocers',
    amountCents: 3820,
    fund: 'food',
    item: 'Produce and staples',
    onList: true,
    approvalReason: 'Produce and staples are on the approved product list.',
  },
  {
    time: '13:20',
    merchant: 'Fair Market Grocers',
    amountCents: 640,
    fund: 'food',
    item: 'Energy drink',
    onList: false,
  },
  {
    time: '15:55',
    merchant: 'City Power & Light',
    amountCents: 7500,
    fund: 'utilities',
    item: 'Monthly electricity bill',
    onList: true,
    approvalReason: 'Enrolled utility account, within the monthly utility support amount.',
  },
  {
    time: '18:30',
    merchant: 'Corner Pharmacy',
    amountCents: 1400,
    fund: 'otc',
    item: 'Blood pressure monitor cuff',
    onList: true,
    approvalReason: 'NDC is on the approved over-the-counter list.',
  },
  {
    time: 'Next day',
    merchant: null,
    amountCents: null,
    fund: null,
    item: null,
    onList: true,
    note: 'Nothing to file. Every decision from yesterday is already on the record.',
  },
]

export const heroCopy = {
  eyebrow: 'A member’s day, decided at the register',
  h1: 'Your criteria, running as rules. Every purchase decided, every refusal recorded.',
  lede: `${sponsorName} wrote the criteria. Ahead OS determined who qualifies, opened the funds the determination allows, and decides each purchase where it happens — in a fraction of a second, with the reason and the rule version on both answers.`,
} as const

/** The plan's own criteria language, quoted as written. */
export const criteriaDocument = {
  source: `${sponsorName} — supplemental benefit eligibility criteria, plan year 2027`,
  text: 'Members with a documented qualifying chronic condition, at high risk of hospitalization, requiring intensive care coordination, receive a monthly healthy food allowance of $150, a monthly utility support amount of $75, and non-medical transportation to plan-approved destinations.',
  /** The three prongs a plan must actually establish — showing all three is the point. */
  highlights: [
    'documented qualifying chronic condition',
    'high risk of hospitalization',
    'intensive care coordination',
  ],
  prongs: [
    {
      phrase: 'documented qualifying chronic condition',
      title: 'Prong one — the condition, documented',
      body: 'Evidence from claims history, a health risk assessment or a clinician attestation, at the strength your written criteria require. Self-attestation alone does not satisfy it.',
    },
    {
      phrase: 'high risk of hospitalization',
      title: 'Prong two — risk of an adverse outcome',
      body: 'Inpatient and emergency utilization over a lookback your criteria define, or a risk score your criteria name. The rule records which evidence satisfied it.',
    },
    {
      phrase: 'intensive care coordination',
      title: 'Prong three — the need for coordination',
      body: 'Established from the care model the member is enrolled in, or from an attestation reviewed against your criteria. All three prongs must hold; the condition alone is not sufficient.',
    },
  ],
} as const
