/**
 * Appraisal Calculations Utility
 * 
 * Provides weighted hybrid calculations for deriving property values from comps.
 * Implements professional appraisal methodology combining:
 * - Adjusted price method (accounts for property differences)
 * - Price-per-sqft method (normalized comparison)
 * - Similarity weighting (higher weight for more similar comps)
 */

// ============================================
// TYPES
// ============================================

export interface SubjectProperty {
  address?: string
  sqft: number
  beds: number
  baths: number
  yearBuilt: number
  lotSize: number
  rehabCost?: number
}

export interface CompProperty {
  id: string | number
  zpid?: string
  address: string
  price: number  // Sale price or rent
  sqft: number
  beds: number
  baths: number
  yearBuilt: number
  lotSize: number
  distance: number
  pricePerSqft?: number
}

export interface SimilarityScores {
  location: number
  size: number
  bedBath: number
  age: number
  lot: number
  overall: number
}

export interface CompAdjustment {
  compId: string | number
  compAddress: string
  basePrice: number
  sizeAdjustment: number
  bedroomAdjustment: number
  bathroomAdjustment: number
  ageAdjustment: number
  lotAdjustment: number
  totalAdjustment: number
  adjustedPrice: number
  pricePerSqft: number
  similarityScore: number
  weight: number
}

export interface AppraisalResult {
  marketValue: number
  arv: number
  confidence: number
  rangeLow: number
  rangeHigh: number
  adjustedPriceValue: number
  pricePerSqftValue: number
  weightedAveragePpsf: number
  compAdjustments: CompAdjustment[]
  compCount: number
  avgSimilarity: number
}

export interface RentAppraisalResult {
  marketRent: number
  improvedRent: number
  confidence: number
  rangeLow: number
  rangeHigh: number
  rentPerSqft: number
  compAdjustments: CompAdjustment[]
  compCount: number
  avgSimilarity: number
}

// ============================================
// ADJUSTMENT FACTORS
// ============================================

export const SALE_ADJUSTMENT_FACTORS = {
  // Price adjustments per unit difference
  sqftAdjustmentPerSqft: 100,  // $ per sqft difference
  bedroomAdjustment: 15000,    // $ per bedroom difference
  bathroomAdjustment: 10000,   // $ per bathroom difference
  ageAdjustmentPerYear: 1500,  // $ per year age difference
  lotAdjustmentPerAcre: 25000, // $ per acre difference
  
  // Method weights for hybrid calculation
  adjustedPriceWeight: 0.40,
  pricePerSqftWeight: 0.40,
  hybridBlendWeight: 0.20,
  
  // Similarity scoring weights
  locationWeight: 0.25,
  sizeWeight: 0.25,
  bedBathWeight: 0.20,
  ageWeight: 0.15,
  lotWeight: 0.15,
}

export const RENT_ADJUSTMENT_FACTORS = {
  // Monthly rent adjustments per unit difference
  sqftAdjustmentPerSqft: 0.50,  // $ per sqft difference per month
  bedroomAdjustment: 150,       // $ per bedroom difference per month
  bathroomAdjustment: 75,       // $ per bathroom difference per month
}

// ============================================
// SIMILARITY CALCULATIONS
// ============================================

/**
 * Calculate similarity score between subject property and comp.
 */
export function calculateSimilarityScore(
  subject: SubjectProperty,
  comp: CompProperty
): SimilarityScores {
  const factors = SALE_ADJUSTMENT_FACTORS
  
  // Location score (based on distance)
  const locationScore = Math.max(0, Math.min(100, 100 - (comp.distance * 20)))
  
  // Size score (based on sqft difference)
  const sqftDiffPct = subject.sqft > 0 
    ? Math.abs(subject.sqft - comp.sqft) / subject.sqft * 100
    : 30
  const sizeScore = Math.max(0, 100 - sqftDiffPct)
  
  // Bed/Bath score
  const bedDiff = Math.abs(subject.beds - comp.beds)
  const bathDiff = Math.abs(subject.baths - comp.baths)
  let bedBathScore: number
  if (bedDiff === 0 && bathDiff === 0) {
    bedBathScore = 100
  } else if (bedDiff <= 1 && bathDiff <= 1) {
    bedBathScore = 85
  } else {
    bedBathScore = Math.max(50, 100 - (bedDiff * 15) - (bathDiff * 10))
  }
  
  // Age score -- skip if either yearBuilt is missing/invalid
  const currentYear = new Date().getFullYear()
  const validYear = (y: number) => y >= 1800 && y <= currentYear
  const yearDiff = (validYear(subject.yearBuilt) && validYear(comp.yearBuilt))
    ? Math.abs(subject.yearBuilt - comp.yearBuilt)
    : 0
  const ageScore = Math.max(0, 100 - (yearDiff * 2))
  
  // Lot score
  const lotDiffPct = subject.lotSize > 0 && comp.lotSize > 0
    ? Math.abs(subject.lotSize - comp.lotSize) / subject.lotSize * 100
    : 20
  const lotScore = Math.max(0, 100 - lotDiffPct)
  
  // Calculate overall weighted score
  const overall = (
    locationScore * factors.locationWeight +
    sizeScore * factors.sizeWeight +
    bedBathScore * factors.bedBathWeight +
    ageScore * factors.ageWeight +
    lotScore * factors.lotWeight
  )
  
  return {
    location: Math.round(locationScore),
    size: Math.round(sizeScore),
    bedBath: Math.round(bedBathScore),
    age: Math.round(ageScore),
    lot: Math.round(lotScore),
    overall: Math.round(overall),
  }
}

// ============================================
// ADJUSTMENT CALCULATIONS
// ============================================

/**
 * Calculate price adjustments for a sale comp relative to subject.
 * Positive adjustments increase comp's value (comp is inferior).
 * Negative adjustments decrease comp's value (comp is superior).
 */
export function calculateSaleAdjustments(
  subject: SubjectProperty,
  comp: CompProperty
): { size: number; bedroom: number; bathroom: number; age: number; lot: number; total: number } {
  const f = SALE_ADJUSTMENT_FACTORS
  
  const currentYear = new Date().getFullYear()
  const validYear = (y: number) => y >= 1800 && y <= currentYear
  
  const size = (subject.sqft - comp.sqft) * f.sqftAdjustmentPerSqft
  const bedroom = (subject.beds - comp.beds) * f.bedroomAdjustment
  const bathroom = (subject.baths - comp.baths) * f.bathroomAdjustment
  const age = (validYear(subject.yearBuilt) && validYear(comp.yearBuilt))
    ? (subject.yearBuilt - comp.yearBuilt) * f.ageAdjustmentPerYear
    : 0
  const lot = (subject.lotSize > 0 && comp.lotSize > 0)
    ? (subject.lotSize - comp.lotSize) * f.lotAdjustmentPerAcre
    : 0
  const total = size + bedroom + bathroom + age + lot
  
  return { size, bedroom, bathroom, age, lot, total }
}

/**
 * Calculate rent adjustments for a rental comp relative to subject.
 */
export function calculateRentAdjustments(
  subject: SubjectProperty,
  comp: CompProperty
): { size: number; bedroom: number; bathroom: number; total: number } {
  const f = RENT_ADJUSTMENT_FACTORS
  
  const size = (subject.sqft - comp.sqft) * f.sqftAdjustmentPerSqft
  const bedroom = (subject.beds - comp.beds) * f.bedroomAdjustment
  const bathroom = (subject.baths - comp.baths) * f.bathroomAdjustment
  const total = size + bedroom + bathroom
  
  return { size, bedroom, bathroom, total }
}

// ============================================
// WEIGHTED HYBRID CALCULATIONS
// ============================================

/**
 * Calculate weighted average where items with higher similarity get more weight.
 */
function weightedAverage(items: { value: number; weight: number }[]): number {
  if (items.length === 0) return 0
  
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  if (totalWeight === 0) {
    // Equal weights if no weights provided
    return items.reduce((sum, item) => sum + item.value, 0) / items.length
  }
  
  return items.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight
}

/**
 * Calculate market value and ARV using weighted hybrid methodology.
 */
export function calculateAppraisalValues(
  subject: SubjectProperty,
  selectedComps: CompProperty[],
  rehabPremiumPct: number = 0.15
): AppraisalResult {
  if (selectedComps.length === 0) {
    return {
      marketValue: 0,
      arv: 0,
      confidence: 0,
      rangeLow: 0,
      rangeHigh: 0,
      adjustedPriceValue: 0,
      pricePerSqftValue: 0,
      weightedAveragePpsf: 0,
      compAdjustments: [],
      compCount: 0,
      avgSimilarity: 0,
    }
  }
  
  const f = SALE_ADJUSTMENT_FACTORS
  const compAdjustments: CompAdjustment[] = []
  
  // Calculate adjustments and similarity for each comp
  for (const comp of selectedComps) {
    const similarity = calculateSimilarityScore(subject, comp)
    const adjustments = calculateSaleAdjustments(subject, comp)
    const pricePerSqft = comp.sqft > 0 ? comp.price / comp.sqft : 0
    
    compAdjustments.push({
      compId: comp.id,
      compAddress: comp.address,
      basePrice: comp.price,
      sizeAdjustment: Math.round(adjustments.size),
      bedroomAdjustment: Math.round(adjustments.bedroom),
      bathroomAdjustment: Math.round(adjustments.bathroom),
      ageAdjustment: Math.round(adjustments.age),
      lotAdjustment: Math.round(adjustments.lot),
      totalAdjustment: Math.round(adjustments.total),
      adjustedPrice: Math.round(comp.price + adjustments.total),
      pricePerSqft: Math.round(pricePerSqft * 100) / 100,
      similarityScore: similarity.overall,
      weight: 0, // Will be calculated after all similarities are known
    })
  }
  
  // Calculate weights based on similarity scores
  const totalSimilarity = compAdjustments.reduce((sum, ca) => sum + ca.similarityScore, 0)
  if (totalSimilarity > 0) {
    for (const ca of compAdjustments) {
      ca.weight = Math.round((ca.similarityScore / totalSimilarity) * 10000) / 10000
    }
  } else {
    const equalWeight = Math.round((1 / compAdjustments.length) * 10000) / 10000
    for (const ca of compAdjustments) {
      ca.weight = equalWeight
    }
  }
  
  // Method 1: Weighted adjusted price average
  const weightedAdjustedAvg = weightedAverage(
    compAdjustments.map(ca => ({ value: ca.adjustedPrice, weight: ca.weight }))
  )
  
  // Method 2: Weighted price-per-sqft
  const weightedPpsf = weightedAverage(
    compAdjustments.map(ca => ({ value: ca.pricePerSqft, weight: ca.weight }))
  )
  const sqftValue = weightedPpsf * subject.sqft
  
  // Hybrid blend
  const marketValue = (
    weightedAdjustedAvg * f.adjustedPriceWeight +
    sqftValue * f.pricePerSqftWeight +
    ((weightedAdjustedAvg + sqftValue) / 2) * f.hybridBlendWeight
  )
  
  // Calculate range
  const adjustedPrices = compAdjustments.map(ca => ca.adjustedPrice)
  const rangeLow = Math.min(...adjustedPrices)
  const rangeHigh = Math.max(...adjustedPrices)
  
  // Calculate ARV
  let arv: number
  if (subject.rehabCost && subject.rehabCost > 0) {
    arv = marketValue + (subject.rehabCost * (1 + rehabPremiumPct))
  } else {
    arv = marketValue * (1 + rehabPremiumPct)
  }
  
  // Calculate confidence score
  const avgSimilarity = compAdjustments.reduce((sum, ca) => sum + ca.similarityScore, 0) / compAdjustments.length
  const compCountScore = Math.min(compAdjustments.length * 15, 40) // Max 40 points
  const similarityScore = (avgSimilarity / 100) * 40 // Max 40 points
  const baseScore = 20 // Base 20 points
  const confidence = Math.min(100, Math.round(compCountScore + similarityScore + baseScore))
  
  return {
    marketValue: Math.round(marketValue),
    arv: Math.round(arv),
    confidence,
    rangeLow: Math.round(rangeLow),
    rangeHigh: Math.round(rangeHigh),
    adjustedPriceValue: Math.round(weightedAdjustedAvg),
    pricePerSqftValue: Math.round(sqftValue),
    weightedAveragePpsf: Math.round(weightedPpsf * 100) / 100,
    compAdjustments,
    compCount: compAdjustments.length,
    avgSimilarity: Math.round(avgSimilarity),
  }
}

/**
 * Calculate rental value using weighted hybrid methodology.
 */
export function calculateRentAppraisalValues(
  subject: SubjectProperty,
  selectedComps: CompProperty[],
  improvementPremiumPct: number = 0.10
): RentAppraisalResult {
  if (selectedComps.length === 0) {
    return {
      marketRent: 0,
      improvedRent: 0,
      confidence: 0,
      rangeLow: 0,
      rangeHigh: 0,
      rentPerSqft: 0,
      compAdjustments: [],
      compCount: 0,
      avgSimilarity: 0,
    }
  }
  
  const compAdjustments: CompAdjustment[] = []
  
  for (const comp of selectedComps) {
    const similarity = calculateSimilarityScore(subject, comp)
    const adjustments = calculateRentAdjustments(subject, comp)
    const rentPerSqft = comp.sqft > 0 ? comp.price / comp.sqft : 0
    
    compAdjustments.push({
      compId: comp.id,
      compAddress: comp.address,
      basePrice: comp.price,
      sizeAdjustment: Math.round(adjustments.size),
      bedroomAdjustment: Math.round(adjustments.bedroom),
      bathroomAdjustment: Math.round(adjustments.bathroom),
      ageAdjustment: 0,
      lotAdjustment: 0,
      totalAdjustment: Math.round(adjustments.total),
      adjustedPrice: Math.round(comp.price + adjustments.total),
      pricePerSqft: Math.round(rentPerSqft * 100) / 100,
      similarityScore: similarity.overall,
      weight: 0,
    })
  }
  
  // Calculate weights
  const totalSimilarity = compAdjustments.reduce((sum, ca) => sum + ca.similarityScore, 0)
  if (totalSimilarity > 0) {
    for (const ca of compAdjustments) {
      ca.weight = Math.round((ca.similarityScore / totalSimilarity) * 10000) / 10000
    }
  } else {
    const equalWeight = Math.round((1 / compAdjustments.length) * 10000) / 10000
    for (const ca of compAdjustments) {
      ca.weight = equalWeight
    }
  }
  
  // Calculate weighted averages
  const weightedAdjustedRent = weightedAverage(
    compAdjustments.map(ca => ({ value: ca.adjustedPrice, weight: ca.weight }))
  )
  const weightedRentPerSqft = weightedAverage(
    compAdjustments.map(ca => ({ value: ca.pricePerSqft, weight: ca.weight }))
  )
  const sqftRent = weightedRentPerSqft * subject.sqft
  
  // Hybrid blend (50/50 for rent)
  const marketRent = (weightedAdjustedRent * 0.5) + (sqftRent * 0.5)
  
  // Calculate range
  const adjustedRents = compAdjustments.map(ca => ca.adjustedPrice)
  const rangeLow = Math.min(...adjustedRents)
  const rangeHigh = Math.max(...adjustedRents)
  
  // Improved rent
  const improvedRent = marketRent * (1 + improvementPremiumPct)
  
  // Confidence
  const avgSimilarity = compAdjustments.reduce((sum, ca) => sum + ca.similarityScore, 0) / compAdjustments.length
  const compCountScore = Math.min(compAdjustments.length * 15, 40)
  const similarityScore = (avgSimilarity / 100) * 40
  const confidence = Math.min(100, Math.round(compCountScore + similarityScore + 20))
  
  return {
    marketRent: Math.round(marketRent),
    improvedRent: Math.round(improvedRent),
    confidence,
    rangeLow: Math.round(rangeLow),
    rangeHigh: Math.round(rangeHigh),
    rentPerSqft: Math.round(weightedRentPerSqft * 100) / 100,
    compAdjustments,
    compCount: compAdjustments.length,
    avgSimilarity: Math.round(avgSimilarity),
  }
}

// Re-export canonical formatters (previously defined locally)
export { formatCurrency, formatCompactCurrency } from '@/utils/formatters'

/**
 * Parse comp data from API response into CompProperty format.
 */
export function parseCompFromApi(apiComp: Record<string, unknown>, index: number): CompProperty {
  return {
    id: (apiComp.zpid as string) || (apiComp.id as string) || `comp-${index}`,
    zpid: apiComp.zpid as string,
    address: (apiComp.address as string) || 
             (apiComp.streetAddress as string) || 
             `${apiComp.street || ''}, ${apiComp.city || ''}, ${apiComp.state || ''}`.trim(),
    price: (apiComp.price as number) || 
           (apiComp.salePrice as number) || 
           (apiComp.soldPrice as number) || 
           (apiComp.rent as number) || 
           (apiComp.monthlyRent as number) || 0,
    sqft: (apiComp.sqft as number) || 
          (apiComp.squareFootage as number) || 
          (apiComp.livingArea as number) || 1500,
    beds: (apiComp.beds as number) || (apiComp.bedrooms as number) || 3,
    baths: (apiComp.baths as number) || (apiComp.bathrooms as number) || 2,
    yearBuilt: (apiComp.yearBuilt as number) || (apiComp.year_built as number) || 2000,
    lotSize: (apiComp.lotSize as number) || (apiComp.lot_size as number) || 0.25,
    distance: (apiComp.distance as number) || 1.0,
    pricePerSqft: (apiComp.pricePerSqft as number) || (apiComp.price_per_sqft as number),
  }
}
