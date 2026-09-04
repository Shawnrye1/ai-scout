# Ahead marketing site — repo constitution

Read this first, every session.

## What this site is

The marketing site for **Ahead** (the company) and **Ahead OS** (the platform): the
operating system for funded patient programs. A funder's written eligibility criteria go
in; Ahead OS determines who qualifies, opens restricted funds, decides every purchase at
the register, and records approvals and refusals identically with the rule version that
produced them.

Audience: patient services and benefit leads at health plans, employers, manufacturers
and foundations; program managers; and partner teams at hubs and benefit navigators.
**Not engineers. Not patients.**

Ahead is the company. **Ahead OS** is the platform. Never call the company the platform.

## Stack

Next.js App Router, TypeScript, Tailwind. Static export is fine — there is no backend.
One route per page, no CMS. Copy lives in typed content modules under `content/`, not
inline in JSX, so it can be edited without touching layout.

Deploy target is whatever the repo is wired to; nothing here depends on it.

## Design system — already set, do not redesign

**Color**

| Token | Hex | Use |
|---|---|---|
| Ink | `#0B1F2E` | Dark sections, nav, hero |
| Ink soft | `#173142` | Hover on ink buttons |
| Paper | `#F1F4F3` | Page ground — cool, not cream |
| Paper 2 | `#E6EBEA` | Hairlines inside cards |
| White | `#FFFFFF` | Alternating sections, cards |
| Amber | `#E19A12` | THE accent. Hover `#F0AC28` |
| Amber tint | `#FFF8E9` | Editable inputs, highlights |
| Teal | `#1F7A8C` | The constant — what never changes across programs |
| Approve | `#2C7355` on `#E4EFE9` | Approval tags |
| Decline | `#A94F32` on `#F7EAE3` | Decline tags — never styled as an error |
| Muted | `#5E7382` | Secondary body on light |
| Hairline | `#CDD6D6` | Rules and borders on light |
| On-ink body | `#B9CBD6` | Lede text on ink |
| On-ink muted | `#9FB6C3` | Section subheads on ink |

**Type.** `Newsreader` (Google) for headlines and any rule text quoted as written.
`Instrument Sans` (Google) for everything the system says: UI, decisions, data, body.
The serif/sans split is load-bearing — serif carries the rules as written, sans carries
what the system decided. Do not flatten it.

Scale: h1 `clamp(34px,4.6vw,55px)`/1.08/-.015em · h2 `clamp(26px,3vw,36px)`/1.14 ·
h3 23–26px · body 16.5px/1.55 · lede 17.5px/1.6 · small 13–15px.

**Rules of use.** Amber marks exactly one thing per view: what the visitor can change or
act on. A decline is a correct outcome — style it as a peer of approval, never red-as-
error. `font-variant-numeric: tabular-nums` on every amount, time and millisecond value.

**Spacing.** Section padding `78px 28px`. Content max width `1180px`, centered. Radius:
4px buttons and inputs · 6–8px cards · 999px chips · 28px phone screen · 38px phone bezel.
Grids: `repeat(auto-fit,minmax(min(320px,100%),1fr))` — the `min()` is what keeps 360px safe.

**No images, icons or SVG illustrations.** The design is type, rule lines and color only.

## Copy that must not drift

- Never say: platform (for the company), seamless, revolutionize, empower.
- **Never claim merchant controls prove eligibility.** Controls prove the *spend* was in
  policy. Eligibility is income, distance, a documented condition, an on-label
  prescription, the absence of duplicate assistance — no merchant check produces those.
  The claim is: eligibility is determined up front, the spend is decided at the register,
  and both answers are recorded.
- The banking partner is named once, in the footer, as infrastructure. Never as a
  capability list.
- Decline copy is specific and never apologetic: *"$50 of the $50 daily limit was already
  used today"* — not *"Sorry, this purchase couldn't be approved."*
- Never state a decision latency that is randomly generated. Latency shown must be
  deterministic for the same inputs.

## Quality bar

- Responsive to 360px with no horizontal scroll. Wide content scrolls in its own container.
- Visible amber focus ring on every link, input and button.
- `prefers-reduced-motion` respected: no autoplay, no pending delay, transitions off.
- **No browser storage of any kind.**
- Every page renders fully at rest — nothing waits on scroll to become visible.

## Do not

- Do not add numbered eyebrows (`01 · LAUNCH`) unless the content genuinely is a sequence.
- Do not add middle-dot meta strings (`A · B · C`) as decoration.
- Do not add all-caps tracked labels above every block.
- Do not build a simulator that only ever approves.
- Do not show a "live" badge on a static demo.
