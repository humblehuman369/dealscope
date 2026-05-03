# DealGap IQ — Financial Proforma & Breakeven Analysis

> Last updated: April 14, 2026

---

## 1. Revenue Model

### Subscription Pricing

| Tier | Monthly Price | Annual Price | Effective Monthly (Annual) |
|------|--------------|-------------|---------------------------|
| Starter (Free) | $0 | $0 | $0 |
| Pro | $39.99 | $349.99 | $29.17 |

### Net Revenue After Payment Processing

| Channel | Fee Structure | Monthly Sub Net | Annual Sub Net (per month) |
|---------|---------------|----------------|---------------------------|
| **Stripe (web)** | 2.9% + $0.30/txn | $38.53 | $28.30 |
| **Apple IAP** (15% SBP) | 15% commission | $33.99 | $24.79 |
| **Google Play** (15% Y1) | 15% commission | $33.99 | $24.79 |

### Blended Net Revenue Per Subscriber

Early-stage channel and billing mix assumptions:

| Segment | Mix % | Net $/mo | Contribution |
|---------|-------|----------|-------------|
| Web — Monthly | 52% | $38.53 | $20.04 |
| Web — Annual | 28% | $28.30 | $7.92 |
| iOS — Monthly | 13% | $33.99 | $4.42 |
| iOS — Annual | 7% | $24.79 | $1.74 |
| **Blended ARPU (net)** | **100%** | | **$34.12/mo** |

---

## 2. Fixed Monthly Costs (Current Plans)

| # | Service | Plan | Monthly Cost | Included Quota | Notes |
|---|---------|------|-------------|----------------|-------|
| 1 | RentCast API | Growth | $199.00 | 5,000 req/mo | $0.03/req overage |
| 2 | Zillow / AXESSO API | Production | $82.00 | 100,000 req/mo | €75 ≈ $82 USD; 75 req/min |
| 3 | RapidAPI — Redfin | Pro | $15.00 | ~1,000+ req/mo | Verify quota in dashboard |
| 4 | RapidAPI — Realtor | Pro | $15.00 | ~1,000+ req/mo | Verify quota in dashboard |
| 5 | Railway | Pro | $20.00 | $20 usage credit | Usage-based above credit |
| 6 | Vercel | Pro | $20.00 | Standard limits | Frontend hosting |
| 7 | Expo (EAS) | Starter | $19.00 | 3K MAUs | $45 build credit |
| 8 | Apple Developer | Annual | $8.25 | — | $99/yr amortized |
| 9 | Google Play Developer | One-time | $2.08 | — | $25 amortized 12 mo |
| 10 | Domain (dealgapiq.com) | Annual | $1.50 | — | ~$18/yr amortized |
| 11 | Anthropic (Claude) | Pay-per-use | $5.00 | — | ~$0.01/narrative; est. low vol |
| 12 | Google Maps Platform | Pay-as-you-go | $0.00 | $200/mo free credit | Autocomplete + Geocoding |
| 13 | Sentry | Free | $0.00 | 5K errors/mo | Error monitoring |
| 14 | Resend | Free | $0.00 | 3,000 emails/mo | Transactional email |
| 15 | RevenueCat | Free | $0.00 | < $2,500 MTR | 1% of MTR above threshold |
| | **TOTAL FIXED** | | **$386.83** | | |

### Costs Not Included Above (Verify / Add)

| Item | Estimated Cost | Notes |
|------|---------------|-------|
| GitHub (private repos) | $0–$4/mo | Free for individual; Team $4/user/mo |
| Cursor IDE | $20/mo | If used for development |
| SSL certificates | $0 | Included with Vercel + Railway |
| Redis (managed) | $0 | Included in Railway usage credit |
| PostgreSQL (managed) | $0 | Included in Railway usage credit |
| Stripe fixed fees | $0 | No monthly platform fee |
| Accounting / bookkeeping | $0–$50/mo | Manual or service |
| Business insurance | $0–$100/mo | E&O / general liability |
| Legal (entity, ToS) | ~$50/mo | $600/yr amortized |
| Marketing / ads | $0+ | Variable; not included in breakeven |
| Founder salary | $0+ | Not included; critical at scale |

---

## 3. Variable Costs (Scale With Subscribers)

### API Consumption Per Property Search

Each cold property search (cache miss) triggers parallel requests:

| Provider | Calls/Search | Calls/Active Sub/Month |
|----------|-------------|----------------------|
| RentCast | 4 | 42 |
| Zillow / AXESSO | 1.5 (avg) | 16 |
| Redfin (RapidAPI) | 2 | 21 |
| Realtor (RapidAPI) | 2 | 21 |
| **Total** | **~10** | **~100** |

**Assumptions:**
- 60% of paid subscribers are active in any given month
- Active subscriber averages 15 unique property searches/month
- Redis cache (24h TTL) yields ~30% hit rate → ~10.5 cold searches/month
- Free-tier users: ~10× paid count, but capped at 3 analyses/month

### Anthropic Claude (Appraisal Narratives)

- Model: Claude Sonnet 4 — $3/MTok input, $15/MTok output
- ~200 input tokens + ~600 output tokens per narrative ≈ **$0.01/call**
- Triggered per property analysis, not every search

### Stripe Processing (Already in Blended ARPU)

- Monthly: $1.46/txn (2.9% × $39.99 + $0.30)
- Annual: $10.45/txn ($349.99 × 2.9% + $0.30) → $0.87/mo amortized

### App Store Commission (Already in Blended ARPU)

- 15% on all mobile subscription revenue (Apple Small Business Program / Google)

---

## 4. Breakeven Analysis

### Minimum Subscribers to Cover Fixed Costs

```
Breakeven = Total Fixed Costs ÷ Blended Net ARPU

           = $386.83 ÷ $34.12

           = 11.34

           ≈ 12 Pro subscribers
```

**At 12 Pro subscribers, the platform covers all current infrastructure costs.**

### Breakeven Sensitivity by Channel Mix

| Scenario | Blended Net ARPU | Breakeven Subs |
|----------|-----------------|---------------|
| 100% Web Monthly | $38.53 | 11 |
| 100% Web Annual | $28.30 | 14 |
| 100% iOS Monthly | $33.99 | 12 |
| 100% iOS Annual | $24.79 | 16 |
| **Blended (base case)** | **$34.12** | **12** |
| Worst case (all mobile annual) | $24.79 | 16 |

---

## 5. Profitability by Subscriber Count

| Paid Subs | Active (60%) | Monthly Revenue (Net) | Fixed Costs | Variable API Costs | Anthropic | Total Costs | Monthly Profit/Loss |
|-----------|-------------|----------------------|-------------|-------------------|-----------|-------------|-------------------|
| 5 | 3 | $170.60 | $386.83 | $0.00 | $0.45 | $387.28 | **-$216.68** |
| 12 | 7 | $409.44 | $386.83 | $0.00 | $1.05 | $387.88 | **+$21.56** |
| 25 | 15 | $853.00 | $386.83 | $0.00 | $2.25 | $389.08 | **+$463.92** |
| 50 | 30 | $1,706.00 | $386.83 | $0.00 | $4.50 | $391.33 | **+$1,314.67** |
| 100 | 60 | $3,412.00 | $386.83 | $0.00 | $9.00 | $395.83 | **+$3,016.17** |
| 200 | 120 | $6,824.00 | $386.83 | $1.20 | $18.00 | $406.03 | **+$6,417.97** |
| 500 | 300 | $17,060.00 | $726.83 | $645.00 | $45.00 | $1,416.83 | **+$15,643.17** |
| 1,000 | 600 | $34,120.00 | $1,016.83 | $1,395.00 | $90.00 | $2,501.83 | **+$31,618.17** |

*Variable API costs = RentCast overage only (primary constraint); other APIs remain within quota at these volumes.*

---

## 6. API Capacity & Scaling Triggers

### RentCast (Binding Constraint)

| Paid Subs | Active Subs | RentCast Calls/Mo | Within 5K Plan? | Overage Cost | Optimal Plan |
|-----------|-------------|-------------------|-----------------|-------------|-------------|
| 12 | 7 | 294 | Yes | $0 | Growth ($199) |
| 25 | 15 | 630 | Yes | $0 | Growth ($199) |
| 50 | 30 | 1,260 | Yes | $0 | Growth ($199) |
| 100 | 60 | 2,520 | Yes | $0 | Growth ($199) |
| 119 | 71 | ~5,000 | At limit | $0 | Growth ($199) |
| 200 | 120 | 5,040 | **No** | $1.20 | Growth + overage |
| 300 | 180 | 7,560 | No | $76.80 | Scale saves $27 |
| 500 | 300 | 12,600 | No | $228.00 | Scale ($449) saves $79 |
| 750 | 450 | 18,900 | No | $417.00 | Scale ($449) saves $167 |
| 1,000 | 600 | 25,200 | No | $606.00 | Scale + $3 overage |

**Crossover point: ~300 subscribers → upgrade from Growth ($199) to Scale ($449).**
Scale plan: 25,000 req/mo at $449 with $0.015/req overage.

### All Provider Capacity Summary

| Provider | Included Quota | Calls/Active Sub/Mo | Max Active Subs on Plan | Max Paid Subs (60% active) |
|----------|---------------|--------------------|-----------------------|--------------------------|
| **RentCast** | **5,000** | **42** | **~119** | **~198** |
| Zillow / AXESSO | 100,000 | 16 | ~6,250 | ~10,400 |
| Redfin (RapidAPI) | ~1,000+ | 21 | ~48+ | ~80+ |
| Realtor (RapidAPI) | ~1,000+ | 21 | ~48+ | ~80+ |

> **Note:** RapidAPI quotas for Redfin and Realtor should be verified in dashboard.
> These may become a constraint before RentCast depending on actual plan limits.
> At ~80 paid subscribers, verify RapidAPI usage and consider plan upgrades.

### Infrastructure Scaling Triggers

| Subscribers | Trigger | Action Required | Cost Impact |
|-------------|---------|----------------|-------------|
| ~80 | RapidAPI quotas (verify) | Upgrade Redfin + Realtor plans | +$20–50/mo each |
| ~200 | RentCast 5K limit | Pay overage or evaluate Scale | +$0–250/mo |
| ~300 | RentCast overage > Scale savings | Upgrade to Scale ($449) | +$250/mo |
| ~500 | Railway compute usage | Higher resource consumption | +$20–80/mo |
| ~500 | Expo 3K MAU limit | Upgrade to Production ($199) | +$180/mo |
| ~1,000 | Vercel bandwidth/functions | May need Team or Enterprise | +$20–100/mo |
| ~2,500 | RevenueCat $2,500 MTR | 1% of mobile MTR kicks in | ~$25–100/mo |
| ~5,000 | Zillow 100K limit | Upgrade to Business (€150) | +$82/mo |

---

## 7. Projected P&L at Scale Milestones

### Scenario A: 50 Subscribers (Early Traction)

| | Monthly |
|---|--------|
| Gross Revenue | $1,850 |
| Payment Processing | -$144 |
| **Net Revenue** | **$1,706** |
| Fixed Infrastructure | -$387 |
| Variable API Costs | -$5 |
| **Operating Profit** | **$1,314** |
| **Margin** | **77%** |

### Scenario B: 250 Subscribers (Growth)

| | Monthly |
|---|--------|
| Gross Revenue | $9,248 |
| Payment Processing | -$718 |
| **Net Revenue** | **$8,530** |
| Fixed Infrastructure (upgraded RentCast Scale) | -$637 |
| Variable API Costs (RapidAPI upgrades) | -$80 |
| Anthropic | -$38 |
| RevenueCat (if > $2,500 MTR) | -$25 |
| **Operating Profit** | **$7,750** |
| **Margin** | **84%** |

### Scenario C: 1,000 Subscribers (Scale)

| | Monthly |
|---|--------|
| Gross Revenue | $36,990 |
| Payment Processing | -$2,870 |
| **Net Revenue** | **$34,120** |
| Fixed Infrastructure | -$1,017 |
| Variable API Costs | -$1,395 |
| Anthropic | -$90 |
| Expo Production | -$199 |
| RevenueCat (1% mobile MTR) | -$100 |
| **Operating Profit** | **$31,319** |
| **Margin** | **85%** |

---

## 8. Annual Projection Summary

| Metric | Year 1 (avg 30 subs) | Year 2 (avg 150 subs) | Year 3 (avg 500 subs) |
|--------|---------------------|----------------------|----------------------|
| Annual Gross Revenue | $13,320 | $66,600 | $222,000 |
| Annual Net Revenue | $12,283 | $61,416 | $204,720 |
| Annual Infrastructure | -$4,642 | -$6,444 | -$12,204 |
| Annual Variable Costs | -$60 | -$1,140 | -$10,080 |
| **Annual Operating Profit** | **$7,581** | **$53,832** | **$182,436** |
| **Operating Margin** | **62%** | **81%** | **82%** |

*Year 1 assumes ramp from 0 to 50 subscribers. Years 2–3 assume steady growth.*

---

## 9. Key Assumptions & Risks

### Assumptions

1. **Activity rate:** 60% of paid subscribers active monthly
2. **Searches per active sub:** 15 unique property searches/month
3. **Cache hit rate:** 30% (reduces cold API calls)
4. **Channel mix:** 80% web / 20% mobile (early stage)
5. **Billing mix:** 65% monthly / 35% annual
6. **Apple Small Business Program:** 15% commission (requires < $1M/yr revenue)
7. **Free-to-paid conversion:** Not modeled in costs; free users consume minimal API quota

### Key Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| RentCast price increase | $199→$449 jump is steep | Monitor usage; optimize caching |
| AXESSO/Zillow API discontinued | Lose Zestimate + rent Zestimate | Build fallback to direct Zillow API |
| RapidAPI plan changes | Redfin/Realtor data loss | Evaluate direct API access |
| Apple rejects Small Business Program | Commission jumps 15%→30% | Web-first acquisition strategy |
| Low annual conversion | Lower blended ARPU | Incentivize annual with deeper discount |
| High churn (> 10%/mo) | Never reaches scale thresholds | Focus on retention, feature value |
| Free tier API abuse | Consumes paid API quota | Enforce rate limits; reduce free cap if needed |

### Cost Optimization Levers

1. **Extend cache TTL** from 24h to 48–72h for stable markets (reduces API calls 30–50%)
2. **Lazy-load providers:** Only call Redfin/Realtor on user drill-down, not initial search
3. **Annual billing incentives:** Higher annual mix improves cash flow despite lower ARPU
4. **RentCast batching:** Consolidate property + value + rent into fewer calls where possible
5. **Negotiate enterprise pricing** at 500+ subscribers for RentCast and AXESSO

---

## 10. Summary

| | |
|---|---|
| **Current monthly burn (zero subscribers)** | **$386.83** |
| **Breakeven subscribers** | **12 Pro subscribers** |
| **Breakeven monthly revenue** | **~$480 gross / $410 net** |
| **Primary cost driver** | RentCast API ($199 = 51% of fixed costs) |
| **First scaling constraint** | RapidAPI quotas (~80 subs) or RentCast (~200 subs) |
| **Gross margin at 100 subs** | ~88% |
| **Gross margin at 1,000 subs** | ~85% |

The business has strong unit economics. Infrastructure costs are largely fixed up to
~200 subscribers, meaning every subscriber beyond breakeven contributes ~$34/month
in near-pure margin. The primary scaling cost is RentCast, which represents the single
largest line item and the first API to hit quota limits.
