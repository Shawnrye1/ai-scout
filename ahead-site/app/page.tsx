import { HeroDemo } from '@/components/HeroDemo'
import { PatientJourney } from '@/components/PatientJourney'
import { SegmentGrid } from '@/components/SegmentGrid'
import { UnderTheHood } from '@/components/UnderTheHood'
import { RecordPair } from '@/components/RecordPair'
import { CloseSection } from '@/components/CloseSection'
import { criteriaDocument } from '@/content/hero'
import { controls, platform, record } from '@/content/main'
import { healthPlans } from '@/content/segments/health-plans'

export default function HomePage() {
  return (
    <>
      <HeroDemo />

      {/* Directly after the hero, before "The same day, on the record". */}
      <PatientJourney />

      <section id={record.id} className="on-white section" aria-labelledby="record-h">
        <div className="wrap">
          <p className="eyebrow">{record.eyebrow}</p>
          <h2 id="record-h" className="h2" style={{ marginTop: 12, maxWidth: '20ch' }}>
            {record.heading}
          </h2>
          <p className="lede" style={{ marginTop: 16, maxWidth: '64ch', color: 'var(--color-muted)' }}>
            {record.lede}
          </p>

          <RecordPair approved={healthPlans.record.approved} declined={healthPlans.record.declined} />

          <div className="grid-auto-280" style={{ marginTop: 34 }}>
            {record.stats.map((s) => (
              <div key={s.label}>
                <p className="stat-value">{s.value}</p>
                <p className="small" style={{ color: 'var(--color-muted)', marginTop: 4 }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
          <p className="small" style={{ color: 'var(--color-muted)', marginTop: 16 }}>
            {record.statsProvenance}
          </p>
        </div>
      </section>

      <SegmentGrid />

      <UnderTheHood
        eyebrow="Under the hood"
        heading="The criteria are already written. That document is the input."
        lede="A person approves every rule before it can decide anything. A model may draft; it never determines."
        source={criteriaDocument.source}
        document={criteriaDocument.text}
        highlights={[...criteriaDocument.highlights]}
        rules={criteriaDocument.prongs.map((p) => ({ title: p.title, body: p.body }))}
      />

      <section id={controls.id} className="on-white section" aria-labelledby="controls-h">
        <div className="wrap">
          <p className="eyebrow">{controls.eyebrow}</p>
          <h2 id="controls-h" className="h2" style={{ marginTop: 12, maxWidth: '22ch' }}>
            {controls.heading}
          </h2>
          <p className="lede" style={{ marginTop: 16, maxWidth: '64ch', color: 'var(--color-muted)' }}>
            {controls.lede}
          </p>

          <div className="grid-auto" style={{ marginTop: 32 }}>
            {controls.columns.map((c) => (
              <div key={c.title} className="card">
                <p className="h3">{c.title}</p>
                <p style={{ marginTop: 12, fontSize: 15.5, lineHeight: 1.55 }}>{c.body}</p>
                <hr className="hairline" style={{ margin: '16px 0' }} />
                <p className="small" style={{ color: 'var(--color-teal)', margin: 0 }}>
                  {c.foot}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id={platform.id} className="on-paper section" aria-labelledby="platform-h">
        <div className="wrap">
          <p className="eyebrow">{platform.eyebrow}</p>
          <h2 id="platform-h" className="h2" style={{ marginTop: 12, maxWidth: '24ch' }}>
            {platform.heading}
          </h2>
          <p className="lede" style={{ marginTop: 16, maxWidth: '64ch', color: 'var(--color-muted)' }}>
            {platform.lede}
          </p>

          <div className="grid-auto" style={{ marginTop: 32 }}>
            {platform.is.map((b) => (
              <div key={b.title} className="card">
                <p className="h3">{b.title}</p>
                <p style={{ marginTop: 12, fontSize: 15.5, lineHeight: 1.55 }}>{b.body}</p>
              </div>
            ))}
          </div>

          <hr className="hairline" style={{ margin: '34px 0 22px' }} />

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            {platform.isNot.map((line) => (
              <li key={line} className="small" style={{ color: 'var(--color-muted)' }}>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CloseSection />
    </>
  )
}
