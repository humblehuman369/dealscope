import type { PropertyResponse, SellerMotivationScore } from '@dealscope/shared'

export interface MotivatedSellerInsight {
  title: string
  detail: string
}

/** Title-case a negotiation-leverage enum ("high" -> "High"). */
function formatLeverage(leverage?: string | null): string | null {
  if (!leverage || leverage === 'unknown') return null
  return leverage.charAt(0).toUpperCase() + leverage.slice(1)
}

/**
 * Build investor-facing Key Insights from the motivated-seller signals on a
 * property search response. Returns an empty array when no signals exist so
 * the Discovery page renders nothing extra (never fabricated).
 *
 * Priority order: price cuts → listing language → top motivation indicators.
 */
export function buildMotivatedSellerInsights(
  data: Pick<PropertyResponse, 'listing' | 'seller_motivation'> | null | undefined,
): MotivatedSellerInsight[] {
  if (!data) return []
  const listing = data.listing
  const motivation: SellerMotivationScore | null | undefined = data.seller_motivation
  const insights: MotivatedSellerInsight[] = []

  // 1. Price cuts — strongest negotiation signal
  const cuts = listing?.price_reduction_count ?? 0
  if (cuts > 0) {
    const pct = listing?.total_price_reduction_pct
    const pctLabel = pct && pct > 0 ? ` totaling ${Math.round(pct * 100)}%` : ''
    insights.push({
      title: `${cuts} price reduction${cuts > 1 ? 's' : ''}${pctLabel}`,
      detail:
        'Repeated price cuts signal a seller adjusting to the market — a strong opening for a below-ask offer.',
    })
  }

  // 2. Motivated-seller language from the listing description
  const keywords = listing?.motivated_keywords ?? []
  if (keywords.length > 0) {
    const shown = keywords.slice(0, 4).join(', ')
    const more = keywords.length > 4 ? ` +${keywords.length - 4} more` : ''
    insights.push({
      title: `Listing language: ${shown}${more}`,
      detail:
        'The listing description uses investor / motivated-seller phrasing. These often indicate condition issues or urgency you can use as leverage.',
    })
  }

  // 3. Top detected motivation indicators (DOM, absentee, foreclosure, FSBO…)
  //    Skip "Poor Condition" — already covered by the listing-language insight.
  if (motivation?.indicators?.length) {
    const top = motivation.indicators
      .filter((i) => i.detected && i.score >= 60 && i.name !== 'Poor Condition')
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
    const leverage = formatLeverage(motivation.negotiation_leverage)
    for (const ind of top) {
      insights.push({
        title: ind.description || ind.name,
        detail: leverage
          ? `${leverage} negotiation leverage — typical discount range ${motivation.recommended_discount_range}.`
          : 'Adds to the seller-motivation profile for this property.',
      })
    }
  }

  return insights
}
