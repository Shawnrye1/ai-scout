import type { Beat, Fund, FundKey } from '@/content/hero'
import { usd, usdWhole } from '@/lib/money'

/**
 * The demo's decision engine.
 *
 * Pure: same beats + same allowances = same decisions, forever. No clock, no
 * randomness. The latency shown is derived from the amount, never generated —
 * a randomly generated latency would be a claim the product cannot make.
 */

export type Outcome = 'approved' | 'declined' | 'none'

export type Decision = {
  index: number
  time: string
  merchant: string | null
  item: string | null
  amountCents: number | null
  fund: FundKey | null
  fundName: string | null
  outcome: Outcome
  reason: string
  latencyMs: number | null
  /** Fund balance after this decision. */
  remainingCents: number | null
  note?: string
}

export function latencyFor(amountCents: number): number {
  return 236 + ((Math.round(amountCents / 100) * 37) % 184)
}

/**
 * Replays the whole day against a set of allowances. Every beat is recomputed
 * from the start, which is why editing a rule number changes decisions that
 * already happened on screen — as it would in a replay against a new rule
 * version.
 */
export function replayDay(beats: Beat[], funds: Fund[]): Decision[] {
  const allowance = new Map<FundKey, number>(funds.map((f) => [f.key, f.allowanceCents]))
  const meta = new Map<FundKey, Fund>(funds.map((f) => [f.key, f]))
  const remaining = new Map<FundKey, number>(allowance)

  return beats.map((beat, index) => {
    if (beat.merchant === null || beat.amountCents === null || beat.fund === null) {
      return {
        index,
        time: beat.time,
        merchant: null,
        item: null,
        amountCents: null,
        fund: null,
        fundName: null,
        outcome: 'none' as const,
        reason: '',
        latencyMs: null,
        remainingCents: null,
        note: beat.note,
      }
    }

    const fund = meta.get(beat.fund)!
    const left = remaining.get(beat.fund)!
    const latencyMs = latencyFor(beat.amountCents)

    // Order matters and is the product's whole argument: what the item is comes
    // before what is left, so a refusal never blames a balance that is fine.
    if (!beat.onList) {
      return {
        index,
        time: beat.time,
        merchant: beat.merchant,
        item: beat.item,
        amountCents: beat.amountCents,
        fund: beat.fund,
        fundName: fund.name,
        outcome: 'declined' as const,
        reason: `${beat.item} is not on the approved product list. ${usd(left)} of the ${fund.period === 'per month' ? 'monthly' : 'quarterly'} ${fund.name.toLowerCase()} allowance is still available.`,
        latencyMs,
        remainingCents: left,
      }
    }

    if (beat.amountCents > left) {
      const used = fund.allowanceCents - left
      return {
        index,
        time: beat.time,
        merchant: beat.merchant,
        item: beat.item,
        amountCents: beat.amountCents,
        fund: beat.fund,
        fundName: fund.name,
        outcome: 'declined' as const,
        reason: `${usd(used)} of the ${usdWhole(fund.allowanceCents)} ${fund.period === 'per month' ? 'monthly' : 'quarterly'} ${fund.name.toLowerCase()} allowance was already used. This purchase is ${usd(beat.amountCents)}.`,
        latencyMs,
        remainingCents: left,
      }
    }

    const after = left - beat.amountCents
    remaining.set(beat.fund, after)

    return {
      index,
      time: beat.time,
      merchant: beat.merchant,
      item: beat.item,
      amountCents: beat.amountCents,
      fund: beat.fund,
      fundName: fund.name,
      outcome: 'approved' as const,
      reason: beat.approvalReason ?? `${beat.item} is on the approved list for ${fund.name}.`,
      latencyMs,
      remainingCents: after,
    }
  })
}

/** Balance per fund after every beat up to and including `upTo`. */
export function balancesAfter(
  decisions: Decision[],
  funds: Fund[],
  upTo: number
): Map<FundKey, number> {
  const out = new Map<FundKey, number>(funds.map((f) => [f.key, f.allowanceCents]))
  for (const d of decisions.slice(0, upTo + 1)) {
    if (d.outcome === 'approved' && d.fund && d.remainingCents !== null) {
      out.set(d.fund, d.remainingCents)
    }
  }
  return out
}
