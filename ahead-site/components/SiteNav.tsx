'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { segments, hrefFor } from '@/content/segments'
import { secondaryNav, site } from '@/content/site'

/**
 * Sticky ink bar. The bar never wraps: below 760px the secondary set collapses
 * into a menu, where the four segments appear as a plain expanded list rather
 * than a dropdown.
 *
 * The dropdown opens on click and on Enter/Space, and on hover at ≥960px —
 * hover is never the only way in.
 */
export function SiteNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hoverEnabled, setHoverEnabled] = useState(false)

  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentSlug = segments.find((s) => pathname?.startsWith(hrefFor(s.slug)))?.slug

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 960px) and (hover: hover)')
    const sync = () => setHoverEnabled(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Route change closes everything.
  useEffect(() => {
    setOpen(false)
    setMobileOpen(false)
  }, [pathname])

  const closeAndRefocus = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const onDocDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [open])

  const items = () =>
    Array.from(panelRef.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') ?? [])

  const focusItem = (i: number) => {
    const list = items()
    if (list.length === 0) return
    const next = ((i % list.length) + list.length) % list.length
    list[next]?.focus()
  }

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(true)
      requestAnimationFrame(() => focusItem(0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      requestAnimationFrame(() => focusItem(-1))
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const onPanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const list = items()
    const at = list.indexOf(document.activeElement as HTMLAnchorElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusItem(at + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusItem(at - 1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      focusItem(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      focusItem(-1)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeAndRefocus()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  const hoverOpen = () => {
    if (!hoverEnabled) return
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }

  const hoverClose = () => {
    if (!hoverEnabled) return
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  return (
    <header>
      <nav className="nav-bar" aria-label="Primary">
        <div className="nav-inner">
          <Link href="/" className="wordmark">
            {site.name}
          </Link>

          <div style={{ flex: 1 }} />

          <div className="nav-desktop">
            <div
              ref={wrapRef}
              style={{ position: 'relative' }}
              onMouseEnter={hoverOpen}
              onMouseLeave={hoverClose}
            >
              <button
                ref={triggerRef}
                type="button"
                className="nav-link"
                aria-expanded={open}
                aria-haspopup="true"
                aria-controls={menuId}
                onClick={() => setOpen((v) => !v)}
                onKeyDown={onTriggerKeyDown}
                style={{
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  font: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: 0,
                }}
              >
                Who it&rsquo;s for
                <span className="icon-caret" aria-hidden="true" />
              </button>

              {open && (
                <div
                  ref={panelRef}
                  id={menuId}
                  role="menu"
                  aria-label="Who it’s for"
                  className="menu-panel"
                  onKeyDown={onPanelKeyDown}
                >
                  {segments.map((s) => (
                    <Link
                      key={s.slug}
                      role="menuitem"
                      href={hrefFor(s.slug)}
                      className="menu-row"
                      aria-current={currentSlug === s.slug ? 'page' : undefined}
                      onClick={() => setOpen(false)}
                    >
                      <span className="menu-row-name">{s.name}</span>
                      <span className="menu-row-gloss">{s.navGloss}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {secondaryNav.map((l) => (
              <Link key={l.href} href={l.href} className="nav-link">
                {l.label}
              </Link>
            ))}

            <Link href={`mailto:${site.contactEmail}`} className="btn btn-amber">
              {site.cta.primary}
            </Link>
          </div>

          <button
            type="button"
            className="nav-mobile-trigger nav-link"
            aria-expanded={mobileOpen}
            aria-controls={`${menuId}-mobile`}
            onClick={() => setMobileOpen((v) => !v)}
            style={{
              background: 'none',
              border: '1px solid #2b4a5c',
              borderRadius: 4,
              cursor: 'pointer',
              font: 'inherit',
              alignItems: 'center',
              gap: 8,
              padding: '7px 12px',
            }}
          >
            Menu
            <span className="icon-caret" aria-hidden="true" />
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div id={`${menuId}-mobile`} className="nav-mobile-panel">
          <p className="eyebrow eyebrow-on-ink" style={{ paddingTop: 10 }}>
            Who it&rsquo;s for
          </p>
          <div style={{ marginTop: 8 }}>
            {segments.map((s) => (
              <Link
                key={s.slug}
                href={hrefFor(s.slug)}
                className="nav-mobile-row"
                aria-current={currentSlug === s.slug ? 'page' : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <span className="menu-row-name">{s.name}</span>
                <span className="menu-row-gloss">{s.navGloss}</span>
              </Link>
            ))}
          </div>

          <div className="nav-mobile-group">
            {secondaryNav.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="nav-mobile-row"
                onClick={() => setMobileOpen(false)}
              >
                <span className="menu-row-name">{l.label}</span>
              </Link>
            ))}
          </div>

          <div className="nav-mobile-group">
            <Link
              href={`mailto:${site.contactEmail}`}
              className="btn btn-amber"
              style={{ width: '100%' }}
            >
              {site.cta.primary}
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
