# Is this repackaging Lynx? And how else can Lynx be leveraged?
**September 4, 2026.** Research and information, not legal advice.

## The direct answer: no

Lynx has not built member-level eligibility determination, and the evidence is in their
own documentation rather than in inference.

**They draw the line themselves.** The Filtered Spend Programs docs — the product family
covering OTC, healthy food and flex benefits — split the work explicitly:

> **Lynx Configures:** the sub-program, purses, approved product list, MCC restrictions,
> funding rules.
> **You Configure:** member product assignments and benefit amounts.

Lynx configures the rails. The client decides which members get what. Enrollment is a
`POST /api/v1/member` where the *client* supplies `clientMemberId` and `memberProducts`;
Lynx validates schema and configuration — required fields present, product exists,
amount within election limits. No rule is evaluated against member attributes, and there
is no approval or denial record.

**The vocabulary gives it away.** "SSBCI," "special supplemental benefits" and
"chronically ill" appear **nowhere** on the site or in the docs. "Chronic condition"
appears once, on the rewards page, about HEDIS screening incentives. Their own CY2027
blog post covers only the point-of-sale half of the rule, and describes it as a
mechanism to "verify eligibility of plan-covered benefits **(products)** at the point of
sale." Eligibility of products, not of people. The criteria-posting half of the same
final rule is not mentioned at all.

**No rules engine over members exists.** The data model defines Client, Member and Member
Account. There is no `EligibilityRule`, no `BenefitPolicy`, no `Determination`, no
`Criteria` object. The authorization sequence is three checks — merchant category,
approved product list, sufficient balance — all at swipe time, all about the
transaction.

| | Eligibility to **spend** | Eligibility to **receive** |
|---|---|---|
| Question | Is this purchase allowed from this purse? | Does this member qualify at all? |
| Inputs | MCC, merchant ID, UPC/SKU/NDC, balance | Diagnosis, claims, HRA, plan criteria |
| Timing | Authorization, milliseconds | Enrollment / eligibility cycle |
| Output | Approve or decline a transaction | Approve or deny a member, with a reason |
| Lynx | **This is the product** | **Client supplies it** |

## And nobody else sells it either

The determination seat is empty. What plans actually do today, taking Centene as the
most transparent large operator: an **internal claims algorithm that refreshes weekly**
for members with adequate data, and for everyone else a **provider attestation form**
where a clinician evaluates the three-prong test and submits it — hosted at
`ssbci.rrd.com`, i.e. RR Donnelley, a print and communications vendor. RRD runs the
form. Nobody runs the rules. The same pattern repeats across Centene's state plans.

Every adjacent vendor is downstream of the determination: NationsBenefits (flex card,
basket adjudication), evermore/formerly Soda Health (administers pre-determined
benefits), InComm (rails and retail), Convey, HealthEdge, Zipari, Inovalon (no SSBCI
eligibility module found), Icario/Wider Circle/Papa/Pyx/DUOS (engagement and
navigation), Instacart Health/Mom's Meals/GA Foods (fulfilment from an eligible-member
file), Carrot Health/Socially Determined/Findhelp (signals, not determinations), and
ATTAC/HealthScape/Rebellis/Gorman (consultants who write the policy on paper).

evermore's own 2026 Flex Card RFP cheat sheet — a vendor shaping how plans buy — lists
"eligibility **file management** tools" among required capabilities. Managing a file
someone else produced. Determination is absent from the buying criteria entirely.

## The regulation reads like a product spec

From the CY2027 final rule and the consultant commentary on it:

- Plans must use **"written, objective criteria to determine an enrollee's eligibility
  for SSBCI"** and must **"document when enrollees are deemed ineligible to ensure
  equitable access."**
- For each SSBCI, plans must **list all written policies and objective criteria on their
  public-facing website.**
- Supplemental-benefit debit cards must carry a real-time electronic verification
  mechanism at the point of sale, with no cross-year carryover.
- Plans must maintain an **evidence-based bibliography of clinical literature** for each
  SSBCI offering, published within ten years.
- **CMS has already issued enforcement actions against plans using self-attestation to
  confirm SSBCI eligibility**, and has been explicit that self-attestation is not
  objective.

Two obligations, two very different markets: the point-of-sale requirement has a crowded
vendor field (Lynx, NationsBenefits, evermore, InComm all sell it). The criteria and
determination requirement has **no vendor market at all** — zero product launches, zero
RFP language, zero marketing.

## Ways to leverage Lynx, beyond what Silver did

Silver's structure: an embedded technology partner whose AI is "embedded directly into
the Lynx platform," with claims routed to Silver's engine and the decision returned
inside the Lynx operations experience. **Lynx owns the customer.** Silver's CEO frames it
as "another way for TPAs to adopt our technology as part of the platforms and workflows
they already use."

The important caveat: **there is no partner program.** No marketplace, no app directory,
no published partner terms, no revenue-share disclosure, no application path. Lynx's
"working with us" page describes two ways to *buy* Lynx — API integration and white
label — and nothing about partnering. Silver got in through a bilateral BD relationship.
That cuts both ways: no queue to join, but no template either.

The models actually available:

| Model | What it looks like | Evidence |
|---|---|---|
| **Embedded, Lynx resells** | Your engine inside their platform, sold to their customers | Silver — exists once, bespoke |
| **Build on the rail, sell yourself** | Multi-tenant: create child Client Orgs via the Business Enrollment API, aimed at "TPAs, benefits platforms and payroll providers" | Documented default; Nexben is the proof case |
| **White label** | Lynx builds and maintains a branded platform you take to market | Avidia's "Spark Benefits" |
| **Co-sell** | Mutual integration, both parties go to the same buyers | Truemed — informal, no program |
| **Customer who resells** | You buy, then resell downstream | Supported by multi-tenancy |

**The sequence that makes sense:** build on the rail and own the customer first, because
that keeps the rail swappable and keeps the determination engine — the asset — under
your control. Then pitch the embedded model from strength, once a working product
exists. The pitch writes itself: Lynx blogged about a rule whose other half their
product cannot serve, and their named customers — Centene and Priority Health — are
exactly the plans carrying that obligation. That is closing a gap in their own
compliance story, not asking for a favour.

## The real risks

Not "Lynx already built this." They are:

1. **Determination may be too entangled with each plan's clinical policy and claims data
   to productize across plans** — which is precisely why it has stayed in-house.
2. **The buyer is plan compliance and Medicare operations**, on a bid-cycle procurement,
   not the TPA-flavoured buyer Lynx sells to today.
3. **Plans building in-house.** Centene demonstrably has an internal algorithm already.
   This is the genuine competitor, and it is invisible to public search.
4. **No partner template at Lynx** — a company with one bespoke embedded precedent, no
   published terms, and CVS Health Ventures and McKesson Ventures on the cap table.

**Timing:** the CY2027 bid cycle is largely spent. The realistic window is **CY2028
bids**, which makes late 2026 through mid-2027 the right period to build and sell.

## Before building, read the primary text

The load-bearing language — "objective criteria" and the documentation-of-ineligibility
requirement — is the product spec, and it has so far been read through law-firm and
consultant summaries. Read 42 CFR 422.102(f) and the CY2027 preamble directly before
committing the data model.

## Sources

[Lynx developer hub](https://docs.lynx-fh.com/) · [Filtered Spend Programs quick start](https://docs.lynx-fh.com/docs/filtered-spend-programs-quick-start) · [Plan-Owned Programs quick start](https://docs.lynx-fh.com/docs/plan-owned-programs-quick-start) · [Lynx data model / terminology](https://docs.lynx-fh.com/docs/lynx-terminology) · [Lynx — supplemental benefits](https://www.lynx-fh.com/supplemental-benefits) · [Lynx — CMS 2027 flex card requirements](https://www.lynx-fh.com/blog/cms-2027-flex-card-requirements-is-your-medicare-advantage-supplemental-benefit-program-ready) · [Lynx — working with us](https://www.lynx-fh.com/working-with-us) · [Lynx MA case study](https://www.lynx-fh.com/hubfs/Lynx-Medicare-Advantage-Case-Study-Dec2025_v2.pdf) · [Silver + Lynx, live in production](https://www.withsilver.app/resources/silver-lynx-ai-claims-automation-is-now-live-in-production) · [Truemed + Lynx](https://www.prnewswire.com/news-releases/truemed-and-lynx-partner-to-reimagine-healthcare-e-commerce-for-tpas-and-benefits-administrators-302590227.html) · [Nexben + Lynx](https://www.lynx-fh.com/news/press-release-lynx-nexben-partnership) · [Avidia Spark Benefits](https://www.lynx-fh.com/news/press-release-spark-benefits) · [42 CFR 422.102](https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-422/subpart-C/section-422.102) · [Federal Register — CY2027 final rule](https://www.federalregister.gov/documents/2026/04/06/2026-06600/medicare-program-contract-year-2027-and-certain-contract-year-2026-policy-and-technical-changes-to) · [Crowell & Moring — CY2027 implications](https://www.crowell.com/en/insights/client-alerts/cms-finalizes-cy-2027-medicare-advantage-and-part-d-rule-key-implications-for-plan-sponsors) · [ATTAC — what compliance officers must act on now](https://www.attacconsulting.com/cy2027-final-rule-what-compliance-officers-need-to-act-on-now/) · [HealthScape — CMS sets new standards for SSBCI](https://www.healthscape.com/insights/cms-sets-new-standards-for-ssbci-and-supplemental-benefits-across-medicare-advantage-plans) · [Wellcare SSBCI attestation](https://www.wellcare.com/en/providers/ssbci-attestation) · [evermore — 2026 flex card RFP cheat sheet](https://evermoreoutcomes.com/the-resource-shelf-the-official-2026-flex-card-rfp-cheat-sheet/) · [NationsBenefits](https://nationsbenefits.com/) · [evermore](https://evermoreoutcomes.com/)
