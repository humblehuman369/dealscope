# Centralized Defaults Architecture

## Overview

DealGapIQ uses a centralized defaults architecture to ensure consistent financial assumptions across all platforms (web, mobile, backend calculations). This document describes the architecture, data flow, and implementation details.

## Problem Solved

Previously, default values were hardcoded in 20+ files across the codebase, leading to:
- **Inconsistency**: Interest rates varied from 6% to 7.5%, vacancy from 1% to 8%
- **Maintenance burden**: Updating a default required changing multiple files
- **No personalization**: Users couldn't save their preferred defaults
- **Market blindness**: No location-based adjustments

## Architecture

### Single Source of Truth

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Source of Truth)                        │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    backend/app/core/defaults.py                     │ │
│  │                                                                      │ │
│  │  @dataclass(frozen=True)                                            │ │
│  │  class FinancingDefaults:                                           │ │
│  │      down_payment_pct: float = 0.20                                 │ │
│  │      interest_rate: float = 0.06                                    │ │
│  │      loan_term_years: int = 30                                      │ │
│  │      ...                                                            │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                        API Endpoints                                │ │
│  │                                                                      │ │
│  │  GET /api/v1/defaults                    → System defaults          │ │
│  │  GET /api/v1/defaults/resolved?zip=33139 → Merged defaults          │ │
│  │  GET /api/v1/users/me/assumptions        → User preferences         │ │
│  │  PUT /api/v1/users/me/assumptions        → Save preferences         │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/JSON
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND / MOBILE (Consumers)                     │
│                                                                          │
│  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────────┐  │
│  │  useDefaults()     │  │  defaultsService   │  │  worksheetStore  │  │
│  │  React Hook        │  │  Fetch + Cache     │  │  Uses defaults   │  │
│  └────────────────────┘  └────────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Defaults Resolution Hierarchy

Defaults are resolved in order of priority (later layers override earlier):

| Priority | Layer | Source | Description |
|----------|-------|--------|-------------|
| 1 (lowest) | System Defaults | `defaults.py` | Base values for all users |
| 2 | Market Adjustments | `assumptions_service.py` | ZIP-code based adjustments |
| 3 | User Profile | Database | User's saved preferences |
| 4 | Property Data | API Response | Actual property values |
| 5 (highest) | Session Overrides | Client State | Deal Maker adjustments |

### Example Resolution

For a property in Miami (ZIP 33139):

```json
{
  "financing": {
    "interest_rate": 0.06,        // System default
    "down_payment_pct": 0.20      // System default
  },
  "operating": {
    "vacancy_rate": 0.01,         // User preference (owner-managed)
    "insurance_pct": 0.018        // Market adjustment (FL coastal)
  }
}
```

## Default Categories

### Financing Defaults

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `down_payment_pct` | float | 0.20 | Down payment as % of purchase price |
| `interest_rate` | float | 0.06 | Annual mortgage interest rate |
| `loan_term_years` | int | 30 | Loan term in years |
| `closing_costs_pct` | float | 0.03 | Closing costs as % of purchase price |

### Operating Defaults

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `vacancy_rate` | float | 0.01 | Expected vacancy rate |
| `property_management_pct` | float | 0.00 | Management fee as % of rent |
| `maintenance_pct` | float | 0.05 | Maintenance as % of rent |
| `insurance_pct` | float | 0.01 | Insurance as % of purchase price |
| `utilities_monthly` | float | 100 | Monthly utilities cost |
| `landscaping_annual` | float | 0 | Annual landscaping cost |
| `pest_control_annual` | float | 200 | Annual pest control cost |

### Short-Term Rental (STR) Defaults

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `platform_fees_pct` | float | 0.15 | Airbnb/VRBO platform fees |
| `str_management_pct` | float | 0.10 | STR property management fee |
| `cleaning_cost_per_turnover` | float | 150 | Cleaning cost per guest turnover |
| `cleaning_fee_revenue` | float | 75 | Cleaning fee charged to guests |
| `avg_length_of_stay_days` | int | 6 | Average guest stay length |
| `supplies_monthly` | float | 100 | Monthly supplies cost |
| `additional_utilities_monthly` | float | 0 | Extra utilities for STR |
| `furniture_setup_cost` | float | 6000 | Initial furniture investment |
| `str_insurance_pct` | float | 0.01 | STR insurance as % of price |

### BRRRR Defaults

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `buy_discount_pct` | float | 0.05 | Target discount below breakeven |
| `refinance_ltv` | float | 0.75 | Refinance loan-to-value |
| `refinance_interest_rate` | float | 0.06 | Refinance mortgage rate |
| `refinance_term_years` | int | 30 | Refinance loan term |
| `refinance_closing_costs_pct` | float | 0.03 | Refinance closing costs |
| `post_rehab_rent_increase_pct` | float | 0.10 | Expected rent increase after rehab |

### Rehab Defaults

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `renovation_budget_pct` | float | 0.05 | Renovation as % of ARV |
| `contingency_pct` | float | 0.05 | Contingency buffer |
| `holding_period_months` | int | 4 | Expected rehab duration |
| `holding_costs_pct` | float | 0.01 | Annual holding costs as % of price |

### Fix & Flip Defaults

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `hard_money_ltv` | float | 0.90 | Hard money loan-to-value |
| `hard_money_rate` | float | 0.12 | Hard money annual rate |
| `selling_costs_pct` | float | 0.06 | Selling costs (commission + closing) |
| `holding_period_months` | int | 6 | Expected flip duration |

### House Hack Defaults

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `fha_down_payment_pct` | float | 0.035 | FHA minimum down payment |
| `fha_mip_rate` | float | 0.0085 | FHA mortgage insurance premium |
| `units_rented_out` | int | 2 | Number of units to rent |
| `buy_discount_pct` | float | 0.05 | Target discount below breakeven |

### Wholesale Defaults

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `assignment_fee` | float | 15000 | Wholesale assignment fee |
| `marketing_costs` | float | 500 | Marketing costs per deal |
| `earnest_money_deposit` | float | 1000 | EMD amount |
| `days_to_close` | int | 45 | Expected days to close |
| `target_purchase_discount_pct` | float | 0.30 | Target discount (70% rule) |

### Growth Defaults

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `appreciation_rate` | float | 0.05 | Annual property appreciation |
| `rent_growth_rate` | float | 0.05 | Annual rent growth |
| `expense_growth_rate` | float | 0.03 | Annual expense growth |

## API Reference

### GET /api/v1/defaults

Returns system defaults without any adjustments.

**Response:**
```json
{
  "financing": { ... },
  "operating": { ... },
  "str": { ... },
  "brrrr": { ... },
  "rehab": { ... },
  "flip": { ... },
  "house_hack": { ... },
  "wholesale": { ... },
  "growth": { ... }
}
```

### GET /api/v1/defaults/resolved

Returns fully resolved defaults for a specific location.

**Query Parameters:**
- `zip_code` (optional): ZIP code for market adjustments

**Response:**
```json
{
  "defaults": { ... },
  "market_adjustments": {
    "region": "FL_SOUTH",
    "insurance_rate": 0.018,
    "property_tax_rate": 0.012
  },
  "user_overrides": { ... },
  "resolved": { ... }
}
```

### GET /api/v1/users/me/assumptions

Returns authenticated user's saved default preferences.

**Response:**
```json
{
  "financing": {
    "down_payment_pct": 0.25,
    "interest_rate": 0.055
  },
  "operating": {
    "vacancy_rate": 0.03,
    "property_management_pct": 0.00
  }
}
```

### PUT /api/v1/users/me/assumptions

Updates authenticated user's default preferences.

**Request Body:**
```json
{
  "financing": {
    "down_payment_pct": 0.25
  },
  "operating": {
    "vacancy_rate": 0.03
  }
}
```

## Frontend Implementation

### useDefaults Hook

```typescript
import { useDefaults } from '@/hooks/useDefaults'

function PropertyAnalysis({ zipCode }) {
  const { defaults, loading, error, refetch } = useDefaults(zipCode)
  
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  
  const { financing, operating, str } = defaults
  
  return (
    <div>
      <p>Interest Rate: {(financing.interest_rate * 100).toFixed(2)}%</p>
      <p>Vacancy Rate: {(operating.vacancy_rate * 100).toFixed(1)}%</p>
    </div>
  )
}
```

### Defaults Service

```typescript
import { defaultsService } from '@/services/defaults'

// Fetch defaults with caching
const defaults = await defaultsService.getDefaults()

// Fetch resolved defaults for a location
const resolved = await defaultsService.getResolvedDefaults('33139')

// Get user's saved preferences
const userDefaults = await defaultsService.getUserAssumptions()

// Update user's preferences
await defaultsService.updateUserAssumptions({
  financing: { down_payment_pct: 0.25 }
})
```

## Mobile Implementation

The mobile app uses the same pattern:

```typescript
import { useDefaults } from '../services/defaults'

function DealMakerScreen({ property }) {
  const { defaults, loading } = useDefaults(property.zipCode)
  
  // Initialize sliders with defaults
  const [assumptions, setAssumptions] = useState(null)
  
  useEffect(() => {
    if (defaults) {
      setAssumptions({
        downPayment: defaults.financing.down_payment_pct,
        interestRate: defaults.financing.interest_rate,
        vacancyRate: defaults.operating.vacancy_rate,
        // ...
      })
    }
  }, [defaults])
  
  return (
    <AssumptionsSliders
      assumptions={assumptions}
      onAssumptionsChange={setAssumptions}
    />
  )
}
```

## Adding New Defaults

### Step 1: Add to Backend

Edit `backend/app/core/defaults.py`:

```python
@dataclass(frozen=True)
class NewCategoryDefaults:
    new_field: float = 0.10
    
NEW_CATEGORY = NewCategoryDefaults()

def get_all_defaults():
    return {
        # ... existing categories
        "new_category": {
            "new_field": NEW_CATEGORY.new_field,
        }
    }
```

### Step 2: Update TypeScript Types

Edit `frontend/src/stores/index.ts`:

```typescript
export interface NewCategoryAssumptions {
  new_field: number
}

export interface AllAssumptions {
  // ... existing
  new_category: NewCategoryAssumptions
}
```

### Step 3: Use in Components

The new field is now available via `useDefaults()`:

```typescript
const { defaults } = useDefaults(zipCode)
const newField = defaults.new_category.new_field
```

## Enforcement

### 1. Cursor Rule

The `.cursor/rules/defaults-architecture.mdc` file instructs AI assistants to never hardcode defaults.

### 2. Code Review Checklist

- [ ] No numeric literals that look like percentages (0.05, 0.20, etc.)
- [ ] `useDefaults()` hook used for all default values
- [ ] Types imported from central location
- [ ] No `DEFAULT_*` constants with hardcoded values

### 3. Runtime Validation

The `useDefaults()` hook logs warnings if defaults aren't fetched from the API.

## Migration Guide

### Before (Hardcoded)

```typescript
const DEFAULT_ASSUMPTIONS = {
  interestRate: 0.06,
  vacancyRate: 0.05,
}

function Component() {
  const [rate, setRate] = useState(DEFAULT_ASSUMPTIONS.interestRate)
}
```

### After (Centralized)

```typescript
import { useDefaults } from '@/hooks/useDefaults'

function Component({ zipCode }) {
  const { defaults, loading } = useDefaults(zipCode)
  const [rate, setRate] = useState<number | null>(null)
  
  useEffect(() => {
    if (defaults) {
      setRate(defaults.financing.interest_rate)
    }
  }, [defaults])
  
  if (loading || rate === null) return <LoadingSpinner />
}
```

## IQ Verdict Scoring

### Core Value Proposition

> Every property can be a good investment at the right price.
> 
> DealGapIQ answers two critical questions:
> 1. **What price makes this deal work?** (Breakeven) - based on YOUR financing terms
> 2. **How likely can you get that price?** (Deal Gap + Motivation) - based on market signals

### Price Points

| Price | Calculation | Purpose |
|-------|-------------|---------|
| **Breakeven** | Max price for $0 monthly cash flow | Maximum you can pay |
| **Target Buy** | Breakeven × (1 - buy_discount_pct) | Recommended purchase price |
| **Wholesale** | Breakeven × 0.70 | Assignment deal price |

### Deal Gap

The Deal Gap measures the distance between asking price and your breakeven:

```
Deal Gap = (Asking Price - Breakeven) / Asking Price × 100%
```

- **Negative gap**: Deal is profitable at asking price
- **Positive gap**: Need to negotiate a discount
- **0%**: Break-even at asking price

### Off-Market Properties

When there's no listing price:
- Use AVM (Zestimate) as "Estimated Market Value"
- Display: "No asking price - using market estimate"
- Allow user to input expected price in Deal Maker

### Seller Motivation Score

The `calculate_seller_motivation()` function analyzes:

| Indicator | Weight | Description |
|-----------|--------|-------------|
| Days on Market | 3.0 | Time on market vs. market average |
| Price Reductions | 3.0 | Number and percentage of cuts |
| Expired/Withdrawn | 3.0 | Previously failed to sell |
| Foreclosure/Distress | 3.0 | Pre-foreclosure, REO, auction |
| Absentee Owner | 2.5 | Non-owner occupied |
| Out-of-State Owner | 2.5 | Owner in different state |
| Likely Vacant | 2.0 | Appears unoccupied |
| Poor Condition | 2.0 | Condition issues mentioned |
| Possibly Inherited | 2.0 | Signs of inheritance sale |
| FSBO | 1.0 | For sale by owner |
| Owner-Occupied | 1.0 | Counter-indicator |

### Display Guidelines

1. Always show user's assumptions: "Based on YOUR terms (20% down, 7% rate)"
2. Offer "See how we calculated this" expandable section
3. Integrate Seller Motivation into Deal Gap display (not separate)
4. Show suggested negotiation range based on motivation score

---

## Deal Maker Integration

### State Management

Deal Maker MUST use `worksheetStore` (Zustand), not isolated local state:

```typescript
// ❌ WRONG: Isolated state
const [state, setState] = useState<DealMakerState>(initial)

// ✅ CORRECT: Shared store
const { assumptions, updateAssumption } = useWorksheetStore()
```

### Field Mapping

| Deal Maker | worksheetStore |
|------------|---------------|
| buyPrice | purchasePrice |
| downPaymentPercent | downPaymentPct |
| closingCostsPercent | closingCostsPct |
| interestRate | interestRate |
| loanTermYears | loanTermYears |
| rehabBudget | rehabCosts |
| arv | arv |
| monthlyRent | monthlyRent |
| vacancyRate | vacancyRate |
| maintenanceRate | maintenancePct |
| managementRate | managementPct |
| annualPropertyTax | propertyTaxes |
| annualInsurance | insurance |
| monthlyHoa | hoaFees |

### Recalculation Flow

```
User adjusts slider
        ↓
worksheetStore.updateAssumption()
        ↓
Zustand triggers re-render
        ↓
recalculateProjections() - client-side
recalculateWorksheetMetrics() - API call (debounced)
        ↓
All subscribed components update
```

### "See Results" Button

Deal Maker should have a persistent way to see results:
- Floating or fixed position
- Shows: Deal Score, Cash Flow, CoC (live updating)
- Click navigates to full verdict page

---

## FAQ

### Q: What if the API is slow or unavailable?

The `useDefaults()` hook caches responses in memory and localStorage. On failure, it returns cached values with a stale indicator.

### Q: Can users override ALL defaults?

Yes, through the Dashboard Defaults Editor. Overrides are stored per-user in the database.

### Q: How do market adjustments work?

The backend maps ZIP codes to regions (FL, TX, CA, etc.) and applies region-specific adjustments for insurance rates, tax rates, and vacancy rates.

### Q: What about session-level overrides?

Session overrides (Deal Maker adjustments) are stored in client state only and are not persisted unless the user explicitly saves them.

### Q: Why use worksheetStore instead of local state?

Using worksheetStore ensures:
1. Changes propagate to all analytics components
2. Automatic recalculation of metrics
3. Persistence across navigation
4. Sync with backend for saving
