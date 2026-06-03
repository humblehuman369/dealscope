/**
 * Rehab Cost Book — the single source of truth for rehab unit costs.
 *
 * Both estimator engines read from this catalog so their pricing can never
 * drift apart again:
 *  - The Detailed builder (`REHAB_CATEGORIES` in `analytics.ts`) spreads these
 *    tiered costs into its line-item picker.
 *  - The Quick engine (`RehabIntelligence` in `rehabIntelligence.ts`) derives
 *    its `BASE_COSTS` from these costs at its baseline tier.
 *
 * Update costs HERE and both engines update together.
 *
 * Pricing basis: 2025 South Florida construction costs (national-average
 * baseline; regional uplift is applied per-property via RegionalCostContext).
 */

export type CostTier = 'low' | 'mid' | 'high'

export interface TieredCost {
  low: number
  mid: number
  high: number
  unit: string
}

/**
 * Canonical tiered unit costs. Keys match the line-item ids used by the
 * Detailed builder (`REHAB_CATEGORIES`) and by `RehabSelection.itemId`.
 */
export const REHAB_UNIT_COSTS = {
  // Kitchen
  cabinets: { low: 3000, mid: 8000, high: 20000, unit: 'kitchen' },
  countertops: { low: 1500, mid: 4000, high: 10000, unit: 'kitchen' },
  appliances: { low: 2000, mid: 5000, high: 15000, unit: 'set' },
  backsplash: { low: 400, mid: 1200, high: 3000, unit: 'kitchen' },
  sink_faucet: { low: 300, mid: 800, high: 2000, unit: 'each' },

  // Bathroom
  full_bath: { low: 5000, mid: 12000, high: 30000, unit: 'bathroom' },
  half_bath: { low: 2500, mid: 6000, high: 15000, unit: 'bathroom' },
  vanity: { low: 300, mid: 800, high: 2500, unit: 'each' },
  toilet: { low: 150, mid: 400, high: 1000, unit: 'each' },
  tub_shower: { low: 500, mid: 2000, high: 6000, unit: 'each' },

  // Flooring (per sqft)
  lvp: { low: 3, mid: 6, high: 10, unit: 'sqft' },
  hardwood: { low: 6, mid: 12, high: 20, unit: 'sqft' },
  tile: { low: 5, mid: 10, high: 20, unit: 'sqft' },
  carpet: { low: 2, mid: 5, high: 10, unit: 'sqft' },

  // Paint & walls
  interior_paint: { low: 1.5, mid: 3, high: 5, unit: 'sqft' },
  exterior_paint: { low: 2000, mid: 5000, high: 12000, unit: 'house' },
  drywall_repair: { low: 200, mid: 500, high: 1500, unit: 'room' },

  // Major systems
  hvac: { low: 4000, mid: 8000, high: 15000, unit: 'system' },
  water_heater: { low: 800, mid: 1500, high: 3500, unit: 'each' },
  electrical_panel: { low: 1500, mid: 3000, high: 6000, unit: 'panel' },
  plumbing_repipe: { low: 4000, mid: 8000, high: 15000, unit: 'house' },

  // Exterior
  roof: { low: 8000, mid: 15000, high: 30000, unit: 'roof' },
  siding: { low: 5000, mid: 12000, high: 25000, unit: 'house' },
  windows: { low: 300, mid: 600, high: 1200, unit: 'each' },
  front_door: { low: 500, mid: 1500, high: 4000, unit: 'each' },
  landscaping: { low: 1000, mid: 3000, high: 10000, unit: 'yard' },

  // Other
  permits: { low: 500, mid: 1500, high: 5000, unit: 'project' },
  dumpster: { low: 400, mid: 600, high: 1000, unit: 'load' },
  cleaning: { low: 200, mid: 500, high: 1000, unit: 'house' },
  staging: { low: 500, mid: 2000, high: 5000, unit: 'house' },
} as const satisfies Record<string, TieredCost>

export type RehabUnitCostId = keyof typeof REHAB_UNIT_COSTS

/** Look up a unit cost at a given finish tier. */
export function unitCost(id: RehabUnitCostId, tier: CostTier): number {
  return REHAB_UNIT_COSTS[id][tier]
}

/**
 * Quick-engine work rates that have no Detailed-builder component equivalent
 * (the Detailed builder models these as flat line items or omits them).
 * Kept here so EVERY rehab cost primitive lives in one catalog.
 *
 * These are single canonical values — the Quick engine applies its own
 * condition/finish/regional scaling on top.
 */
export const QUICK_WORK_RATES = {
  // Lighter-scope wet-room variants (used when condition isn't a full gut)
  kitchen_cosmetic: 12000,
  full_bath_cosmetic: 6000,
  half_bath_cosmetic: 3000,
  shower_glass: 2000,

  // Roof — priced per roof-sqft by material (Detailed uses a flat `roof` cost)
  roof_shingle_sqft: 6.0,
  roof_tile_sqft: 14.0,
  roof_metal_sqft: 16.0,
  roof_flat_sqft: 10.0,

  // HVAC — sized per ton (Detailed uses a flat `hvac` cost)
  hvac_ton: 3800,
  hvac_ductwork: 2500,
  water_heater_tankless: 3500,

  // Plumbing — priced per sqft for whole-home repipe
  plumbing_repipe_sqft: 8.0,
  electrical_rewire_sqft: 6.5,
  water_line: 3500,
  sewer_line: 6500,
  water_softener: 2500,

  // Electrical fixtures
  gfci_outlets: 180,
  ceiling_fan: 350,
  recessed_lights: 225,

  // Exterior / structural
  garage_door: 2800,
  pool_resurface: 8500,
  pool_equipment: 5500,
  fence_linear_ft: 45,
  driveway_sqft: 8.0,
  siding_sqft: 12.0,
  foundation_repair: 8500,
  termite_treatment: 1800,
  mold_remediation_sqft: 25.0,
  texture_removal: 4.0,

  // Permits (Quick distinguishes minor vs major scope)
  permit_minor: 800,
  permit_major: 3500,
}
