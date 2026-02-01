# Multi-Strategy DealMaker Popup

## Overview

Extend the DealMakerPopup to support all 6 investment strategies (LTR, STR, BRRRR, Fix & Flip, House Hack, Wholesale) with strategy-specific fields, calculations, and UI sections.

## Strategy Field Summary

| Strategy | Phases | Key Fields | Calculated Metrics |
|----------|--------|------------|-------------------|
| BRRRR | 5 | 20+ fields | Cash Out, Left in Deal, CoC Return |
| Fix & Flip | 5 | 13+ fields | Net Profit, ROI, 70% Rule |
| House Hack | 4 | 18 fields | Effective Housing Cost, Offset % |
| Wholesale | 3 | 9 fields | Net Profit, ROI, Buyer Profit |

## File Changes

### 1. Update DealMakerPopup Types

**File:** `frontend/src/components/deal-maker/DealMakerPopup.tsx`

Extend `PopupStrategyType`:
```typescript
export type PopupStrategyType = 'ltr' | 'str' | 'brrrr' | 'flip' | 'house_hack' | 'wholesale'
```

Extend `DealMakerValues` interface with fields for all strategies:

**BRRRR fields:**
- `buyDiscountPct`, `hardMoneyRate`, `holdingPeriodMonths`, `holdingCostsMonthly`
- `postRehabMonthlyRent`, `refinanceLtv`, `refinanceInterestRate`, `refinanceTermYears`, `refinanceClosingCostsPct`

**Fix & Flip fields:**
- `financingType`, `hardMoneyLtv`, `loanPoints`, `rehabTimeMonths`
- `daysOnMarket`, `sellingCostsPct`, `capitalGainsRate`

**House Hack fields:**
- `totalUnits`, `ownerOccupiedUnits`, `ownerUnitMarketRent`, `loanType`, `pmiRate`
- `avgRentPerUnit`, `currentHousingPayment`, `utilitiesMonthly`, `capexRate`

**Wholesale fields:**
- `estimatedRepairs`, `squareFootage`, `contractPrice`, `earnestMoney`
- `inspectionPeriodDays`, `daysToClose`, `assignmentFee`, `marketingCosts`

### 2. Add Default Values for Each Strategy

Create `DEFAULT_BRRRR_VALUES`, `DEFAULT_FLIP_VALUES`, `DEFAULT_HOUSEHACK_VALUES`, `DEFAULT_WHOLESALE_VALUES` constants with sensible defaults matching DealMakerScreen.tsx.

### 3. Add Strategy-Specific UI Sections

For each strategy, add conditional rendering blocks:

**BRRRR Sections:**
- Purchase (buy price, discount, hard money terms)
- Rehab (budget, contingency, holding period)
- Rent (post-rehab rent, vacancy, management)
- Refinance (LTV, rate, term)
- Calculated: Cash Out, Money Left in Deal

**Fix & Flip Sections:**
- Purchase (buy price, closing costs)
- Financing (type toggle: Cash/Hard Money)
- Rehab (budget, contingency, timeline, ARV)
- Hold & Sell (holding costs, DOM, selling costs, taxes)
- Calculated: Net Profit, ROI, 70% Rule

**House Hack Sections:**
- Property (price, units, owner unit market rent)
- Financing (loan type toggle, down payment, rate, PMI)
- Rent (avg rent per unit, vacancy, current housing payment)
- Expenses (taxes, insurance, HOA, utilities, maintenance, capex)
- Calculated: Effective Housing Cost, Housing Offset %

**Wholesale Sections:**
- Property (ARV, estimated repairs)
- Contract (contract price, earnest money, inspection period, days to close)
- Assignment (assignment fee, marketing costs, closing costs)
- Calculated: MAO, Net Profit, Buyer Profit, 70% Rule

### 4. Add Calculations for Each Strategy

Import calculation functions from existing modules or create inline calculations:
- BRRRR: `calculateBRRRRMetrics` for refinance cash-out, money left in deal
- Flip: `calculateFlipMetrics` for net profit, ROI, 70% rule
- House Hack: `calculateHouseHackMetrics` for effective housing cost
- Wholesale: `calculateWholesaleMetrics` for MAO, buyer analysis

### 5. Update Strategy Toggle

Extend the LTR/STR toggle to include all 6 strategies:
```tsx
<div className="flex flex-wrap gap-1">
  {['ltr', 'str', 'brrrr', 'flip', 'house_hack', 'wholesale'].map(s => (
    <button key={s} onClick={() => onStrategyChange?.(s)} ...>
      {STRATEGY_LABELS[s]}
    </button>
  ))}
</div>
```

### 6. Update VerdictIQCombined.tsx

**Update `getPopupStrategyType` function:**
```typescript
function getPopupStrategyType(headerStrategy: string): PopupStrategyType {
  switch (headerStrategy) {
    case 'Short-term': return 'str'
    case 'BRRRR': return 'brrrr'
    case 'Fix & Flip': return 'flip'
    case 'House Hack': return 'house_hack'
    case 'Wholesale': return 'wholesale'
    default: return 'ltr'
  }
}
```

**Update `handlePopupStrategyChange`:**
```typescript
const handlePopupStrategyChange = useCallback((popupStrategy: PopupStrategyType) => {
  const headerMap: Record<PopupStrategyType, string> = {
    ltr: 'Long-term',
    str: 'Short-term',
    brrrr: 'BRRRR',
    flip: 'Fix & Flip',
    house_hack: 'House Hack',
    wholesale: 'Wholesale'
  }
  setCurrentStrategy(headerMap[popupStrategy])
}, [])
```

**Extend `initialValues` with all strategy fields.**

## Implementation Order

1. Extend types and add all strategy fields to interface
2. Add default value constants for each strategy
3. Update strategy toggle UI
4. Add BRRRR sections and calculations
5. Add Fix & Flip sections and calculations
6. Add House Hack sections and calculations
7. Add Wholesale sections and calculations
8. Update VerdictIQ strategy mapping and initial values
9. Verify build and test

## To-Do Items

- [ ] Extend PopupStrategyType and DealMakerValues with BRRRR, Flip, HouseHack, Wholesale fields
- [ ] Add DEFAULT_BRRRR_VALUES, DEFAULT_FLIP_VALUES, DEFAULT_HOUSEHACK_VALUES, DEFAULT_WHOLESALE_VALUES
- [ ] Update strategy toggle to show all 6 strategies
- [ ] Add BRRRR sections: Purchase, Rehab, Rent, Refinance with calculations
- [ ] Add Fix & Flip sections: Purchase, Financing, Rehab, Hold & Sell with calculations
- [ ] Add House Hack sections: Property, Financing, Rent, Expenses with calculations
- [ ] Add Wholesale sections: Property, Contract, Assignment with calculations
- [ ] Update VerdictIQ strategy mapping and initialValues for all strategies
