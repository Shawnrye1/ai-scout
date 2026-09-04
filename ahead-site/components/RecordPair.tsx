import type { RecordCard } from '@/content/types'

function Card({ card }: { card: RecordCard }) {
  return (
    <article className="record-card" data-outcome={card.outcome}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span className={card.outcome === 'approved' ? 'tag-approve' : 'tag-decline'}>
          {card.outcome === 'approved' ? 'Approved' : 'Declined'}
        </span>
        <span className="tnum" style={{ fontWeight: 500 }}>
          {card.amount}
        </span>
      </div>

      <p className="h3" style={{ marginTop: 14 }}>
        {card.title}
      </p>
      <p className="small" style={{ margin: '4px 0 0', color: 'var(--color-muted)' }}>
        {card.fund}
      </p>

      <p style={{ marginTop: 14, fontSize: 15.5, lineHeight: 1.55 }}>{card.reason}</p>

      <hr className="hairline" style={{ margin: '16px 0' }} />

      <dl className="record-dl">
        {card.detail.map((d) => (
          <div key={d.label} style={{ display: 'contents' }}>
            <dt>{d.label}</dt>
            <dd>{d.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}

/**
 * Two records, identical in every label. The refusal is a peer of the approval —
 * same detail, same rule version, same latency stamp.
 */
export function RecordPair({
  approved,
  declined,
}: {
  approved: RecordCard
  declined: RecordCard
}) {
  return (
    <div className="grid-auto" style={{ marginTop: 30, gap: 20 }}>
      <Card card={approved} />
      <Card card={declined} />
    </div>
  )
}
