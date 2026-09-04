import Link from 'next/link'
import { segments, hrefFor } from '@/content/segments'
import { site, secondaryNav } from '@/content/site'

export function SiteFooter() {
  return (
    <footer className="on-ink section" style={{ paddingTop: 54, paddingBottom: 54 }}>
      <div className="wrap">
        <div className="grid-auto">
          <div>
            <p className="wordmark" style={{ display: 'block' }}>
              {site.name}
            </p>
            <p className="lede" style={{ marginTop: 10, maxWidth: '34ch' }}>
              {site.tagline}
            </p>
          </div>

          <nav aria-label="Who it’s for">
            <p className="eyebrow eyebrow-on-ink">Who it&rsquo;s for</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0' }}>
              {segments.map((s) => (
                <li key={s.slug} style={{ marginBottom: 7 }}>
                  <Link href={hrefFor(s.slug)} className="nav-link">
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Sections">
            <p className="eyebrow eyebrow-on-ink">The product</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0' }}>
              {secondaryNav.map((l) => (
                <li key={l.href} style={{ marginBottom: 7 }}>
                  <Link href={l.href} className="nav-link">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="eyebrow eyebrow-on-ink">Contact</p>
            <p style={{ margin: '12px 0 0' }}>
              <a href={`mailto:${site.contactEmail}`} className="nav-link">
                {site.contactEmail}
              </a>
            </p>
          </div>
        </div>

        <hr className="hairline-on-ink" style={{ margin: '34px 0 18px' }} />

        {/* The banking partner is named once, here, as infrastructure. */}
        <p className="small" style={{ color: 'var(--color-on-ink-muted)', margin: 0 }}>
          {site.footerInfrastructure}
        </p>
        <p className="small" style={{ color: 'var(--color-on-ink-muted)', marginTop: 8 }}>
          Ahead is the company. Ahead OS is the platform.
        </p>
      </div>
    </footer>
  )
}
