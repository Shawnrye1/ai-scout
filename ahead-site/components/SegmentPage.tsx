import { UnderTheHood } from '@/components/UnderTheHood'
import { RecordPair } from '@/components/RecordPair'
import { CloseSection } from '@/components/CloseSection'
import { site } from '@/content/site'
import type { Segment } from '@/content/types'

/**
 * One layout, six sections, driven entirely by the content module for the slug.
 * A fifth segment is a content module and a route folder — never another page
 * component.
 */
export function SegmentPage({ segment }: { segment: Segment }) {
  return (
    <>
      {/* 1 — hero */}
      <section className="on-ink section" aria-labelledby="seg-h1">
        <div className="wrap">
          <div className="seg-hero-grid">
            <div>
              <p className="eyebrow eyebrow-on-ink">{segment.hero.eyebrow}</p>
              <h1 id="seg-h1" className="h1" style={{ marginTop: 14, maxWidth: '19ch' }}>
                {segment.hero.h1}
              </h1>
              <p className="lede" style={{ marginTop: 18, maxWidth: '58ch' }}>
                {segment.hero.lede}
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 26 }}>
                <a href={`mailto:${site.contactEmail}`} className="btn btn-amber">
                  {site.cta.primary}
                </a>
                <a href="#seg-record" className="btn btn-outline-on-ink">
                  {site.cta.secondary}
                </a>
              </div>
            </div>

            <dl className="seg-hero-facts">
              <dt className="eyebrow eyebrow-on-ink">Governed by</dt>
              <dd>{segment.governedBy}</dd>
              <dt className="eyebrow eyebrow-on-ink">What the determination establishes</dt>
              <dd>{segment.determines}</dd>
              <dt className="eyebrow eyebrow-on-ink">The constant</dt>
              <dd>Determine, fund, restrict, record.</dd>
            </dl>
          </div>
        </div>
      </section>

      {/* 2 — decided by hand today */}
      <section className="on-paper section" aria-labelledby="seg-today">
        <div className="wrap">
          <p className="eyebrow">Today</p>
          <h2 id="seg-today" className="h2" style={{ marginTop: 12, maxWidth: '22ch' }}>
            What is decided by hand today
          </h2>
          <div className="grid-auto" style={{ marginTop: 32 }}>
            {segment.byHandToday.map((b) => (
              <div key={b.title} className="card">
                <p className="h3" style={{ fontSize: 21 }}>
                  {b.title}
                </p>
                <p style={{ marginTop: 10, fontSize: 15.5, lineHeight: 1.55, color: 'var(--color-muted)' }}>
                  {b.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — the criteria, as written */}
      <UnderTheHood
        id="seg-criteria"
        eyebrow="The criteria, as written"
        heading="Your document is the input. The rules are drafted from it, clause by clause."
        lede="A person approves every rule before it can decide anything. A model may draft; it never determines."
        source={`${segment.name} — eligibility criteria`}
        document={segment.criteria.document}
        highlights={segment.criteria.highlights}
        rules={segment.criteria.rules}
      />

      {/* 4 — what opens, and what is refused */}
      <section id="seg-record" className="on-white section" aria-labelledby="seg-record-h">
        <div className="wrap">
          <p className="eyebrow">The record</p>
          <h2 id="seg-record-h" className="h2" style={{ marginTop: 12, maxWidth: '22ch' }}>
            What opens, and what is refused
          </h2>
          <p className="lede" style={{ marginTop: 16, maxWidth: '64ch', color: 'var(--color-muted)' }}>
            Identical detail on both answers, both stamped with the rule version that produced
            them. The refusal is the half most programs cannot produce a year later.
          </p>
          <RecordPair approved={segment.record.approved} declined={segment.record.declined} />
        </div>
      </section>

      {/* 5 — what this segment specifically requires */}
      <section className="on-paper section" aria-labelledby="seg-obligations">
        <div className="wrap">
          <p className="eyebrow">Obligations</p>
          <h2 id="seg-obligations" className="h2" style={{ marginTop: 12, maxWidth: '24ch' }}>
            What {segment.name.toLowerCase()} specifically require
          </h2>
          <div className="grid-auto" style={{ marginTop: 32 }}>
            {segment.obligations.map((o) => (
              <div key={o.title} className="card">
                <p className="h3" style={{ fontSize: 21 }}>
                  {o.title}
                </p>
                <p style={{ marginTop: 10, fontSize: 15.5, lineHeight: 1.55, color: 'var(--color-muted)' }}>
                  {o.body}
                </p>
              </div>
            ))}
          </div>
          {segment.note && (
            <p className="small" style={{ marginTop: 22, color: 'var(--color-teal)' }}>
              {segment.note}
            </p>
          )}
        </div>
      </section>

      {/* 6 — close */}
      <CloseSection />
    </>
  )
}
