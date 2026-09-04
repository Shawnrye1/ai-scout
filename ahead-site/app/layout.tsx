import type { Metadata } from 'next'
import { Newsreader, Instrument_Sans } from 'next/font/google'
import './globals.css'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

/** Serif carries the rules as written. */
const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
})

/** Sans carries what the system decided. */
const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-instrument-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Ahead — the operating system for funded patient programs',
  description:
    'A funder’s written eligibility criteria go in. Ahead OS determines who qualifies, opens restricted funds, decides every purchase at the register, and records approvals and refusals identically with the rule version that produced them.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${instrumentSans.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteNav />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
