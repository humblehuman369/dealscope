/**
 * Appraisal Calculations — Weighted Hybrid Property Valuation
 * Matches frontend/src/utils/appraisalCalculations.ts
 *
 * Implements professional appraisal methodology combining:
 * - Adjusted price method (accounts for property differences)
 * - Price-per-sqft method (normalized comparison)
 * - Similarity weighting (higher weight for more similar comps)
 */

// ============================================
// TYPES
// ============================================

export interface SubjectProperty {
  address?: string;
  sqft: number;
  beds: number;
  baths: number;
  yearBuilt: number;
  lotSize: number;
  rehabCost?: number;
}

export interface CompProperty {
  id: string | number;
  zpid?: string;
  address: string;
  price: number; // Sale price or rent
  sqft: number;
  beds: number;
  baths: number;
  yearBuilt: number;
  lotSize: number;
  distance: number;
  pricePerSqft?: number;
}

export interface SimilarityScores {
  location: number;
  size: number;
  bedBath: number;
  age: number;
  lot: number;
  overall: number;
}

export interface CompAdjustment {
  compId: string | number;
  compAddress: string;
  basePrice: number;
  sizeAdjustment: number;
  bedroomAdjustment: number;
  bathroomAdjustment: number;
  ageAdjustment: number;
  lotAdjustment: number;
  totalAdjustment: number;
  adjustedPrice: number;
  pricePerSqft: number;
  similarityScore: number;
  weight: number;
}

export interface AppraisalResult {
  marketValue: number;
  arv: number;
  confidence: number;
  rangeLow: number;
  rangeHigh: number;
  adjustedPriceValue: number;
  pricePerSqftValue: number;
  weightedAveragePpsf: number;
  compAdjustments: CompAdjustment[];
  compCount: number;
  avgSimilarity: number;
}

export interface RentAppraisalResult {
  marketRent: number;
  improvedRent: number;
  confidence: number;
  rangeLow: number;
  rangeHigh: number;
  rentPerSqft: number;
  compAdjustments: CompAdjustment[];
  compCount: number;
  avgSimilarity: number;
}

// ============================================
// ADJUSTMENT FACTORS
// ============================================

export const SALE_ADJUSTMENT_FACTORS = {
  sqftAdjustmentPerSqft: 100,
  bedroomAdjustment: 15000,
  bathroomAdjustment: 10000,
  ageAdjustmentPerYear: 1500,
  lotAdjustmentPerAcre: 25000,
  // Hybrid method weights
  adjustedPriceWeight: 0.40,
  pricePerSqftWeight: 0.40,
  hybridBlendWeight: 0.20,
  // Similarity scoring weights
  locationWeight: 0.25,
  sizeWeight: 0.25,
  bedBathWeight: 0.20,
  ageWeight: 0.15,
  lotWeight: 0.15,
};

export const RENT_ADJUSTMENT_FACTORS = {
  sqftAdjustmentPerSqft: 0.50,
  bedroomAdjustment: 150,
  bathroomAdjustment: 75,
};

// ============================================
// SIMILARITY CALCULATIONS
// ============================================

/** Calculate similarity score between subject property and comp. */
export function calculateSimilarityScore(
  subject: SubjectProperty,
  comp: CompProperty,
): SimilarityScores {
  const f = SALE_ADJUSTMENT_FACTORS;

  // Location (distance-based)
  const locationScore = Math.max(0, Math.min(100, 100 - comp.distance * 20));

  // Size (sqft difference)
  const sqftDiffPct =
    subject.sqft > 0
      ? (Math.abs(subject.sqft - comp.sqft) / subject.sqft) * 100
      : 30;
  const sizeScore = Math.max(0, 100 - sqftDiffPct);

  // Bed/Bath
  const bedDiff = Math.abs(subject.beds - comp.beds);
  const bathDiff = Math.abs(subject.baths - comp.baths);
  let bedBathScore: number;
  if (bedDiff === 0 && bathDiff === 0) bedBathScore = 100;
  else if (bedDiff <= 1 && bathDiff <= 1) bedBathScore = 85;
  else bedBathScore = Math.max(50, 100 - bedDiff * 15 - bathDiff * 10);

  // Age
  const yearDiff = Math.abs(subject.yearBuilt - comp.yearBuilt);
  const ageScore = Math.max(0, 100 - yearDiff * 2);

  // Lot size
  const lotDiffPct =
    subject.lotSize > 0 && comp.lotSize > 0
      ? (Math.abs(subject.lotSize - comp.lotSize) / subject.lotSize) * 100
      : 20;
  const lotScore = Math.max(0, 100 - lotDiffPct);

  const overall =
    locationScore * f.locationWeight +
    sizeScore * f.sizeWeight +
    bedBathScore * f.bedBathWeight +
    ageScore * f.ageWeight +
    lotScore * f.lotWeight;

  return {
    location: Math.round(locationScore),
    size: Math.round(sizeScore),
    bedBath: Math.round(bedBathScore),
    age: Math.round(ageScore),
    lot: Math.round(lotScore),
    overall: Math.round(overall),
  };
}

// ============================================
// ADJUSTMENT CALCULATIONS
// ============================================

/** Calculate price adjustments for a sale comp. */
export function calculateSaleAdjustments(
  subject: SubjectProperty,
  comp: CompProperty,
): {
  size: number;
  bedroom: number;
  bathroom: number;
  age: number;
  lot: number;
  total: number;
} {
  const f = SALE_ADJUSTMENT_FACTORS;
  const size = (subject.sqft - comp.sqft) * f.sqftAdjustmentPerSqft;
  const bedroom = (subject.beds - comp.beds) * f.bedroomAdjustment;
  const bathroom = (subject.baths - comp.baths) * f.bathroomAdjustment;
  const age = (subject.yearBuilt - comp.yearBuilt) * f.ageAdjustmentPerYear;
  const lot = (subject.lotSize - comp.lotSize) * f.lotAdjustmentPerAcre;
  return { size, bedroom, bathroom, age, lot, total: size + bedroom + bathroom + age + lot };
}

/** Calculate rent adjustments for a rental comp. */
export function calculateRentAdjustments(
  subject: SubjectProperty,
  comp: CompProperty,
): { size: number; bedroom: number; bathroom: number; total: number } {
  const f = RENT_ADJUSTMENT_FACTORS;
  const size = (subject.sqft - comp.sqft) * f.sqftAdjustmentPerSqft;
  const bedroom = (subject.beds - comp.beds) * f.bedroomAdjustment;
  const bathroom = (subject.baths - comp.baths) * f.bathroomAdjustment;
  return { size, bedroom, bathroom, total: size + bedroom + bathroom };
}

// ============================================
// WEIGHTED HYBRID CALCULATIONS
// ============================================

function weightedAverage(items: { value: number; weight: number }[]): number {
  if (items.length === 0) return 0;
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  if (totalWeight === 0) {
    return items.reduce((s, i) => s + i.value, 0) / items.length;
  }
  return items.reduce((s, i) => s + i.value * i.weight, 0) / totalWeight;
}

/** Calculate market value and ARV using weighted hybrid methodology. */
export function calculateAppraisalValues(
  subject: SubjectProperty,
  selectedComps: CompProperty[],
  rehabPremiumPct: number = 0.15,
): AppraisalResult {
  if (selectedComps.length === 0) {
    return {
      marketValue: 0, arv: 0, confidence: 0, rangeLow: 0, rangeHigh: 0,
      adjustedPriceValue: 0, pricePerSqftValue: 0, weightedAveragePpsf: 0,
      compAdjustments: [], compCount: 0, avgSimilarity: 0,
    };
  }

  const f = SALE_ADJUSTMENT_FACTORS;
  const compAdjustments: CompAdjustment[] = [];

  for (const comp of selectedComps) {
    const similarity = calculateSimilarityScore(subject, comp);
    const adjustments = calculateSaleAdjustments(subject, comp);
    const ppsf = comp.sqft > 0 ? comp.price / comp.sqft : 0;

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
      pricePerSqft: Math.round(ppsf * 100) / 100,
      similarityScore: similarity.overall,
      weight: 0,
    });
  }

  // Similarity-based weights
  const totalSimilarity = compAdjustments.reduce((s, c) => s + c.similarityScore, 0);
  if (totalSimilarity > 0) {
    for (const ca of compAdjustments) {
      ca.weight = Math.round((ca.similarityScore / totalSimilarity) * 10000) / 10000;
    }
  } else {
    const eq = Math.round((1 / compAdjustments.length) * 10000) / 10000;
    for (const ca of compAdjustments) ca.weight = eq;
  }

  // Method 1: Weighted adjusted price average
  const weightedAdjustedAvg = weightedAverage(
    compAdjustments.map((c) => ({ value: c.adjustedPrice, weight: c.weight })),
  );

  // Method 2: Weighted price-per-sqft
  const weightedPpsf = weightedAverage(
    compAdjustments.map((c) => ({ value: c.pricePerSqft, weight: c.weight })),
  );
  const sqftValue = weightedPpsf * subject.sqft;

  // Hybrid blend
  const marketValue =
    weightedAdjustedAvg * f.adjustedPriceWeight +
    sqftValue * f.pricePerSqftWeight +
    ((weightedAdjustedAvg + sqftValue) / 2) * f.hybridBlendWeight;

  const adjustedPrices = compAdjustments.map((c) => c.adjustedPrice);
  const rangeLow = Math.min(...adjustedPrices);
  const rangeHigh = Math.max(...adjustedPrices);

  // ARV
  let arv: number;
  if (subject.rehabCost && subject.rehabCost > 0) {
    arv = marketValue + subject.rehabCost * (1 + rehabPremiumPct);
  } else {
    arv = marketValue * (1 + rehabPremiumPct);
  }

  // Confidence
  const avgSimilarity =
    compAdjustments.reduce((s, c) => s + c.similarityScore, 0) / compAdjustments.length;
  const compCountScore = Math.min(compAdjustments.length * 15, 40);
  const simScore = (avgSimilarity / 100) * 40;
  const confidence = Math.min(100, Math.round(compCountScore + simScore + 20));

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
  };
}

/** Calculate rental value using weighted hybrid methodology. */
export function calculateRentAppraisalValues(
  subject: SubjectProperty,
  selectedComps: CompProperty[],
  improvementPremiumPct: number = 0.10,
): RentAppraisalResult {
  if (selectedComps.length === 0) {
    return {
      marketRent: 0, improvedRent: 0, confidence: 0, rangeLow: 0, rangeHigh: 0,
      rentPerSqft: 0, compAdjustments: [], compCount: 0, avgSimilarity: 0,
    };
  }

  const compAdjustments: CompAdjustment[] = [];

  for (const comp of selectedComps) {
    const similarity = calculateSimilarityScore(subject, comp);
    const adjustments = calculateRentAdjustments(subject, comp);
    const rpsf = comp.sqft > 0 ? comp.price / comp.sqft : 0;

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
      pricePerSqft: Math.round(rpsf * 100) / 100,
      similarityScore: similarity.overall,
      weight: 0,
    });
  }

  // Weights
  const totalSim = compAdjustments.reduce((s, c) => s + c.similarityScore, 0);
  if (totalSim > 0) {
    for (const ca of compAdjustments) {
      ca.weight = Math.round((ca.similarityScore / totalSim) * 10000) / 10000;
    }
  } else {
    const eq = Math.round((1 / compAdjustments.length) * 10000) / 10000;
    for (const ca of compAdjustments) ca.weight = eq;
  }

  const weightedAdjRent = weightedAverage(
    compAdjustments.map((c) => ({ value: c.adjustedPrice, weight: c.weight })),
  );
  const weightedRpsf = weightedAverage(
    compAdjustments.map((c) => ({ value: c.pricePerSqft, weight: c.weight })),
  );
  const sqftRent = weightedRpsf * subject.sqft;

  // Hybrid blend (50/50 for rent)
  const marketRent = weightedAdjRent * 0.5 + sqftRent * 0.5;

  const adjustedRents = compAdjustments.map((c) => c.adjustedPrice);
  const rangeLow = Math.min(...adjustedRents);
  const rangeHigh = Math.max(...adjustedRents);

  const improvedRent = marketRent * (1 + improvementPremiumPct);

  const avgSimilarity =
    compAdjustments.reduce((s, c) => s + c.similarityScore, 0) / compAdjustments.length;
  const compCountScore = Math.min(compAdjustments.length * 15, 40);
  const simScore = (avgSimilarity / 100) * 40;
  const confidence = Math.min(100, Math.round(compCountScore + simScore + 20));

  return {
    marketRent: Math.round(marketRent),
    improvedRent: Math.round(improvedRent),
    confidence,
    rangeLow: Math.round(rangeLow),
    rangeHigh: Math.round(rangeHigh),
    rentPerSqft: Math.round(weightedRpsf * 100) / 100,
    compAdjustments,
    compCount: compAdjustments.length,
    avgSimilarity: Math.round(avgSimilarity),
  };
}

/** Parse comp data from API response into CompProperty format. */
export function parseCompFromApi(
  apiComp: Record<string, unknown>,
  index: number,
): CompProperty {
  return {
    id:
      (apiComp.zpid as string) ||
      (apiComp.id as string) ||
      `comp-${index}`,
    zpid: apiComp.zpid as string | undefined,
    address:
      (apiComp.address as string) ||
      (apiComp.streetAddress as string) ||
      `${apiComp.street || ''}, ${apiComp.city || ''}, ${apiComp.state || ''}`.trim(),
    price:
      (apiComp.price as number) ||
      (apiComp.salePrice as number) ||
      (apiComp.soldPrice as number) ||
      (apiComp.rent as number) ||
      (apiComp.monthlyRent as number) ||
      0,
    sqft:
      (apiComp.sqft as number) ||
      (apiComp.squareFootage as number) ||
      (apiComp.livingArea as number) ||
      1500,
    beds: (apiComp.beds as number) || (apiComp.bedrooms as number) || 3,
    baths: (apiComp.baths as number) || (apiComp.bathrooms as number) || 2,
    yearBuilt:
      (apiComp.yearBuilt as number) || (apiComp.year_built as number) || 2000,
    lotSize:
      (apiComp.lotSize as number) || (apiComp.lot_size as number) || 0.25,
    distance: (apiComp.distance as number) || 1.0,
    pricePerSqft:
      (apiComp.pricePerSqft as number) ||
      (apiComp.price_per_sqft as number),
  };
}
