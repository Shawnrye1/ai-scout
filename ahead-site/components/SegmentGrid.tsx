import Link from 'next/link'
import { segments, hrefFor } from '@/content/segments'
import { segmentsSection } from '@/content/main'

export function SegmentGrid() {
  return (
    <section id={segmentsSection.id} className="on-paper section" aria-labelledby="segments-h">
      <div className="wrap">
        <p className="eyebrow">{segmentsSection.eyebrow}</p>
        <h2 id="segments-h" className="h2" style={{ marginTop: 12, maxWidth: '22ch' }}>
          {segmentsSection.heading}
        </h2>
        <p className="lede" style={{ marginTop: 16, maxWidth: '62ch', color: 'var(--color-muted)' }}>
          {segmentsSection.lede}
        </p>

        <div className="grid-auto-280" style={{ marginTop: 32 }}>
          {segments.map((s) => (
            <Link key={s.slug} href={hrefFor(s.slug)} className="segment-card">
              <span className="h3" style={{ fontSize: 23 }}>
                {s.name}
              </span>
              <span className="small" style={{ color: 'var(--color-muted)' }}>
                {s.governedBy}
              </span>
              <span style={{ fontSize: 15.5, lineHeight: 1.5, flex: 1 }}>{s.determines}</span>
              <span className="link-teal">See how it works &rarr;</span>
            </Link>
          ))}
        </div>

        <p
          style={{
            color: 'var(--color-teal)',
            fontFamily: 'var(--font-serif)',
            fontSize: 19,
            lineHeight: 1.5,
            marginTop: 30,
            maxWidth: '66ch',
          }}
        >
          {segmentsSection.constant}
        </p>
      </div>
    </section>
  )
}
