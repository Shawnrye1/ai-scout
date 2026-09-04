/**
 * Site-wide copy and open items.
 *
 * `contactEmail` is an open item for the client (HANDOFF §8) — replace before
 * anything external. It is defined once so there is one place to change.
 */
export const site = {
  name: 'Ahead',
  platform: 'Ahead OS',
  tagline: 'The operating system for funded patient programs.',
  contactEmail: 'hello@example.com',
  /** Named once, as infrastructure. Never as a capability list. */
  footerInfrastructure:
    'Card issuing and settlement run on a regulated banking partner. Ahead never takes custody of funds.',
  cta: { primary: 'Start a program', secondary: 'See the record' },
} as const

export const secondaryNav = [
  { href: '/#patient-journey', label: 'Patient journey' },
  { href: '/#under-the-hood', label: 'Under the hood' },
  { href: '/#controls', label: 'Controls' },
  { href: '/#platform', label: 'Platform' },
] as const
