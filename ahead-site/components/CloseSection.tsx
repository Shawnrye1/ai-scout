import { close } from '@/content/main'

export function CloseSection({
  heading = close.heading,
  lede = close.lede,
}: {
  heading?: string
  lede?: string
}) {
  return (
    <section className="on-ink section" aria-labelledby="close-h">
      <div className="wrap">
        <p className="eyebrow eyebrow-on-ink">{close.eyebrow}</p>
        <h2 id="close-h" className="h2" style={{ marginTop: 12, maxWidth: '20ch' }}>
          {heading}
        </h2>
        <p className="lede" style={{ marginTop: 16, maxWidth: '60ch' }}>
          {lede}
        </p>

        <div className="grid-auto" style={{ marginTop: 34 }}>
          {close.asks.map((a) => (
            <div key={a.title} className="card-on-ink">
              <p style={{ margin: 0, fontWeight: 500 }}>{a.title}</p>
              <p className="small" style={{ margin: '8px 0 0', color: 'var(--color-on-ink)' }}>
                {a.body}
              </p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 30 }}>
          <a href={`mailto:${close.email}`} className="btn btn-amber">
            {close.email}
          </a>
        </div>
      </div>
    </section>
  )
}
