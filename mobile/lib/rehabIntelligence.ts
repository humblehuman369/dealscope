/**
 * RehabIntelligence — Intelligent Rehab Cost Estimation Engine
 * Matches frontend/src/lib/rehabIntelligence.ts
 *
 * A sophisticated rehab estimation system that accounts for:
 * - Asset class detection (prevents the "Luxury Trap")
 * - Location-based labor cost adjustments (Florida markets)
 * - Age-based CapEx warnings with permit awareness
 * - Property condition assessment
 * - Holding cost calculations ("the silent killer")
 *
 * Updated for 2025 South Florida construction costs.
 */

// ============================================
// TYPES & ENUMS
// ============================================

export type AssetClass = 'standard' | 'luxury' | 'ultra_luxury';
export type PropertyCondition = 'distressed' | 'fair' | 'good' | 'excellent';
export type RehabIntensity =
  | 'cosmetic'
  | 'light'
  | 'medium'
  | 'full'
  | 'luxury_upgrade';

export interface PropertyInput {
  sq_ft: number;
  year_built: number;
  arv: number;
  zip_code: string;
  bedrooms?: number;
  bathrooms?: number;
  condition?: PropertyCondition;
  has_pool?: boolean;
  roof_type?: 'shingle' | 'tile' | 'metal' | 'flat';
  stories?: number;
  garage_spaces?: number;
  lot_sqft?: number;
  hoa_monthly?: number;
  recent_permits?: string[];
}

export interface RehabBreakdown {
  kitchen: number;
  bathrooms: number;
  flooring: number;
  paint_walls: number;
  exterior: number;
  roof: number;
  hvac: number;
  electrical: number;
  plumbing: number;
  windows_doors: number;
  other: number;
  permits: number;
  contingency: number;
  construction_total: number;
  total: number;
}

export interface HoldingCosts {
  duration_months: number;
  monthly_interest: number;
  monthly_taxes: number;
  monthly_insurance: number;
  monthly_utilities: number;
  monthly_hoa: number;
  monthly_total: number;
  total_holding: number;
}

export interface CapExWarning {
  item: string;
  age: number;
  threshold: number;
  estimated_cost: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  notes: string;
}

export interface RehabEstimate {
  asset_class: AssetClass;
  location_factor: number;
  location_market: string;
  condition: PropertyCondition;
  breakdown: RehabBreakdown;
  capex_warnings: CapExWarning[];
  holding_costs: HoldingCosts | null;
  total_rehab: number;
  total_project_cost: number;
}

export interface LineItem {
  itemId: string;
  quantity: number;
  tier: 'low' | 'mid' | 'high';
  cost: number;
}

// ============================================
// LOCATION FACTORS — Florida Markets (2025)
// ============================================

interface LocationData {
  factor: number;
  market: string;
}

const LOCATION_FACTORS: Record<string, LocationData> = {
  // Palm Beach County — Premium Markets
  '33480': { factor: 1.45, market: 'Palm Beach Island' },
  '33483': { factor: 1.40, market: 'Delray Beach (Beach)' },
  '33444': { factor: 1.35, market: 'Delray Beach' },
  '33445': { factor: 1.30, market: 'Delray Beach (West)' },
  '33446': { factor: 1.30, market: 'Delray Beach (West)' },
  '33484': { factor: 1.35, market: 'Delray Beach (Linton)' },
  '33432': { factor: 1.40, market: 'Boca Raton (Beach)' },
  '33431': { factor: 1.35, market: 'Boca Raton' },
  '33433': { factor: 1.30, market: 'Boca Raton (West)' },
  '33434': { factor: 1.30, market: 'Boca Raton (West)' },
  '33487': { factor: 1.35, market: 'Boca Raton (Highland Beach)' },
  '33486': { factor: 1.35, market: 'Boca Raton' },
  '33496': { factor: 1.35, market: 'Boca Raton (West)' },
  '33498': { factor: 1.30, market: 'Boca Raton (West)' },
  '33460': { factor: 1.30, market: 'Lake Worth Beach' },
  '33461': { factor: 1.25, market: 'Lake Worth' },
  '33462': { factor: 1.25, market: 'Lake Worth' },
  '33463': { factor: 1.25, market: 'Lake Worth (West)' },
  '33401': { factor: 1.35, market: 'West Palm Beach (Downtown)' },
  '33405': { factor: 1.35, market: 'West Palm Beach (South)' },
  '33407': { factor: 1.25, market: 'West Palm Beach (North)' },
  '33409': { factor: 1.25, market: 'West Palm Beach' },
  '33411': { factor: 1.20, market: 'West Palm Beach (Royal Palm)' },
  '33412': { factor: 1.20, market: 'West Palm Beach (Loxahatchee)' },
  '33413': { factor: 1.20, market: 'West Palm Beach (West)' },
  '33414': { factor: 1.30, market: 'Wellington' },
  '33415': { factor: 1.20, market: 'West Palm Beach (West)' },
  '33417': { factor: 1.25, market: 'West Palm Beach' },
  '33418': { factor: 1.35, market: 'Palm Beach Gardens (North)' },
  '33410': { factor: 1.35, market: 'Palm Beach Gardens' },
  '33408': { factor: 1.30, market: 'North Palm Beach' },
  '33403': { factor: 1.30, market: 'Palm Beach Gardens' },
  '33404': { factor: 1.25, market: 'West Palm Beach (Riviera Beach)' },
  '33458': { factor: 1.35, market: 'Jupiter' },
  '33469': { factor: 1.40, market: 'Jupiter (Beach)' },
  '33477': { factor: 1.40, market: 'Jupiter (Inlet)' },
  '33478': { factor: 1.25, market: 'Jupiter (West)' },

  // Broward County
  '33301': { factor: 1.35, market: 'Fort Lauderdale (Downtown)' },
  '33304': { factor: 1.40, market: 'Fort Lauderdale (Beach)' },
  '33305': { factor: 1.35, market: 'Fort Lauderdale (Victoria Park)' },
  '33306': { factor: 1.35, market: 'Fort Lauderdale (Coral Ridge)' },
  '33308': { factor: 1.40, market: 'Fort Lauderdale (Lauderdale-by-the-Sea)' },
  '33062': { factor: 1.40, market: 'Pompano Beach (Beach)' },
  '33060': { factor: 1.25, market: 'Pompano Beach' },
  '33064': { factor: 1.25, market: 'Pompano Beach (West)' },
  '33309': { factor: 1.25, market: 'Fort Lauderdale (West)' },
  '33311': { factor: 1.15, market: 'Fort Lauderdale (Northwest)' },
  '33313': { factor: 1.20, market: 'Fort Lauderdale (Lauderhill)' },
  '33314': { factor: 1.20, market: 'Fort Lauderdale (Davie)' },
  '33316': { factor: 1.35, market: 'Fort Lauderdale (Las Olas)' },
  '33317': { factor: 1.25, market: 'Plantation' },
  '33322': { factor: 1.20, market: 'Plantation (West)' },
  '33324': { factor: 1.25, market: 'Plantation' },
  '33325': { factor: 1.25, market: 'Weston' },
  '33326': { factor: 1.30, market: 'Weston' },
  '33327': { factor: 1.30, market: 'Weston' },
  '33328': { factor: 1.25, market: 'Davie' },
  '33330': { factor: 1.30, market: 'Cooper City' },
  '33331': { factor: 1.30, market: 'Weston' },
  '33332': { factor: 1.30, market: 'Southwest Ranches' },
  '33334': { factor: 1.30, market: 'Oakland Park' },
  '33351': { factor: 1.20, market: 'Sunrise' },

  // Miami-Dade County
  '33139': { factor: 1.50, market: 'Miami Beach (South Beach)' },
  '33140': { factor: 1.45, market: 'Miami Beach (Mid-Beach)' },
  '33141': { factor: 1.40, market: 'Miami Beach (North Beach)' },
  '33154': { factor: 1.45, market: 'Bay Harbor Islands' },
  '33160': { factor: 1.40, market: 'Sunny Isles Beach' },
  '33180': { factor: 1.35, market: 'Aventura' },
  '33131': { factor: 1.45, market: 'Miami (Brickell)' },
  '33129': { factor: 1.40, market: 'Miami (Coconut Grove)' },
  '33133': { factor: 1.40, market: 'Miami (Coconut Grove)' },
  '33134': { factor: 1.40, market: 'Coral Gables' },
  '33143': { factor: 1.35, market: 'Coral Gables (South)' },
  '33146': { factor: 1.40, market: 'Coral Gables' },
  '33156': { factor: 1.35, market: 'Pinecrest' },
  '33157': { factor: 1.30, market: 'Palmetto Bay' },
  '33158': { factor: 1.35, market: 'Palmetto Bay' },
  '33176': { factor: 1.25, market: 'Kendall' },
  '33183': { factor: 1.20, market: 'Kendall (West)' },
  '33186': { factor: 1.20, market: 'Kendall (South)' },

  // Default
  default: { factor: 1.15, market: 'Florida Average' },
};

// ============================================
// 2025 CONSTRUCTION COSTS — SOUTH FLORIDA
// ============================================

const BASE_COSTS = {
  // WET ROOMS — Kitchen
  kitchen_full_remodel: 28000,
  kitchen_cosmetic: 12000,
  cabinets: 8000,
  countertops: 4500,
  appliances_package: 5500,
  backsplash: 1500,
  kitchen_sink_faucet: 1200,

  // WET ROOMS — Bathrooms
  full_bath_remodel: 14000,
  full_bath_cosmetic: 6000,
  half_bath_remodel: 7000,
  half_bath_cosmetic: 3000,
  vanity_sink: 1200,
  toilet: 450,
  tub_shower: 3500,
  shower_glass: 2000,

  // DRY ROOMS — Flooring (per sqft)
  flooring_lvp: 7.5,
  flooring_tile: 12.0,
  flooring_hardwood: 14.0,
  flooring_carpet: 5.0,

  // DRY ROOMS — Walls (per sqft)
  interior_paint: 3.5,
  drywall_repair: 650,
  texture_removal: 4.0,

  // EXTERIOR
  exterior_paint: 6500,
  roof_shingle_sqft: 6.0,
  roof_tile_sqft: 14.0,
  roof_metal_sqft: 16.0,
  roof_flat_sqft: 10.0,
  siding_sqft: 12.0,
  windows_each: 750,
  front_door: 2500,
  garage_door: 2800,
  landscaping: 4500,
  pool_resurface: 8500,
  pool_equipment: 5500,
  fence_linear_ft: 45,
  driveway_sqft: 8.0,

  // MAJOR SYSTEMS — HVAC
  hvac_ton: 3800,
  hvac_ductwork: 2500,
  water_heater_tank: 1800,
  water_heater_tankless: 3500,

  // MAJOR SYSTEMS — Electrical
  electrical_panel: 3500,
  electrical_rewire_sqft: 6.5,
  gfci_outlets: 180,
  ceiling_fan: 350,
  recessed_lights: 225,

  // MAJOR SYSTEMS — Plumbing
  plumbing_repipe_sqft: 8.0,
  water_line: 3500,
  sewer_line: 6500,
  water_softener: 2500,

  // STRUCTURAL
  foundation_repair: 8500,
  termite_treatment: 1800,
  mold_remediation_sqft: 25.0,

  // PERMITS & SOFT COSTS
  permit_minor: 800,
  permit_major: 3500,
  dumpster_load: 650,
  deep_cleaning: 750,
  staging: 3500,
};

// ============================================
// ASSET CLASS MULTIPLIERS
// ============================================

const ASSET_CLASS_MULTIPLIERS: Record<AssetClass, number> = {
  standard: 1.0,
  luxury: 2.0,
  ultra_luxury: 3.5,
};

// ============================================
// CONDITION INTENSITY FACTORS
// ============================================

interface ConditionFactors {
  wet_room_factor: number;
  dry_room_factor: number;
  systems_check: boolean;
  permit_tier: 'minor' | 'major';
}

const CONDITION_INTENSITY: Record<PropertyCondition, ConditionFactors> = {
  distressed: {
    wet_room_factor: 1.0,
    dry_room_factor: 1.0,
    systems_check: true,
    permit_tier: 'major',
  },
  fair: {
    wet_room_factor: 0.8,
    dry_room_factor: 0.9,
    systems_check: true,
    permit_tier: 'major',
  },
  good: {
    wet_room_factor: 0.5,
    dry_room_factor: 0.6,
    systems_check: false,
    permit_tier: 'minor',
  },
  excellent: {
    wet_room_factor: 0.2,
    dry_room_factor: 0.3,
    systems_check: false,
    permit_tier: 'minor',
  },
};

// ============================================
// CAPEX AGE THRESHOLDS
// ============================================

const CAPEX_AGE_THRESHOLDS: Record<string, number> = {
  roof_shingle: 18,
  roof_tile: 35,
  roof_metal: 45,
  hvac: 15,
  water_heater: 12,
  electrical_panel: 30,
  windows: 25,
  plumbing_galvanized: 50,
  plumbing_polybutylene: 1,
  plumbing_copper: 60,
};

// ============================================
// REHAB INTELLIGENCE CLASS
// ============================================

export class RehabIntelligence {
  private sqFt: number;
  private yearBuilt: number;
  private arv: number;
  private zipCode: string;
  private bedrooms: number;
  private bathrooms: number;
  private condition: PropertyCondition;
  private hasPool: boolean;
  private roofType: string;
  private stories: number;
  private garageSpaces: number;
  private lotSqft: number;
  private hoaMonthly: number;
  private recentPermits: string[];

  private currentYear: number;
  private propertyAge: number;
  private assetClass: AssetClass;
  private gradeMultiplier: number;
  private locationFactor: number;
  private locationMarket: string;
  private conditionFactors: ConditionFactors;

  constructor(input: PropertyInput) {
    this.sqFt = input.sq_ft;
    this.yearBuilt = input.year_built;
    this.arv = input.arv;
    this.zipCode = String(input.zip_code);
    this.bedrooms = input.bedrooms ?? 3;
    this.bathrooms = input.bathrooms ?? 2;
    this.condition = input.condition ?? 'fair';
    this.hasPool = input.has_pool ?? false;
    this.roofType = input.roof_type ?? 'shingle';
    this.stories = input.stories ?? 1;
    this.garageSpaces = input.garage_spaces ?? 0;
    this.lotSqft = input.lot_sqft ?? this.sqFt * 3;
    this.hoaMonthly = input.hoa_monthly ?? 0;
    this.recentPermits = (input.recent_permits ?? []).map((p) =>
      p.toLowerCase(),
    );

    this.currentYear = new Date().getFullYear();
    this.propertyAge = this.currentYear - this.yearBuilt;

    const { assetClass, multiplier } = this.determineAssetClass();
    this.assetClass = assetClass;
    this.gradeMultiplier = multiplier;

    const locData =
      LOCATION_FACTORS[this.zipCode] ?? LOCATION_FACTORS['default'];
    this.locationFactor = locData.factor;
    this.locationMarket = locData.market;

    this.conditionFactors = CONDITION_INTENSITY[this.condition];
  }

  private determineAssetClass(): {
    assetClass: AssetClass;
    multiplier: number;
  } {
    const pricePerSqft = this.sqFt > 0 ? this.arv / this.sqFt : 0;

    if (this.arv > 2_000_000 || pricePerSqft > 700) {
      return {
        assetClass: 'ultra_luxury',
        multiplier: ASSET_CLASS_MULTIPLIERS.ultra_luxury,
      };
    } else if (this.arv > 750_000 || pricePerSqft > 400) {
      return {
        assetClass: 'luxury',
        multiplier: ASSET_CLASS_MULTIPLIERS.luxury,
      };
    }
    return {
      assetClass: 'standard',
      multiplier: ASSET_CLASS_MULTIPLIERS.standard,
    };
  }

  private applyMultipliers(baseCost: number): number {
    return baseCost * this.gradeMultiplier * this.locationFactor;
  }

  calculate(options?: {
    contingencyPct?: number;
    includeHoldingCosts?: boolean;
    holdingLoanRate?: number;
    holdingLtv?: number;
  }): RehabEstimate {
    const {
      contingencyPct = 0.1,
      includeHoldingCosts = true,
      holdingLoanRate = 0.1,
      holdingLtv = 0.7,
    } = options ?? {};

    const breakdown: RehabBreakdown = {
      kitchen: 0,
      bathrooms: 0,
      flooring: 0,
      paint_walls: 0,
      exterior: 0,
      roof: 0,
      hvac: 0,
      electrical: 0,
      plumbing: 0,
      windows_doors: 0,
      other: 0,
      permits: 0,
      contingency: 0,
      construction_total: 0,
      total: 0,
    };

    const warnings: CapExWarning[] = [];
    const wetFactor = this.conditionFactors.wet_room_factor;
    const dryFactor = this.conditionFactors.dry_room_factor;
    const checkSystems = this.conditionFactors.systems_check;
    const permitTier = this.conditionFactors.permit_tier;

    // ── Kitchen ──
    if (wetFactor >= 0.8) {
      breakdown.kitchen = this.applyMultipliers(
        BASE_COSTS.kitchen_full_remodel,
      );
    } else {
      breakdown.kitchen =
        this.applyMultipliers(BASE_COSTS.kitchen_cosmetic) * wetFactor;
    }

    // ── Bathrooms ──
    const fullBaths = Math.max(1, Math.floor(this.bathrooms * 0.67));
    const halfBaths = Math.max(0, this.bathrooms - fullBaths);

    if (wetFactor >= 0.8) {
      breakdown.bathrooms =
        fullBaths * this.applyMultipliers(BASE_COSTS.full_bath_remodel) +
        halfBaths * this.applyMultipliers(BASE_COSTS.half_bath_remodel);
    } else {
      breakdown.bathrooms =
        fullBaths *
          this.applyMultipliers(BASE_COSTS.full_bath_cosmetic) *
          wetFactor +
        halfBaths *
          this.applyMultipliers(BASE_COSTS.half_bath_cosmetic) *
          wetFactor;
    }

    // ── Flooring ──
    const flooringSqft = this.sqFt * 0.85 * dryFactor;
    if (this.assetClass === 'ultra_luxury') {
      breakdown.flooring =
        flooringSqft * BASE_COSTS.flooring_hardwood * this.locationFactor;
    } else if (this.assetClass === 'luxury') {
      breakdown.flooring =
        flooringSqft *
        ((BASE_COSTS.flooring_tile + BASE_COSTS.flooring_hardwood) / 2) *
        this.locationFactor;
    } else {
      breakdown.flooring =
        flooringSqft * BASE_COSTS.flooring_lvp * this.locationFactor;
    }

    // ── Paint & Walls ──
    const wallSqft = this.sqFt * 3.5 * dryFactor;
    breakdown.paint_walls =
      wallSqft * BASE_COSTS.interior_paint * this.locationFactor;
    if (this.condition === 'distressed' || this.condition === 'fair') {
      const rooms = this.bedrooms + 3;
      breakdown.paint_walls +=
        rooms * BASE_COSTS.drywall_repair * this.locationFactor;
    }

    // ── Exterior ──
    let exteriorCost = 0;
    if (dryFactor >= 0.5) {
      exteriorCost += this.applyMultipliers(BASE_COSTS.exterior_paint);
    }
    if (this.condition === 'distressed' || this.condition === 'fair') {
      exteriorCost += this.applyMultipliers(BASE_COSTS.landscaping);
    }
    if (
      this.hasPool &&
      this.propertyAge > 15 &&
      !this.recentPermits.includes('pool')
    ) {
      const poolCost = this.applyMultipliers(BASE_COSTS.pool_resurface);
      exteriorCost += poolCost;
      warnings.push({
        item: 'Pool',
        age: this.propertyAge,
        threshold: 15,
        estimated_cost: poolCost,
        priority: 'medium',
        notes: 'Pool may need resurfacing. Included in estimate.',
      });
    }
    breakdown.exterior = exteriorCost;

    // ── Roof ──
    const roofThreshold =
      CAPEX_AGE_THRESHOLDS[`roof_${this.roofType}`] ?? 18;
    if (
      this.propertyAge > roofThreshold &&
      !this.recentPermits.includes('roof')
    ) {
      const roofSqft = this.sqFt * 1.2 * this.stories;
      let roofCostPerSqft = BASE_COSTS.roof_shingle_sqft;
      if (this.roofType === 'tile') {
        roofCostPerSqft = BASE_COSTS.roof_tile_sqft;
      } else if (this.roofType === 'metal') {
        roofCostPerSqft = BASE_COSTS.roof_metal_sqft;
      } else if (this.roofType === 'flat') {
        roofCostPerSqft = BASE_COSTS.roof_flat_sqft;
      } else if (
        this.assetClass === 'luxury' ||
        this.assetClass === 'ultra_luxury'
      ) {
        roofCostPerSqft = BASE_COSTS.roof_tile_sqft;
      }
      breakdown.roof =
        roofSqft * roofCostPerSqft * this.locationFactor;
      warnings.push({
        item: 'Roof',
        age: this.propertyAge,
        threshold: roofThreshold,
        estimated_cost: breakdown.roof,
        priority: 'critical',
        notes: `Roof is ${this.propertyAge} years old (${this.roofType}). Replacement budgeted.`,
      });
    }

    // ── HVAC ──
    const hvacThreshold = CAPEX_AGE_THRESHOLDS.hvac;
    if (
      (this.propertyAge > hvacThreshold || checkSystems) &&
      !this.recentPermits.includes('hvac')
    ) {
      const tons = Math.max(2, this.sqFt / 450);
      breakdown.hvac = tons * BASE_COSTS.hvac_ton * this.locationFactor;
      warnings.push({
        item: 'HVAC',
        age: this.propertyAge,
        threshold: hvacThreshold,
        estimated_cost: breakdown.hvac,
        priority: this.propertyAge > hvacThreshold ? 'critical' : 'high',
        notes: `HVAC system is ${this.propertyAge} years old. ${tons.toFixed(1)} ton system budgeted.`,
      });
    }

    // ── Electrical ──
    let electricalCost = 0;
    if (
      this.propertyAge > CAPEX_AGE_THRESHOLDS.electrical_panel ||
      (checkSystems && this.propertyAge > 25)
    ) {
      electricalCost +=
        BASE_COSTS.electrical_panel * this.locationFactor;
      warnings.push({
        item: 'Electrical Panel',
        age: this.propertyAge,
        threshold: CAPEX_AGE_THRESHOLDS.electrical_panel,
        estimated_cost:
          BASE_COSTS.electrical_panel * this.locationFactor,
        priority: 'high',
        notes:
          'Electrical panel may need upgrade. Verify if fuse box or undersized.',
      });
    }
    if (this.condition === 'distressed' || this.condition === 'fair') {
      electricalCost +=
        6 * BASE_COSTS.gfci_outlets * this.locationFactor;
      electricalCost +=
        this.bedrooms * BASE_COSTS.ceiling_fan * this.locationFactor;
      electricalCost +=
        12 * BASE_COSTS.recessed_lights * this.locationFactor;
    }
    breakdown.electrical = electricalCost;

    // ── Plumbing ──
    let plumbingCost = 0;
    if (
      this.yearBuilt < 1975 &&
      !this.recentPermits.includes('plumbing')
    ) {
      plumbingCost =
        this.sqFt * BASE_COSTS.plumbing_repipe_sqft * this.locationFactor;
      warnings.push({
        item: 'Plumbing',
        age: this.propertyAge,
        threshold: 50,
        estimated_cost: plumbingCost,
        priority: 'critical',
        notes:
          'Pre-1975 home may have galvanized pipes. Full repipe budgeted.',
      });
    } else if (this.yearBuilt >= 1978 && this.yearBuilt <= 1995) {
      plumbingCost =
        this.sqFt *
        BASE_COSTS.plumbing_repipe_sqft *
        this.locationFactor *
        0.7;
      warnings.push({
        item: 'Plumbing',
        age: this.propertyAge,
        threshold: 1,
        estimated_cost: plumbingCost,
        priority: 'high',
        notes:
          '1978-1995 build - verify if polybutylene pipes. Repipe may be needed.',
      });
    }

    if (
      this.propertyAge > CAPEX_AGE_THRESHOLDS.water_heater &&
      !this.recentPermits.includes('water_heater')
    ) {
      const whCost =
        this.assetClass !== 'standard'
          ? BASE_COSTS.water_heater_tankless
          : BASE_COSTS.water_heater_tank;
      plumbingCost += whCost * this.locationFactor;
      warnings.push({
        item: 'Water Heater',
        age: this.propertyAge,
        threshold: CAPEX_AGE_THRESHOLDS.water_heater,
        estimated_cost: whCost * this.locationFactor,
        priority: 'medium',
        notes: 'Water heater likely needs replacement.',
      });
    }
    breakdown.plumbing = plumbingCost;

    // ── Windows & Doors ──
    let windowsDoorsCost = 0;
    if (
      this.propertyAge > CAPEX_AGE_THRESHOLDS.windows &&
      !this.recentPermits.includes('windows')
    ) {
      const windowCount = Math.max(8, Math.floor(this.sqFt / 150));
      const windowsCost =
        windowCount * this.applyMultipliers(BASE_COSTS.windows_each);
      windowsDoorsCost += windowsCost;
      warnings.push({
        item: 'Windows',
        age: this.propertyAge,
        threshold: CAPEX_AGE_THRESHOLDS.windows,
        estimated_cost: windowsCost,
        priority: 'high',
        notes: `Windows are ${this.propertyAge} years old. ${windowCount} impact windows budgeted.`,
      });
    }
    if (this.condition === 'distressed' || this.condition === 'fair') {
      windowsDoorsCost += this.applyMultipliers(BASE_COSTS.front_door);
      if (this.garageSpaces > 0) {
        windowsDoorsCost +=
          this.garageSpaces *
          this.applyMultipliers(BASE_COSTS.garage_door);
      }
    }
    breakdown.windows_doors = windowsDoorsCost;

    // ── Other ──
    let otherCost = 0;
    const dumpsterCount =
      dryFactor < 0.5 ? 2 : dryFactor < 0.8 ? 4 : 6;
    otherCost += dumpsterCount * BASE_COSTS.dumpster_load;
    otherCost += BASE_COSTS.deep_cleaning * this.locationFactor;
    if (this.propertyAge > 20) {
      otherCost += BASE_COSTS.termite_treatment;
    }
    breakdown.other = otherCost;

    // ── Permits ──
    breakdown.permits =
      permitTier === 'major'
        ? BASE_COSTS.permit_major
        : BASE_COSTS.permit_minor;

    // ── Totals ──
    breakdown.construction_total =
      breakdown.kitchen +
      breakdown.bathrooms +
      breakdown.flooring +
      breakdown.paint_walls +
      breakdown.exterior +
      breakdown.roof +
      breakdown.hvac +
      breakdown.electrical +
      breakdown.plumbing +
      breakdown.windows_doors +
      breakdown.other +
      breakdown.permits;

    breakdown.contingency =
      breakdown.construction_total * contingencyPct;
    breakdown.total =
      breakdown.construction_total + breakdown.contingency;

    // ── Holding Costs ──
    let holdingCosts: HoldingCosts | null = null;
    if (includeHoldingCosts) {
      holdingCosts = this.calculateHoldingCosts(
        breakdown.total,
        holdingLoanRate,
        holdingLtv,
      );
    }

    const totalRehab = breakdown.total;
    const totalProjectCost =
      totalRehab + (holdingCosts?.total_holding ?? 0);

    return {
      asset_class: this.assetClass,
      location_factor: this.locationFactor,
      location_market: this.locationMarket,
      condition: this.condition,
      breakdown,
      capex_warnings: warnings,
      holding_costs: holdingCosts,
      total_rehab: Math.round(totalRehab),
      total_project_cost: Math.round(totalProjectCost),
    };
  }

  private calculateHoldingCosts(
    rehabBudget: number,
    loanRate: number,
    ltv: number,
  ): HoldingCosts {
    let months: number;
    if (rehabBudget > 250_000) months = 10;
    else if (rehabBudget > 150_000) months = 8;
    else if (rehabBudget > 75_000) months = 6;
    else if (rehabBudget > 40_000) months = 4;
    else months = 3;

    const loanAmount = this.arv * ltv;
    const monthlyInterest = (loanAmount * loanRate) / 12;
    const monthlyTaxes = (this.arv * 0.018) / 12;
    const monthlyInsurance = (this.arv * 0.01) / 12;

    let monthlyUtilities: number;
    if (this.sqFt > 4000) monthlyUtilities = 900;
    else if (this.sqFt > 2500) monthlyUtilities = 600;
    else if (this.sqFt > 1500) monthlyUtilities = 400;
    else monthlyUtilities = 300;

    const monthlyTotal =
      monthlyInterest +
      monthlyTaxes +
      monthlyInsurance +
      monthlyUtilities +
      this.hoaMonthly;

    return {
      duration_months: months,
      monthly_interest: Math.round(monthlyInterest),
      monthly_taxes: Math.round(monthlyTaxes),
      monthly_insurance: Math.round(monthlyInsurance),
      monthly_utilities: monthlyUtilities,
      monthly_hoa: this.hoaMonthly,
      monthly_total: Math.round(monthlyTotal),
      total_holding: Math.round(monthlyTotal * months),
    };
  }

  /** Generate line items compatible with the RehabEstimator component. */
  generateLineItems(): LineItem[] {
    const estimate = this.calculate({
      contingencyPct: 0,
      includeHoldingCosts: false,
    });
    const bd = estimate.breakdown;
    const items: LineItem[] = [];

    const tier: 'low' | 'mid' | 'high' =
      this.assetClass === 'ultra_luxury'
        ? 'high'
        : this.assetClass === 'luxury'
          ? 'mid'
          : 'low';

    // Kitchen
    if (bd.kitchen > 0) {
      items.push({
        itemId: 'cabinets',
        quantity: 1,
        tier,
        cost: Math.round(bd.kitchen * 0.4),
      });
      items.push({
        itemId: 'countertops',
        quantity: 1,
        tier,
        cost: Math.round(bd.kitchen * 0.25),
      });
      items.push({
        itemId: 'appliances',
        quantity: 1,
        tier,
        cost: Math.round(bd.kitchen * 0.25),
      });
      items.push({
        itemId: 'backsplash',
        quantity: 1,
        tier,
        cost: Math.round(bd.kitchen * 0.1),
      });
    }

    // Bathrooms
    if (bd.bathrooms > 0) {
      const fullBaths = Math.max(1, Math.floor(this.bathrooms * 0.67));
      items.push({
        itemId: 'full_bath',
        quantity: fullBaths,
        tier,
        cost: Math.round(bd.bathrooms * 0.8),
      });
      if (this.bathrooms > 2) {
        items.push({
          itemId: 'half_bath',
          quantity: 1,
          tier,
          cost: Math.round(bd.bathrooms * 0.2),
        });
      }
    }

    // Flooring
    if (bd.flooring > 0) {
      const fSqft = Math.floor(
        this.sqFt * 0.85 * this.conditionFactors.dry_room_factor,
      );
      const flooringId =
        this.assetClass === 'standard' ? 'lvp' : 'hardwood';
      items.push({
        itemId: flooringId,
        quantity: fSqft,
        tier,
        cost: Math.round(bd.flooring),
      });
    }

    // Paint
    if (bd.paint_walls > 0) {
      const wSqft = Math.floor(
        this.sqFt * 3.5 * this.conditionFactors.dry_room_factor,
      );
      items.push({
        itemId: 'interior_paint',
        quantity: wSqft,
        tier,
        cost: Math.round(bd.paint_walls * 0.8),
      });
      if (
        this.condition === 'distressed' ||
        this.condition === 'fair'
      ) {
        items.push({
          itemId: 'drywall_repair',
          quantity: this.bedrooms + 3,
          tier,
          cost: Math.round(bd.paint_walls * 0.2),
        });
      }
    }

    // Exterior
    if (bd.exterior > 0) {
      items.push({
        itemId: 'exterior_paint',
        quantity: 1,
        tier,
        cost: Math.round(bd.exterior * 0.6),
      });
      items.push({
        itemId: 'landscaping',
        quantity: 1,
        tier,
        cost: Math.round(bd.exterior * 0.4),
      });
    }

    if (bd.roof > 0)
      items.push({
        itemId: 'roof',
        quantity: 1,
        tier,
        cost: Math.round(bd.roof),
      });
    if (bd.hvac > 0)
      items.push({
        itemId: 'hvac',
        quantity: 1,
        tier,
        cost: Math.round(bd.hvac),
      });

    // Water heater
    const whWarning = estimate.capex_warnings.find(
      (w) => w.item === 'Water Heater',
    );
    if (whWarning) {
      items.push({
        itemId: 'water_heater',
        quantity: 1,
        tier,
        cost: Math.round(whWarning.estimated_cost),
      });
    }

    if (bd.electrical > 0)
      items.push({
        itemId: 'electrical_panel',
        quantity: 1,
        tier,
        cost: Math.round(bd.electrical),
      });

    // Plumbing (non-water-heater)
    const plumbingNonWh =
      bd.plumbing - (whWarning?.estimated_cost ?? 0);
    if (plumbingNonWh > 5000)
      items.push({
        itemId: 'plumbing_repipe',
        quantity: 1,
        tier,
        cost: Math.round(plumbingNonWh),
      });

    // Windows
    const windowsWarning = estimate.capex_warnings.find(
      (w) => w.item === 'Windows',
    );
    if (windowsWarning) {
      const windowCount = Math.max(8, Math.floor(this.sqFt / 150));
      items.push({
        itemId: 'windows',
        quantity: windowCount,
        tier,
        cost: Math.round(windowsWarning.estimated_cost),
      });
    }

    // Front door
    if (bd.windows_doors > 0 && bd.roof === 0) {
      items.push({
        itemId: 'front_door',
        quantity: 1,
        tier,
        cost: Math.round(
          this.applyMultipliers(BASE_COSTS.front_door),
        ),
      });
    }

    if (bd.permits > 0)
      items.push({
        itemId: 'permits',
        quantity: 1,
        tier,
        cost: Math.round(bd.permits),
      });

    items.push({
      itemId: 'dumpster',
      quantity: 4,
      tier: 'mid',
      cost: Math.round(BASE_COSTS.dumpster_load * 4),
    });
    items.push({
      itemId: 'cleaning',
      quantity: 1,
      tier,
      cost: Math.round(
        BASE_COSTS.deep_cleaning * this.locationFactor,
      ),
    });

    return items;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Create a quick rehab estimate from property data. */
export function createRehabEstimate(
  propertyData: {
    square_footage?: number;
    year_built?: number;
    arv?: number;
    current_value_avm?: number;
    zip_code?: string;
    bedrooms?: number;
    bathrooms?: number;
    has_pool?: boolean;
    roof_type?: string;
    stories?: number;
    garage_spaces?: number;
    lot_size?: number;
    hoa_monthly?: number;
  },
  condition: PropertyCondition = 'fair',
  recentPermits: string[] = [],
  contingencyPct: number = 0.1,
): RehabEstimate {
  const ri = new RehabIntelligence({
    sq_ft: propertyData.square_footage ?? 1500,
    year_built: propertyData.year_built ?? 2000,
    arv: propertyData.arv ?? propertyData.current_value_avm ?? 400000,
    zip_code: propertyData.zip_code ?? '33401',
    bedrooms: propertyData.bedrooms,
    bathrooms: propertyData.bathrooms,
    condition,
    has_pool: propertyData.has_pool,
    roof_type: propertyData.roof_type as PropertyInput['roof_type'],
    stories: propertyData.stories,
    garage_spaces: propertyData.garage_spaces,
    lot_sqft: propertyData.lot_size,
    hoa_monthly: propertyData.hoa_monthly,
    recent_permits: recentPermits,
  });

  return ri.calculate({ contingencyPct });
}

/** Get location factor for a zip code. */
export function getLocationFactor(zipCode: string): LocationData {
  return LOCATION_FACTORS[zipCode] ?? LOCATION_FACTORS['default'];
}

/** Get all available location factors (for admin/display). */
export function getAllLocationFactors(): Record<string, LocationData> {
  return { ...LOCATION_FACTORS };
}
