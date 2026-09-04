'use client'

import { useMemo, useState } from 'react'
import type { Block } from '@/content/types'

type Props = {
  id?: string
  eyebrow: string
  heading: string
  lede?: string
  source: string
  /** The funder's own language, quoted as written. */
  document: string
  /** Money-carrying phrases, in the order they appear in `document`. */
  highlights: string[]
  /** Drafted from the document. Highlight i selects rule i. */
  rules: Block[]
}

type Part = { text: string; phraseIndex: number | null }

/** Splits the quoted document around its money-carrying phrases. */
function split(document: string, highlights: string[]): Part[] {
  const parts: Part[] = []
  let rest = document
  let cursor = 0

  while (cursor < highlights.length) {
    const phrase = highlights[cursor]
    const at = rest.indexOf(phrase)
    if (at === -1) {
      cursor += 1
      continue
    }
    if (at > 0) parts.push({ text: rest.slice(0, at), phraseIndex: null })
    parts.push({ text: phrase, phraseIndex: cursor })
    rest = rest.slice(at + phrase.length)
    cursor += 1
  }
  if (rest) parts.push({ text: rest, phraseIndex: null })
  return parts
}

export function UnderTheHood({
  id = 'under-the-hood',
  eyebrow,
  heading,
  lede,
  source,
  document,
  highlights,
  rules,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const parts = useMemo(() => split(document, highlights), [document, highlights])

  return (
    <section id={id} className="on-ink section" aria-labelledby={`${id}-h`}>
      <div className="wrap">
        <p className="eyebrow eyebrow-on-ink">{eyebrow}</p>
        <h2 id={`${id}-h`} className="h2" style={{ marginTop: 12, maxWidth: '22ch' }}>
          {heading}
        </h2>
        {lede && (
          <p className="lede" style={{ marginTop: 16, maxWidth: '62ch' }}>
            {lede}
          </p>
        )}

        <div className="hood-grid">
          {/* The document, on paper, in serif — as written. */}
          <figure style={{ margin: 0 }}>
            <blockquote className="doc-quote as-written">
              {parts.map((p, i) =>
                p.phraseIndex === null ? (
                  <span key={i}>{p.text}</span>
                ) : (
                  // A span rather than a button: a phrase inside a quoted
                  // sentence has to wrap across lines, and a button will not.
                  <span
                    key={i}
                    role="button"
                    tabIndex={0}
                    className="phrase"
                    aria-pressed={selected === p.phraseIndex}
                    onClick={() =>
                      setSelected((s) => (s === p.phraseIndex ? null : p.phraseIndex))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelected((s) => (s === p.phraseIndex ? null : p.phraseIndex))
                      }
                    }}
                  >
                    {p.text}
                  </span>
                )
              )}
            </blockquote>
            <figcaption className="small" style={{ color: 'var(--color-on-ink-muted)', marginTop: 10 }}>
              {source} — quoted as written. Select an underlined phrase to see the rule drafted
              from it.
            </figcaption>
          </figure>

          {/* What the system made of it, in sans. */}
          <div>
            <p className="eyebrow eyebrow-on-ink">Drafted as rules, approved by a person</p>
            <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
              {rules.map((r, i) => (
                <div
                  key={r.title}
                  className="card-on-ink rule-card"
                  data-selected={selected === i}
                >
                  <p style={{ margin: 0, fontWeight: 500 }}>{r.title}</p>
                  <p className="small" style={{ margin: '7px 0 0', color: 'var(--color-on-ink)' }}>
                    {r.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
