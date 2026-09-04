import { journey } from '@/content/journey'

/**
 * Static by design. The hero already owns the interaction budget on this page.
 * Physical cards are deliberately not mentioned — the point of this section is
 * that the money is usable before anything arrives in the post.
 */
export function PatientJourney() {
  return (
    <section id={journey.id} className="on-paper section" aria-labelledby="journey-h">
      <div className="wrap">
        <h2 id="journey-h" className="h2" style={{ maxWidth: '20ch' }}>
          {journey.heading}
        </h2>
        <p className="lede" style={{ marginTop: 16, maxWidth: '64ch', color: 'var(--color-muted)' }}>
          {journey.lede}
        </p>

        <ol className="journey-band" style={{ listStyle: 'none', padding: 0 }}>
          {journey.steps.map((s) => (
            <li key={s.eyebrow} className="journey-step">
              <p className="eyebrow">{s.eyebrow}</p>
              <p className="h3" style={{ marginTop: 10, fontSize: 20 }}>
                {s.title}
              </p>
              <p className="small" style={{ marginTop: 8, color: 'var(--color-muted)' }}>
                {s.body}
              </p>
            </li>
          ))}
        </ol>

        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 18,
            lineHeight: 1.5,
            marginTop: 30,
          }}
        >
          {journey.caregiver}
        </p>
      </div>
    </section>
  )
}
