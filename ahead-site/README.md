# Ahead — marketing site

Next.js App Router, TypeScript, Tailwind. Static export; there is no backend.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export to ./out
npm run typecheck
```

Read [`CLAUDE.md`](./CLAUDE.md) first, every session. It is the repo constitution:
the design tokens, the type split, the copy that must not drift, and the quality
bar. [`HANDOFF.md`](./HANDOFF.md) is the v2 brief this build implements.

## Layout

```
app/
  layout.tsx           fonts, nav, footer
  page.tsx             the main page
  health-plans/        four segment routes, one line each —
  employers/           every one of them renders <SegmentPage segment={…} />
  manufacturers/
  foundations/
components/
  SiteNav.tsx          sticky bar + the "Who it's for" dropdown
  HeroDemo.tsx         the seven-beat day (the only stateful component)
  PatientJourney.tsx   the five-step band
  SegmentGrid.tsx      the four cards on the main page
  UnderTheHood.tsx     quoted document ⇄ drafted rules
  RecordPair.tsx       one approval and one refusal, identical detail
  SegmentPage.tsx      the six-section segment template
content/
  types.ts             the Segment shape
  segments/*.ts        one module per segment — all segment copy lives here
  hero.ts main.ts journey.ts site.ts
lib/
  decide.ts            the demo's decision engine — pure, no clock, no randomness
  money.ts             integer cents in, formatted string out
```

**A fifth segment is a content module and a route folder, never a new page
component.** Add `content/segments/<slug>.ts`, register it in
`content/segments/index.ts`, and add `app/<slug>/page.tsx` (nine lines, copied
from any of the four). The nav dropdown, the mobile menu, the footer and the
segment grid all read the same list.

## The hero demo

`lib/decide.ts` replays the whole day from the start on every render, so editing
a rule number in the panel increments the rule version and changes decisions that
have already appeared on screen — which is the point being made.

Decision latency is `236 + ((round(amount) * 37) % 184)`, derived from the amount.
It is never generated: a randomly generated latency would be a claim the product
cannot make.

Under `prefers-reduced-motion: reduce` there is no autoplay and no pending delay;
the whole day is shown at rest instead.

## Open items for the client

These are carried from `HANDOFF.md §8` and are the things to settle before the
site goes anywhere external.

| Item | Where it lives | Status |
|---|---|---|
| Contact email for every CTA | `content/site.ts` → `contactEmail` | `hello@example.com` placeholder |
| Whether the banking partner is named in the footer | `content/site.ts` → `footerInfrastructure` | currently generic |
| **Add-to-wallet confirmed with the banking partner** | `content/journey.ts` → `walletConfirmed` | **unconfirmed — shipping the safe wording** |
| Main-page stats (2,340 / 1,670 / 380 ms) | `content/main.ts` → `record.stats` | synthetic replay, labelled as such |

### On the wallet claim

Step five of the patient journey originally claimed add-to-wallet. That depends
on the issuer holding Visa (VDEP) or Mastercard (MDES) digital-enablement
certification *and* supporting push provisioning from a **mobile web** flow —
materially more constrained than in-app, especially on iOS. Nothing confirms it,
so the step ships as *"Ready to use — the card works immediately, on the phone or
added to their wallet"*, which is true either way.

When the partner confirms, set `walletConfirmed = true` in `content/journey.ts`.
That is the only change needed.

## Checks this build passes

- No horizontal scroll at 360, 768 or 1280px, on all five routes
- Nav dropdown: opens on click and on Enter/Space, arrow-key navigation,
  `Escape` closes and returns focus, current segment marked, hover only at ≥960px
- Below 760px the bar collapses to a menu and never wraps
- No `localStorage`, `sessionStorage` or cookies
- `prefers-reduced-motion` respected
- Visible amber focus ring on every link, input and button
