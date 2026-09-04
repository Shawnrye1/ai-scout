'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  beats,
  funds as baseFunds,
  heroCopy,
  memberName,
  sponsorName,
  type Fund,
  type FundKey,
} from '@/content/hero'
import { balancesAfter, replayDay } from '@/lib/decide'
import { usd, usdWhole } from '@/lib/money'
import { site } from '@/content/site'

const PENDING_MS = 620
const BEAT_MS = 2200
type Tab = 'funds' | 'activity' | 'card'

export function HeroDemo() {
  // The two numbers a visitor can change. Amber marks exactly one thing per
  // view, and on this view it is these.
  const [foodCents, setFoodCents] = useState(15000)
  const [otcCents, setOtcCents] = useState(4000)
  const [edits, setEdits] = useState(0)

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [pending, setPending] = useState(false)
  const [tab, setTab] = useState<Tab>('funds')
  const [reducedMotion, setReducedMotion] = useState(false)
  const [flashKey, setFlashKey] = useState(0)

  const scrollRef = useRef<HTMLDivElement>(null)
  const lastBeat = beats.length - 1

  const funds: Fund[] = useMemo(
    () =>
      baseFunds.map((f) =>
        f.key === 'food'
          ? { ...f, allowanceCents: foodCents }
          : f.key === 'otc'
            ? { ...f, allowanceCents: otcCents }
            : f
      ),
    [foodCents, otcCents]
  )

  /** Every decision, recomputed from the start on every rule change. */
  const decisions = useMemo(() => replayDay(beats, funds), [funds])
  const balances = useMemo(
    () => balancesAfter(decisions, funds, pending ? index - 1 : index),
    [decisions, funds, index, pending]
  )

  const ruleVersion = `v1.4.${edits}`

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // No autoplay under reduced motion — the whole day is shown at rest instead.
  useEffect(() => {
    if (reducedMotion) {
      setPlaying(false)
      setPending(false)
      setIndex(lastBeat)
    } else {
      setPlaying(true)
    }
  }, [reducedMotion, lastBeat])

  // Advance.
  useEffect(() => {
    if (!playing || reducedMotion) return
    if (index >= lastBeat) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => goTo(index + 1), BEAT_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, index, reducedMotion, lastBeat])

  // The pending pulse, then the decision settles.
  useEffect(() => {
    if (!pending) return
    const t = setTimeout(() => {
      setPending(false)
      setFlashKey((k) => k + 1)
    }, PENDING_MS)
    return () => clearTimeout(t)
  }, [pending])

  function goTo(next: number) {
    const isPurchase = decisions[next]?.outcome !== 'none'
    setIndex(next)
    setPending(!reducedMotion && isPurchase)
    if (isPurchase) setTab('activity')
  }

  function onEdit(which: 'food' | 'otc', dollars: number) {
    const cents = Math.max(0, Math.round(dollars * 100))
    if (which === 'food') setFoodCents(cents)
    else setOtcCents(cents)
    // Editing a rule makes a new version, and the new version replays the day.
    setEdits((n) => n + 1)
    setPending(false)
  }

  const visible = decisions.slice(0, index + 1)
  const current = decisions[index]
  const settledCurrent = pending ? null : current

  return (
    <section className="on-ink section" aria-labelledby="hero-h1">
      <div className="wrap">
        <div className="hero-grid">
          {/* ------------------------------------------------ left: the day */}
          <div>
            <p className="eyebrow eyebrow-on-ink">{heroCopy.eyebrow}</p>
            <h1 id="hero-h1" className="h1" style={{ marginTop: 14, maxWidth: '17ch' }}>
              {heroCopy.h1}
            </h1>
            <p className="lede" style={{ marginTop: 18, maxWidth: '56ch' }}>
              {heroCopy.lede}
            </p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
              <a href={`mailto:${site.contactEmail}`} className="btn btn-amber">
                {site.cta.primary}
              </a>
              <a href="#the-record" className="btn btn-outline-on-ink">
                {site.cta.secondary}
              </a>
            </div>

            <hr className="hairline-on-ink" style={{ margin: '30px 0 20px' }} />

            {/* Timeline */}
            <div className="scroll-x">
              <div className="timeline" role="group" aria-label="The day, beat by beat">
                {decisions.map((d, i) => (
                  <button
                    key={d.time}
                    type="button"
                    className="time-chip"
                    aria-current={i === index}
                    data-past={i < index}
                    onClick={() => {
                      setPlaying(false)
                      goTo(i)
                    }}
                  >
                    {d.time}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline-on-ink"
                onClick={() => {
                  if (index >= lastBeat) {
                    goTo(0)
                    setPlaying(true)
                  } else {
                    setPlaying((p) => !p)
                  }
                }}
              >
                {index >= lastBeat ? 'Replay the day' : playing ? 'Pause' : 'Play'}
              </button>
              <button
                type="button"
                className="btn btn-outline-on-ink"
                onClick={() => {
                  setPlaying(false)
                  goTo(0)
                }}
              >
                Back to the start
              </button>
            </div>

            {/* Rules panel */}
            <div className="card-on-ink" style={{ marginTop: 26 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'baseline',
                  flexWrap: 'wrap',
                }}
              >
                <p className="eyebrow eyebrow-on-ink">The rules running this day</p>
                <p className="small tnum" style={{ color: 'var(--color-on-ink-muted)', margin: 0 }}>
                  Rule version <strong style={{ color: '#fff' }}>{ruleVersion}</strong>
                </p>
              </div>

              <div className="rules-grid" style={{ marginTop: 16 }}>
                <label className="rule-field">
                  <span className="small" style={{ color: 'var(--color-on-ink)' }}>
                    Monthly healthy food allowance
                  </span>
                  <span className="rule-input-row">
                    <span aria-hidden="true" style={{ color: 'var(--color-on-ink-muted)' }}>
                      $
                    </span>
                    <input
                      className="num-input"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={5}
                      value={foodCents / 100}
                      onChange={(e) => onEdit('food', Number(e.target.value))}
                    />
                  </span>
                </label>

                <label className="rule-field">
                  <span className="small" style={{ color: 'var(--color-on-ink)' }}>
                    Over-the-counter quarterly cap
                  </span>
                  <span className="rule-input-row">
                    <span aria-hidden="true" style={{ color: 'var(--color-on-ink-muted)' }}>
                      $
                    </span>
                    <input
                      className="num-input"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={5}
                      value={otcCents / 100}
                      onChange={(e) => onEdit('otc', Number(e.target.value))}
                    />
                  </span>
                </label>
              </div>

              <p className="small" style={{ color: 'var(--color-on-ink-muted)', marginTop: 14 }}>
                Change either number and the version increments, the whole day replays against
                it, and the decisions above change with it. Same inputs and same version, same
                answers — forever.
              </p>
            </div>
          </div>

          {/* --------------------------------------------- right: the phone */}
          <div className="hero-phone-col">
            <div className="phone">
              <div className="phone-screen">
                <div className="phone-head">
                  <p className="small" style={{ margin: 0, color: 'var(--color-muted)' }}>
                    {sponsorName}
                  </p>
                  <p style={{ margin: '2px 0 0', fontWeight: 500 }}>{memberName}</p>
                </div>

                <div className="phone-tabs" role="tablist" aria-label="Member view">
                  {(['funds', 'activity', 'card'] as Tab[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="tab"
                      id={`tab-${t}`}
                      aria-selected={tab === t}
                      aria-controls={`panel-${t}`}
                      className="phone-tab"
                      onClick={() => setTab(t)}
                    >
                      {t === 'funds' ? 'Funds' : t === 'activity' ? 'Activity' : 'Card'}
                    </button>
                  ))}
                </div>

                <div className="phone-scroll" ref={scrollRef}>
                  {/* ----------------------------------------------- funds */}
                  <div
                    id="panel-funds"
                    role="tabpanel"
                    aria-labelledby="tab-funds"
                    hidden={tab !== 'funds'}
                    className="phone-body"
                  >
                    {funds.map((f) => {
                      const left = balances.get(f.key as FundKey) ?? f.allowanceCents
                      const touched = settledCurrent?.fund === f.key
                      return (
                        <div
                          key={`${f.key}-${touched ? flashKey : 'x'}`}
                          className={`fund-row${touched && !reducedMotion ? ' fund-flash' : ''}`}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 10,
                              alignItems: 'baseline',
                            }}
                          >
                            <span style={{ fontWeight: 500 }}>{f.name}</span>
                            <span className="tnum" style={{ fontWeight: 500 }}>
                              {usd(left)}
                            </span>
                          </div>
                          <p className="small" style={{ color: 'var(--color-muted)', margin: '3px 0 0' }}>
                            {f.covers}
                          </p>
                          <p className="small tnum" style={{ color: 'var(--color-muted)', margin: '2px 0 0' }}>
                            of {usdWhole(f.allowanceCents)} {f.period}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {/* -------------------------------------------- activity */}
                  <div
                    id="panel-activity"
                    role="tabpanel"
                    aria-labelledby="tab-activity"
                    hidden={tab !== 'activity'}
                    className="phone-body"
                  >
                    <div aria-live="polite">
                      {pending && current?.merchant && (
                        <div className="activity-row">
                          <div className="activity-top">
                            <span style={{ fontWeight: 500 }}>{current.merchant}</span>
                            <span className="tnum">{usd(current.amountCents ?? 0)}</span>
                          </div>
                          <p className="small pending-pulse" style={{ margin: '6px 0 0', color: 'var(--color-muted)' }}>
                            Deciding&hellip;
                          </p>
                        </div>
                      )}
                    </div>

                    {[...visible]
                      .reverse()
                      .filter((d) => !(pending && d.index === index))
                      .map((d) => (
                        <div key={d.index} className="activity-row">
                          {d.outcome === 'none' ? (
                            <>
                              <div className="activity-top">
                                <span className="small tnum" style={{ color: 'var(--color-muted)' }}>
                                  {d.time}
                                </span>
                              </div>
                              <p className="small" style={{ margin: '4px 0 0', color: 'var(--color-muted)' }}>
                                {d.note}
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="activity-top">
                                <span style={{ fontWeight: 500 }}>{d.merchant}</span>
                                <span className="tnum">{usd(d.amountCents ?? 0)}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                                <span className={d.outcome === 'approved' ? 'tag-approve' : 'tag-decline'}>
                                  {d.outcome === 'approved' ? 'Approved' : 'Declined'}
                                </span>
                                <span className="small tnum" style={{ color: 'var(--color-muted)' }}>
                                  {d.fundName} · {d.time} · {d.latencyMs} ms
                                </span>
                              </div>
                              <p className="small" style={{ margin: '7px 0 0' }}>
                                {d.reason}
                              </p>
                              <p className="small tnum" style={{ margin: '4px 0 0', color: 'var(--color-muted)' }}>
                                Rule version {ruleVersion}
                              </p>
                            </>
                          )}
                        </div>
                      ))}
                  </div>

                  {/* ------------------------------------------------ card */}
                  <div
                    id="panel-card"
                    role="tabpanel"
                    aria-labelledby="tab-card"
                    hidden={tab !== 'card'}
                    className="phone-body"
                  >
                    <div className="virtual-card">
                      <p className="small" style={{ margin: 0, color: 'var(--color-on-ink-muted)' }}>
                        {sponsorName}
                      </p>
                      <p className="tnum" style={{ margin: '18px 0 0', fontSize: 17, letterSpacing: '0.08em' }}>
                        •••• •••• •••• 4118
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                        <span className="small">{memberName}</span>
                        <span className="small">Virtual</span>
                      </div>
                    </div>

                    <p className="small" style={{ marginTop: 14 }}>
                      Ready to use. It works on the phone, or added to a wallet.
                    </p>

                    <hr className="hairline" style={{ margin: '14px 0' }} />

                    <p className="eyebrow">What it draws from</p>
                    <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
                      {funds.map((f) => (
                        <li key={f.key} className="small" style={{ marginBottom: 5 }}>
                          {f.name} — {f.covers.toLowerCase()}
                        </li>
                      ))}
                    </ul>

                    <p className="small" style={{ color: 'var(--color-muted)', marginTop: 12 }}>
                      A caregiver gets their own card, their own per-fund permissions, and their
                      own name on every decision.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="small" style={{ color: 'var(--color-on-ink-muted)', marginTop: 14, maxWidth: '38ch' }}>
              A worked example, not a live system. Decision times are derived from the amount,
              so the same purchase always shows the same number.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
