# AI Scout - Investor FAQ

## Product & Technology

### How accurate is the player detection?
We achieve 90%+ accuracy on jersey number detection in standard game footage. Accuracy improves with video quality. Our human-in-the-loop system allows coaches to flag corrections, which continuously improves our models.

### What sports do you support?
Currently basketball and football. Soccer is on the roadmap for Q1 2026, followed by lacrosse and volleyball. The core player detection and tracking technology transfers across sports; sport-specific analysis models require training.

### How long does analysis take?
Full game analysis completes in under 1 hour (typically 30-45 minutes). This compares to 6+ hours for manual film review.

### What video sources do you support?
- Direct upload (MP4, MOV, AVI, WebM up to 5GB)
- YouTube links
- Hudl links
- Vimeo links

### How do you handle poor video quality?
Our models are trained on real game footage, including broadcast, gym cameras, and phone recordings. Very low quality footage may reduce jersey detection accuracy, but we surface confidence scores so coaches know what to trust.

---

## Market & Competition

### Why haven't Hudl or other incumbents built this?
Hudl's business model is video storage and distribution, not analysis. Building accurate computer vision for sports requires specialized ML expertise and significant training data. We're AI-native; they'd need to bolt it on.

### What about other AI sports startups?
Most focus on professional sports (where budgets exist) or specific niches (e.g., shot tracking). We're the first to target grassroots sports with comprehensive, automated scouting reports. The high school/college market is underserved.

### How big is the addressable market really?
- 500,000+ high school coaches in the US alone
- 50,000+ college coaches
- 45M youth sports participants (parents are buyers)
- Average coach spends $500-2000/year on tools and training

Even capturing 1% of high school coaches at $100/month = $6M ARR.

### What's your moat?
1. **Training data:** 500+ games analyzed, growing weekly
2. **Human-in-the-loop:** Corrections from coaches continuously improve models
3. **Sport-specific expertise:** Position-aware analysis (not generic)
4. **Network effects:** Coaches refer coaches; we're embedded in their workflow

---

## Business Model & Unit Economics

### What's your pricing strategy?
Three tiers designed for different segments:
- **$49/mo Starter:** JV coaches, parents, individual scouts (10 games)
- **$149/mo Pro:** Varsity coaches who analyze every game (50 games)
- **$299/mo Team:** Athletic departments with multiple sports/coaches (unlimited)

### What are your unit economics?
- **GPU cost per game:** $2-5 (depends on video length)
- **Gross margin:** 75%+ at scale
- **CAC:** ~$50 (mostly organic/referral currently)
- **LTV:** $1,200+ (assuming 12+ month retention)
- **LTV:CAC:** 24:1 (excellent for SaaS)

### How do you acquire customers?
1. **Organic/SEO:** Coaches searching for film analysis solutions
2. **Referrals:** Coaches recommend to other coaches
3. **Free trial:** First game analysis free, no credit card
4. **Direct outreach:** Targeted outreach to athletic directors

### What's your path to profitability?
At 500 customers with average $150/month revenue, we'd hit ~$75K MRR. With 75% gross margin and lean operations, profitability is achievable in 18-24 months post-funding.

---

## Traction & Validation

### Who are your current customers?
Mix of high school and college coaches, primarily in basketball and football. Montverde Academy (elite basketball program) is our flagship customer case study.

### What's your retention like?
Too early for cohort data, but coaches who complete their first analysis have high engagement. Sports are seasonal, so we expect some natural churn in off-seasons.

### Do you have any revenue?
Currently in early access / beta with select coaches. Paid tiers are launching [timeline]. We have verbal commitments from several coaches to convert.

### What validation do you have?
- 500+ games processed without failures
- 97% time savings validated with Montverde Academy
- Strong qualitative feedback from coaches
- Coaches actively referring other coaches

---

## Team & Operations

### It's just you—can you build this?
Yes. I've built the entire platform from ML pipeline to frontend. AI Scout is live and processing games today. For the next phase, I'll hire ML engineers first (to improve model accuracy) while I handle product and GTM.

### What are your first hires?
1. **ML Engineer** - Improve detection accuracy, add sports
2. **Full-stack Engineer** - Product features, scale infrastructure
3. **Sales/Customer Success** - Coach onboarding, retention

### Where are you based?
[Your location]. The product is fully remote/cloud-based. Coaches access via web app.

### What's your background?
[Your background - education, relevant experience, why you're building this]

---

## Fundraise & Use of Funds

### How much are you raising?
$500K pre-seed.

### What's the valuation?
Flexible on structure. Targeting $3-4M post-money based on traction and market opportunity. Open to SAFEs.

### How will you use the funds?
- **50% Engineering:** ML and product development
- **25% Infrastructure:** GPU compute, scaling
- **15% Sales/Marketing:** Customer acquisition
- **10% Operations:** Legal, accounting, misc

### What are your milestones for Series A?
- 500 paying customers
- $50K MRR
- 3+ sports supported
- 10,000+ games analyzed
- Strong retention metrics

### What's your runway?
$500K gives us 18-24 months of runway, sufficient to hit Series A milestones.

---

## Risks & Challenges

### What's your biggest risk?
**Model accuracy at scale.** Different video qualities, camera angles, and sports present challenges. Mitigation: human-in-the-loop corrections and continuous model training.

### What if a big player enters?
First-mover advantage matters. We'll have 10,000+ games of training data and coach relationships by the time anyone catches up. Plus, big players (Hudl, ESPN) would likely acquire rather than build.

### What about data privacy?
Game footage is of public events (games with spectators). We don't store sensitive personal data beyond coach accounts. Video is stored securely in Cloudflare R2 and can be deleted by users.

---

## Vision

### Where does this go?
**Short-term:** Best AI scouting tool for coaches at every level.

**Medium-term:** Platform connecting players, coaches, and scouts. Every athlete has an AI-generated scouting profile.

**Long-term:** The infrastructure for sports talent identification and development globally.

### What's the exit path?
1. **Acquisition:** Strategic buyers include Hudl, ESPN, STATS Perform, sports betting companies
2. **IPO:** If we become the platform for grassroots sports analytics
3. **Private equity:** Sports tech is attractive to PE firms

---

*Questions? Contact: [your email]*
