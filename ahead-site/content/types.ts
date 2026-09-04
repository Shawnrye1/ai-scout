/**
 * Content shapes. All site copy lives in `content/`, never inline in JSX, so it
 * can be edited without touching layout.
 */

export type SegmentSlug = 'health-plans' | 'employers' | 'manufacturers' | 'foundations'

export type RecordCard = {
  /** A refusal is a peer of an approval, never an error. */
  outcome: 'approved' | 'declined'
  /** What was decided — a purchase, a coverage request, a grant application. */
  title: string
  amount: string
  fund: string
  /** Specific and never apologetic. */
  reason: string
  /** Identical labels on both cards. The rule version appears on both. */
  detail: { label: string; value: string }[]
}

export type Block = { title: string; body: string }

export type Segment = {
  slug: SegmentSlug
  name: string
  navGloss: string
  governedBy: string
  determines: string
  hero: { eyebrow: string; h1: string; lede: string }
  byHandToday: Block[]
  criteria: {
    document: string
    /** Money-carrying phrases, amber-underlined where they appear in `document`. */
    highlights: string[]
    rules: Block[]
  }
  record: { approved: RecordCard; declined: RecordCard }
  obligations: Block[]
  note?: string
}
