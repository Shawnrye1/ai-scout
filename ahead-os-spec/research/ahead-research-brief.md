# Ahead OS — research brief
**September 4, 2026 · four tracks: platform, market, regulatory, economics**

Research and information only. Nothing here is legal advice.

---

## 1. What survived contact with the evidence

**The thesis is real but narrower than the deck claims, and the strongest piece of it
is not the one you are leading with.**

Three findings reorder the pitch:

1. **Pre-funding is the legally exposed part of the design — not the restriction.**
   Every OIG authority blessing manufacturer-funded patient travel and lodging does so
   for receipt-verified reimbursement or direct third-party payment. AO 25-06 (July 1,
   2025) expressly credited that the manufacturer *"did not provide cash"* and required
   receipts within 10 business days, with a vendor reviewing them for prohibited
   purchases. The financial-need CMP exception covers items and services *"excluding
   cash or cash equivalents such as checks or debit cards."* AO 20-08 held a big-box
   gift card is a cash equivalent outside the Promotes-Access-to-Care exception.
   Whether an MCC/SKU-restricted purse is a cash equivalent or an in-kind service is an
   open question with **no authority either way** — and it sits directly under the hero
   line "the money is already there when your patient walks in."
2. **Event-triggered pre-funding already exists — in trials.** Greenphire's ClinCard
   supports "data-triggered payments automatically released when a study activity is
   completed," and Greenphire Travel is sponsor-pre-funded with $0 patient out-of-pocket.
   Greenphire acquired Clincierge (Feb 2024) and merged with Suvoda under Bain (Apr
   2025). The entity holding event-triggered payments + travel concierge + prepaid cards
   + rare-disease relationships is now one platform, one commercial decision away from
   your market.
3. **AI adjudication with published accuracy is the actual white space.** Rx Almanac's
   Aug 2026 survey of AI in hub services concludes: *"No vendor explicitly claims live
   document AI, eligibility determination, or PAP adjudication with published accuracy
   metrics."* That is the most defensible claim in the whole scan — and it is on the
   **determination** side, which is exactly where your design brief already says the
   differentiation lives ("they show authorization; we show determination,
   authorization, and the record"). The brief was right. The deck's hero is not fully
   aligned with it.

**Recommended repositioning:** lead with *determination and the record*, not with
*the money is already there*. Determination is defensible, uncontested, needs no rail,
and is the thing no competitor claims. Pre-funding is a UX benefit whose legality is
unresolved for a large share of patients. Making it a per-program mode rather than the
headline costs you nothing and de-risks everything.

---

## 2. Lynx

**Fit is good on primitives, weak on the specific thing you need.**

Documented and relevant: "Plan-Owned Programs" and "Filtered Spend Programs" as
first-class API paths (plan-owned, no-KYC, immediate approval); purses, sub-accounts and
ledgers as API objects; spend restriction by merchant ID, MCC, **or individual product
SKU** against an Approved Product List you can supply; SKU-level adjudication at
60–70K retail locations via FIS. Lynx RX explicitly markets **"employer or pharma-funded
subsidies"** and names pharma companies as a served stakeholder.

Gaps and risks:
- **Travel and lodging appear nowhere** across any Lynx product page. Rideshare and
  meals do (Uber named); hotels and airfare do not. Airline/hotel MCCs are a different
  restriction problem from the retail SKU/APL engine that is Lynx's strength.
- **Per-event API funding is unproven.** Documented funding patterns are benefit-year
  scheduled allocations, good-faith front-loading and lump sums. The contributions
  endpoint plausibly supports per-event, but it is not a marketed pattern. Verify in
  their sandbox before designing around it.
- **Pharma is not in their "Who We Serve" list** — the corporate GTM assumes health
  plans and TPAs; only the pharmacy product assumes pharma.
- **Investor conflict is severe:** CVS Health Ventures and McKesson Ventures are both on
  the cap table ($27M Series A, Feb 2025, led by Flare Capital). McKesson owns
  CoverMyMeds. Both parents compete directly in manufacturer patient support.
- **Your AI differentiator is already occupied inside Lynx.** As of July 31, 2026, Lynx
  has a production partnership with **Silver**, whose AI extracts and validates claim
  data from unstructured receipts and auto-adjudicates against benefit policy with
  exception routing to humans. That is close to a verbatim description of your
  receipt-adjudication moat, shipped by your intended partner with someone else.
- **Company scale is modest:** 11–50 people, >$44M raised, self-reported "$100M+ annual
  payment volume" — about $1.2M of gross interchange company-wide at exempt rates.
- **Nothing about Lynx pricing is published anywhere.** The 40% interchange share is
  single-sourced to one verbal conversation.

Note the SKU engine — Lynx's main technical advantage — is not what your use case
needs. Travel, lodging, meals and rideshare are **MCC-level**, and MCC blocking is table
stakes at Lithic, Marqeta, Highnote, Stripe Issuing and Synctera. If your spend really is
ancillary travel, the case for Lynx specifically is weaker than it looks; the case for
*a* rail behind a swappable interface is unchanged.

---

## 3. Market and competition

**Sizing (all weak, syndicated, methodology undisclosed):** global pharma hub and
patient access support ~$3.2B (2024) → $7.6B (2033) at 10% CAGR, North America ~49%,
implying roughly **$1.6B NA**. An alternative sizing puts it at $3.55B (2025) → ~$10B
(2035). Clinical trial payment solutions ~$2.1B (2025) → $4.8B (2034), prepaid cards
27.4% of that and the fastest-growing slice.

**No published sizing exists for manufacturer-funded ancillary patient support as a
distinct category.** That absence is the finding: you would be creating a category, not
entering one. Harder and slower than the deck implies.

**Who is actually in the way:**
- **Paysign** is the incumbent, not a utility. Patient affordability revenue **$33.9M in
  2025, +168% YoY**; 131 active programs, 70+ clients, 6 of the top 10 US manufacturers;
  ~$1B assistance delivered to 840,000+ people; 59–62% gross margins. They market
  Patient Travel Services and Per Diem & Lodging, and "fund cards per set business
  rules" for hub service providers. Their Q4 2025 call mentions none of it — travel and
  per diem appear marketed but immaterial to revenue. Read that both ways: the category
  is commercially unproven, *and* an incumbent with 70 manufacturer relationships has a
  dormant product it can activate when a brand asks.
- **Suvoda/Greenphire** — highest threat. Has the mechanism, the concierge, the cards
  and the rare-disease relationships. Needs only a go-to-market decision.
- **PAN Foundation already ships your product on the charity side:** a $500 prepaid Visa
  transportation grant, MCC-restricted, with daily and sub-caps, and **no receipt
  submission**. HealthWell awarded $1.23B across 311,000+ grants in 2024 and added a
  travel fund.
- Hubs consolidated hard: CareMetx acquired Cencora's US patient services incl. Lash
  Group (Apr 2026, 155+ brands); Mercalis + PharmaCord became Valeris (May 2025);
  AssistRx acquired AllazoHealth (Apr 2025). For cell and gene therapy, travel and
  lodging **is** in scope for hubs but is "bundled within larger hub contracts rather
  than offered as discrete services." That is both your wedge and your problem.
- Adjacent, not competing: TailorMed ($40M, Nov 2024), Annexus Health, Atlas Health —
  all match patients to money, none disburse it. Partnership candidates.
- Well-funded new entrant: **Forus, $160M (May 2026)**, ~$1B valuation, automating
  everything between clinical decision and treatment start. Does not do travel — yet.

**The macro is against a point solution:** 45% of biopharma executives are considering
hub vendor consolidation for 2026–2028 and 39% report pressure to move functions
in-house. You would be selling a new vendor into a market cutting vendor count. This is
the strongest argument for selling **through** hubs rather than direct to brands —
which is exactly how Paysign is structured.

**Procurement reality:** 6–18 month cycles, 2–6 months of vendor qualification alone,
6–11 stakeholders, 200+ question security reviews, SOC 2 Type II expected. Finalists run
scripted patient journeys live and must close the full case. The stated disqualification
rule is to reject any vendor where a launch-critical requirement is a roadmap item, an
unauditable claim, or an undefined subcontractor dependency. Those are pass/fail gates
applied before scoring — price and features cannot compensate.

---

## 4. Regulatory (information, not advice)

**Clean to build now:** clinical trial participant payments (IRB-approved; FDA guidance
treats travel/lodging reimbursement as not undue influence; pre-funded cards already
market norm); commercially insured and cash-pay patients for travel, lodging, mileage,
meals, rideshare tied to a care event; free-drug PAP eligibility workflow; and the
payment rail itself provided you never take custody of funds.

**Needs counsel or an advisory opinion:** federal beneficiaries receiving pre-funded
purses (the crux); chronic-therapy programs for federal beneficiaries (both favorable
travel AOs leaned on *one-time* gene therapy, few treatment centers, on-label only —
a chronic product does not inherit them); caregiver expenses beyond accompanying
travel; the AI exception-adjudication engine; data flowing back to the manufacturer.

**Effectively off-limits:** copay or coinsurance assistance to Medicare/Medicaid/TRICARE
beneficiaries funded by a manufacturer, in any form — 2005 and 2014 Special Advisory
Bulletins, AO 20-05, *Pfizer v. HHS* (2d Cir. 2022), AO 22-19 and roughly $1.5B in DOJ
settlements all say the same thing. Do not build the code path.

**AO 24-03 and AO 25-06 read as a design spec** and their parameters are public, which
means they are not proprietary: income ≤600% FPL, on-label prescription, no alternative
assistance, airfare beyond 300 miles, ground transport 100–300, lodging beyond 100
miles, $50/day meals, $50/day incidentals or GSA per diem.

**Track this:** OIG's June 24, 2026 RFI (91 Fed. Reg. 37902) could create a clinical-trial
remuneration safe harbor and reset the analysis on the trial side. Comments closed
Aug 24, 2026. It is the most consequential pending item for this business.

**Compliance cost floor:** roughly **$250K–500K in year one** for a credible commercial
launch excluding engineering (fraud-and-abuse counsel $50–150K, fintech/BSA $25–75K,
privacy $25–60K, sponsor bank and processor $50–150K/yr plus 3–9 months, SOC 2 Type II
$40–80K, PCI $15–50K, plus a part-time compliance officer). **Trial-only is roughly
$100–200K** because you skip the AKS/CMP structural analysis and federal-beneficiary
gating. That gap is the strongest practical argument for a trial beachhead. An OIG
advisory opinion runs $15–50K+ in fees and 6–12+ months — a Series A activity, but a
favorable one would be a genuine moat.

---

## 5. Economics — the v2 model does not survive review

The Sept 2 model has three problems that would end a sponsor meeting.

**a. The pricing is roughly 6x too high on its own benchmark.** Transactional model
totals **22.7% of funds disbursed** against a stated procurement benchmark of 3–4%.
Model A (PPPM) is worse: $23.4M/yr = **39% of funds**. No procurement team accepts a
fee that is a large fraction of the benefit delivered, however you frame the
denominator. The Positioning tab's answer — pick a friendlier denominator — is not a
defense; it is the thing a procurement lead is specifically trained to see through.

**b. The ROI row is inverted.** "As % of revenue retained by the program: 1950%" means
the fee is **19.5x** the value created. The note says "under 100% means it pays for
itself." At 1950% the model states, in its own numbers, that the product destroys value.
Either the retention estimate (8 discontinuations prevented) is far too conservative or
the price is far too high. Both are probably true.

**c. Header/input mismatch.** The header says "anchored on the client's actual program:
$100K disbursed per month"; the input is $5,000,000/month. Every downstream figure is
50x the stated anchor. Fix before this file leaves your machine.

**What to price against instead.** There is no public hub rate card — Rx Almanac wrote a
dedicated pricing-benchmark article containing zero dollar figures, deliberately. The
one hard public benchmark is trial card economics, published by universities: Greenphire
ClinCard at Johns Hopkins is $3.50–4.00 physical card, $2.50 virtual, **$1.15/load plus
$1.50 load support** (~$2.65 all-in per load), $3.00/mo inactivity; UTMB is $4.50/card
and **$1.75/load**.

That number is a problem for your architecture specifically: **event-triggered funding
multiplies load fees.** Six funding events per patient per month at ~$2.65 is ~$16/month
of pure load cost per patient before any margin — and Mural Health is already winning
share by attacking exactly these fees. Model this before you publish a rate.

**A defensible shape**, consistent with slide 16's stated principle (anchor per enrolled
patient per year, not as a share of funds):
- Implementation fee for program one; program two is configuration.
- Monthly platform minimum per program, so a small program is not priced like a large
  one.
- Per enrolled-and-determined patient — the determination is the product, so charge for
  it.
- Per funding event, priced **below** the manual coordinator cost it replaces (your
  model already has the right instinct here: $9.00 manual vs $4.00 priced).
- Total fees capped as a percentage of funds disbursed, in the contract. The cap costs
  little on large programs and is the single fastest way to kill the "your fee is 23% of
  the benefit" objection before it is raised.

Also delete the "Team & overhead: ZERO while side project" line before anyone external
sees the file. It is honest and it is disqualifying — procurement reads it as an
undefined dependency, which is a stated pass/fail rejection criterion.

---

## 6. What to do next, in order

1. **Reposition the hero** from "the money is already there" to determination and the
   record. Keep pre-funding as a mode, not the promise.
2. **Fix the model** — the three errors above, then reprice per the shape in §5.
3. **Get the six questions answered by Lynx in writing** (travel/lodging MCCs, per-event
   API funding, definition and floor of the 40%, exclusivity given Lynx RX sells to
   pharma directly, the Silver boundary, and which bank sponsors a third-party-funded
   program). See `docs/06-build-plan.md`.
4. **Pick the beachhead.** Trial-only is roughly half the compliance cost, has a
   permissive regulatory posture, and has a pending RFI that may improve it further —
   but Greenphire owns it. Commercial-only patients avoid the crux question entirely and
   are where your hub network actually is. Decide deliberately; it does not block the
   build.
5. **Build WP-0 through WP-7** — everything through rule drafting and replay needs no
   rail, no bank and no money, and produces the demo that carries the pitch.
6. **Take the pre-funding question to fraud-and-abuse counsel** before the rail work.

---

## Sources

Lynx: [homepage](https://www.lynx-fh.com/) · [CDH Core](https://www.lynx-fh.com/cdh) · [Lynx RX](https://www.lynx-fh.com/pharmacy) · [Supplemental Benefits](https://www.lynx-fh.com/supplemental-benefits) · [Who We Serve](https://www.lynx-fh.com/who-we-serve) · [Developer docs](https://docs.lynx-fh.com/) · [Series A PR](https://www.lynx-fh.com/news/press-release-lynx-series-a-27m-healthcare-fintech) · [Avidia Spark Benefits](https://www.lynx-fh.com/news/press-release-spark-benefits) · [PYMNTS on FIS and SKU adjudication](https://www.pymnts.com/healthcare-financing/2025/doctors-orders-lynx-gets-27-million-to-close-health-and-finance-gap/) · [Silver + Lynx AI claims automation](https://world.einnews.com/pr_news/930642936/silver-and-lynx-launch-production-ai-claims-automation-to-help-tpas-modernize-claims-processing) · [Flare Capital portfolio](https://www.flarecapital.com/company/lynx-2/)

Market: [Grand View — pharma hub market](https://www.grandviewresearch.com/industry-analysis/pharma-hub-patient-access-support-service-market-report) · [Pharmaceutical Commerce — inside pharma's changing hub landscape](https://www.pharmaceuticalcommerce.com/view/faq-inside-pharmas-changing-hub-landscape) · [Rx Almanac — hub market analysis](https://rxalmanac.com/articles/hub-services-market-analysis/) · [Rx Almanac — pricing benchmarking](https://rxalmanac.com/articles/hub-pricing-benchmarking/) · [Rx Almanac — RFP framework](https://rxalmanac.com/articles/hub-rfp-framework/) · [Rx Almanac — AI in hub services](https://rxalmanac.com/articles/ai-and-technology-in-hub-services/)

Competitors: [Paysign pharmaceutical services](https://paysign.com/solutions/pharmaceutical-services/) · [Paysign Q4 2025 call](https://www.fool.com/earnings/call-transcripts/2026/03/25/paysign-pays-q4-2025-earnings-call-transcript/) · [Greenphire Travel FAQ](https://www.suvoda.com/insights/blog/greenphire-travel-frequently-asked-questions) · [ClinCard data-triggered payments](https://www.suvoda.com/insights/blog/greenphire-patient-payments-clinical-trials-frequently-asked-questions) · [Greenphire acquires Clincierge](https://www.businesswire.com/news/home/20240201249192/en/Greenphire-Announces-Acquisition-of-Clincierge-to-Enhance-Clinical-Trial-Support-Services) · [Suvoda–Greenphire merger](https://www.prnewswire.com/news-releases/suvoda-and-greenphire-announce-completion-of-merger-302436408.html) · [CareMetx acquires Cencora patient services](https://www.caremetx.com/press-release/caremetx-acquires-u.s.-based-patient-services-and-free-goods-pharmacy-operations-from-cencora-significantly-expanding-its-patient-access-platform) · [Mercalis + PharmaCord → Valeris](https://www.pharmexec.com/view/mercalis-pharmacord-merger-rebrand-valeris) · [Forus $160M](https://www.businesswire.com/news/home/20260512458472/en/Forus-Raises-$160M-to-Build-the-Foundation-for-Modern-Medicine) · [PAN transportation grants](https://www.panfoundation.org/apply-and-manage-grants/our-grants/transportation-grants/) · [HealthWell 2024 results](https://www.prnewswire.com/news-releases/healthwell-foundation-publishes-preliminary-2024-operating-results-302420073.html) · [Mural Health on prepaid card fees](https://www.muralhealth.com/blog/wcg-mural-health-part-4-your-options-beyond-prepaid-cards)

Pricing benchmarks: [ClinCard fee schedule — Johns Hopkins](https://medicine-matters.blogs.hopkinsmedicine.org/files/2023/01/Greenphire-ClinCard-fees.pdf) · [ClinCard fees — UTMB](https://research.utmb.edu/research-at-utmb/office-of-clinical-research-(ocr)/clincard-fees) · [Federal Reserve Reg II interchange data](https://www.federalreserve.gov/paymentsystems/regii-average-interchange-fee.htm)

Regulatory: [OIG AO 24-03](https://oig.hhs.gov/compliance/advisory-opinions/24-03/) · [OIG AO 25-06](https://oig.hhs.gov/compliance/advisory-opinions/25-06/) · [Bass Berry on AO 24-03](https://www.bassberry.com/news/oig-advisory-opinion-travel-lodging-assistance-gene-therapy/) · [Faegre Drinker on AO 20-09](https://www.faegredrinker.com/en/insights/publications/2021/1/oig-advisory-opinion-allows-travel-food-lodging-assistance-from-pharmaceutical-company) · [Morgan Lewis — PAP dos and don'ts from OIG](https://www.morganlewis.com/blogs/asprescribed/2025/02/patient-assistance-programs-the-dos-and-donts-from-hhs-oig) · [Foley on AO 24-02](https://www.foley.com/insights/publications/2024/04/new-oig-advisory-opinion-patient-assistant-programs/)

Go-to-market: [Salesmotion — selling to life sciences](https://salesmotion.io/blog/how-to-sell-to-life-sciences)
