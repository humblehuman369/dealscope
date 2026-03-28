/**
 * Property-Specific Preset Generator
 *
 * Replaces the static REHAB_PRESETS with dynamically generated presets
 * that are derived from the subject property's sqft, beds, baths,
 * year_built, and condition. Each preset outputs RehabSelection[]
 * compatible with the existing detailed builder UI.
 */

import type { RehabSelection } from './analytics'
import { REHAB_CATEGORIES, calculateRehabEstimate } from './analytics'
import type {
  EstimatorPropertyInput,
  GeneratedPreset,
  ScopeDriver,
  RegionalCostContext,
} from './estimatorTypes'

// ============================================
// PROPERTY HELPERS
// ============================================

function livableSqft(sqft: number): number {
  return Math.round(sqft * 0.85)
}

function wallSqft(sqft: number): number {
  return Math.round(sqft * 3.5)
}

function windowCount(sqft: number): number {
  return Math.max(6, Math.round(sqft / 150))
}

function fullBathCount(baths: number): number {
  return Math.max(1, Math.floor(baths * 0.67))
}

function halfBathCount(baths: number): number {
  return Math.max(0, Math.ceil(baths - fullBathCount(baths)))
}

function propertyAge(yearBuilt: number): number {
  return new Date().getFullYear() - yearBuilt
}

function dumpsterLoads(presetLevel: 'cosmetic' | 'light' | 'medium' | 'heavy'): number {
  return { cosmetic: 1, light: 2, medium: 3, heavy: 5 }[presetLevel]
}

function drywallRooms(beds: number): number {
  return beds + 3
}

// ============================================
// SCOPE DRIVERS
// ============================================

function buildScopeDrivers(prop: Required_EstimatorInputs): ScopeDriver[] {
  const drivers: ScopeDriver[] = []
  const age = propertyAge(prop.year_built)

  drivers.push({
    field: 'square_footage',
    label: 'Square Footage',
    value: prop.square_footage,
    impact: `Determines paint (${wallSqft(prop.square_footage).toLocaleString()} wall sqft) and flooring (${livableSqft(prop.square_footage).toLocaleString()} sqft) quantities`,
  })

  drivers.push({
    field: 'bathrooms',
    label: 'Bathrooms',
    value: prop.bathrooms,
    impact: `${fullBathCount(prop.bathrooms)} full + ${halfBathCount(prop.bathrooms)} half bath scope`,
  })

  drivers.push({
    field: 'bedrooms',
    label: 'Bedrooms',
    value: prop.bedrooms,
    impact: `${drywallRooms(prop.bedrooms)} rooms for drywall and fixtures`,
  })

  if (age > 20) {
    drivers.push({
      field: 'year_built',
      label: 'Property Age',
      value: `${age} years`,
      impact: age > 30
        ? 'Major systems (HVAC, plumbing, electrical) likely need replacement'
        : 'Some systems may need updating',
    })
  }

  return drivers
}

// ============================================
// PRESET GENERATION
// ============================================

interface Required_EstimatorInputs {
  square_footage: number
  year_built: number
  bedrooms: number
  bathrooms: number
  arv: number
  zip_code: string
}

function resolveInputs(prop: EstimatorPropertyInput): Required_EstimatorInputs {
  return {
    square_footage: prop.square_footage ?? 1500,
    year_built: prop.year_built ?? 2000,
    bedrooms: prop.bedrooms ?? 3,
    bathrooms: prop.bathrooms ?? 2,
    arv: prop.arv ?? prop.current_value_avm ?? 350000,
    zip_code: prop.zip_code ?? '00000',
  }
}

function generateCosmeticPreset(p: Required_EstimatorInputs): RehabSelection[] {
  const paintQty = wallSqft(p.square_footage)
  const floorQty = livableSqft(p.square_footage)

  return [
    { itemId: 'interior_paint', quantity: paintQty, tier: 'mid' },
    { itemId: 'lvp', quantity: floorQty, tier: 'mid' },
    { itemId: 'cleaning', quantity: 1, tier: 'mid' },
  ]
}

function generateLightPreset(p: Required_EstimatorInputs): RehabSelection[] {
  const paintQty = wallSqft(p.square_footage)
  const floorQty = livableSqft(p.square_footage)
  const vanityCount = Math.min(fullBathCount(p.bathrooms), 3)

  return [
    { itemId: 'interior_paint', quantity: paintQty, tier: 'mid' },
    { itemId: 'lvp', quantity: floorQty, tier: 'mid' },
    { itemId: 'countertops', quantity: 1, tier: 'mid' },
    { itemId: 'appliances', quantity: 1, tier: 'mid' },
    { itemId: 'vanity', quantity: vanityCount, tier: 'mid' },
    { itemId: 'cleaning', quantity: 1, tier: 'mid' },
  ]
}

function generateMediumPreset(p: Required_EstimatorInputs): RehabSelection[] {
  const paintQty = wallSqft(p.square_footage)
  const floorQty = livableSqft(p.square_footage)
  const fullBaths = fullBathCount(p.bathrooms)
  const windows = Math.round(windowCount(p.square_footage) * 0.6)
  const age = propertyAge(p.year_built)

  const selections: RehabSelection[] = [
    { itemId: 'interior_paint', quantity: paintQty, tier: 'mid' },
    { itemId: 'lvp', quantity: floorQty, tier: 'mid' },
    { itemId: 'cabinets', quantity: 1, tier: 'mid' },
    { itemId: 'countertops', quantity: 1, tier: 'mid' },
    { itemId: 'appliances', quantity: 1, tier: 'mid' },
    { itemId: 'full_bath', quantity: fullBaths, tier: 'mid' },
    { itemId: 'windows', quantity: windows, tier: 'mid' },
    { itemId: 'drywall_repair', quantity: drywallRooms(p.bedrooms), tier: 'mid' },
    { itemId: 'permits', quantity: 1, tier: 'mid' },
    { itemId: 'dumpster', quantity: dumpsterLoads('medium'), tier: 'mid' },
  ]

  if (age > 15) {
    selections.push({ itemId: 'water_heater', quantity: 1, tier: 'mid' })
  }

  return selections
}

function generateHeavyPreset(p: Required_EstimatorInputs): RehabSelection[] {
  const paintQty = wallSqft(p.square_footage)
  const floorQty = livableSqft(p.square_footage)
  const fullBaths = fullBathCount(p.bathrooms)
  const halfBaths = halfBathCount(p.bathrooms)
  const windows = windowCount(p.square_footage)
  const age = propertyAge(p.year_built)

  const tileSqft = Math.round(p.square_footage * 0.15)

  const selections: RehabSelection[] = [
    { itemId: 'interior_paint', quantity: paintQty, tier: 'mid' },
    { itemId: 'exterior_paint', quantity: 1, tier: 'mid' },
    { itemId: 'hardwood', quantity: floorQty, tier: 'mid' },
    { itemId: 'tile', quantity: tileSqft, tier: 'mid' },
    { itemId: 'cabinets', quantity: 1, tier: 'high' },
    { itemId: 'countertops', quantity: 1, tier: 'high' },
    { itemId: 'appliances', quantity: 1, tier: 'high' },
    { itemId: 'full_bath', quantity: fullBaths, tier: 'high' },
    { itemId: 'windows', quantity: windows, tier: 'mid' },
    { itemId: 'front_door', quantity: 1, tier: 'mid' },
    { itemId: 'landscaping', quantity: 1, tier: 'mid' },
    { itemId: 'permits', quantity: 1, tier: 'high' },
    { itemId: 'dumpster', quantity: dumpsterLoads('heavy'), tier: 'mid' },
  ]

  if (halfBaths > 0) {
    selections.push({ itemId: 'half_bath', quantity: halfBaths, tier: 'mid' })
  }

  if (age > 15) {
    selections.push({ itemId: 'hvac', quantity: 1, tier: 'mid' })
    selections.push({ itemId: 'water_heater', quantity: 1, tier: 'mid' })
  }

  if (age > 20) {
    selections.push({ itemId: 'roof', quantity: 1, tier: 'mid' })
  }

  if (age > 30) {
    selections.push({ itemId: 'electrical_panel', quantity: 1, tier: 'mid' })
  }

  if (age > 40) {
    selections.push({ itemId: 'plumbing_repipe', quantity: 1, tier: 'mid' })
  }

  return selections
}

// ============================================
// COST COMPUTATION
// ============================================

function computeEstimatedCosts(
  selections: RehabSelection[],
  regionalFactor: number,
): { low: number; mid: number; high: number } {
  const low = calculateRehabEstimate(selections.map(s => ({ ...s, tier: 'low' as const })), 0).totalCost
  const mid = calculateRehabEstimate(selections.map(s => ({ ...s, tier: 'mid' as const })), 0).totalCost
  const high = calculateRehabEstimate(selections.map(s => ({ ...s, tier: 'high' as const })), 0).totalCost

  return {
    low: Math.round(low * regionalFactor),
    mid: Math.round(mid * regionalFactor),
    high: Math.round(high * regionalFactor),
  }
}

// ============================================
// PUBLIC API
// ============================================

export function generatePropertyPresets(
  property: EstimatorPropertyInput,
  costContext?: RegionalCostContext | null,
): GeneratedPreset[] {
  const p = resolveInputs(property)
  const factor = costContext?.combined_factor ?? 1.0
  const drivers = buildScopeDrivers(p)

  const presetConfigs: {
    id: string
    name: string
    description: string
    generator: (p: Required_EstimatorInputs) => RehabSelection[]
  }[] = [
    {
      id: 'cosmetic',
      name: 'Cosmetic Refresh',
      description: 'Paint + flooring + cleaning',
      generator: generateCosmeticPreset,
    },
    {
      id: 'light',
      name: 'Light Rehab',
      description: 'Cosmetic + kitchen/bath updates',
      generator: generateLightPreset,
    },
    {
      id: 'medium',
      name: 'Medium Rehab',
      description: 'Full kitchen/bath remodel + flooring + windows',
      generator: generateMediumPreset,
    },
    {
      id: 'heavy',
      name: 'Heavy Rehab',
      description: 'Full remodel + systems + exterior',
      generator: generateHeavyPreset,
    },
  ]

  return presetConfigs.map(({ id, name, description, generator }) => {
    const selections = generator(p)
    const estimatedCost = computeEstimatedCosts(selections, factor)

    return {
      id,
      name,
      description,
      estimatedCost,
      selections,
      property_driven: true as const,
      scope_drivers: drivers,
    }
  })
}

/**
 * Fallback: returns the static REHAB_PRESETS wrapped as GeneratedPresets
 * when no property data is available.
 */
export function getStaticPresetsFallback(): GeneratedPreset[] {
  const { REHAB_PRESETS } = require('./analytics')
  return (REHAB_PRESETS as import('./analytics').RehabPreset[]).map(preset => ({
    ...preset,
    property_driven: true as const,
    scope_drivers: [],
  }))
}
