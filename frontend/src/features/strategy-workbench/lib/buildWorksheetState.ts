/**
 * buildWorksheetState — derives the per-strategy DealMaker worksheet state from
 * the merged override layers + backend breakdown.
 * Extracted verbatim from `app/strategy/page.tsx` (R4 Stage 1) — no behavior change.
 */

import type {
  StrategyType,
  AnyStrategyState,
  LTRDealMakerState,
  STRDealMakerState,
  BRRRRDealMakerState,
  FlipDealMakerState,
  FlipFinancingType,
  HouseHackDealMakerState,
  HouseHackLoanType,
  WholesaleDealMakerState,
} from '@/features/deal-maker/components/types'
import {
  DEFAULT_STR_DEAL_MAKER_STATE,
  DEFAULT_BRRRR_DEAL_MAKER_STATE,
  DEFAULT_FLIP_DEAL_MAKER_STATE,
  DEFAULT_HOUSEHACK_DEAL_MAKER_STATE,
  DEFAULT_WHOLESALE_DEAL_MAKER_STATE,
} from '@/features/deal-maker/components/types'
import {
  DEFAULT_OPERATING_CAPEX_PCT,
  DEFAULT_OPERATING_PEST_CONTROL_ANNUAL,
  DEFAULT_OPERATING_UTILITIES_MONTHLY,
} from '@/lib/operatingExpenseDefaults'
import type { BackendAnalysisResponse, DealGapOperatingOverrides } from './shared'

export interface WorksheetStateInputs {
  currentStrategyType: StrategyType
  /** Merged initial + inline overrides (same object sent to the backend). */
  dealMakerOverrides: Record<string, any> | null
  /** Inline-only overrides — used for non-numeric fields (financingType, loanType). */
  inlineOverrides: Record<string, any>
  dealRecordArv: number | null | undefined
  bd: Record<string, number> | undefined
  data: BackendAnalysisResponse | null
  propertyInfo: any
  listPrice: number
  targetPrice: number
  monthlyRent: number
  propertyTaxes: number
  insurance: number
  rehabCost: number
  rate: number
  downPaymentPct: number
  closingCostsPct: number
  loanTermYears: number
  vacancyPct: number
  maintPct: number
  mgmtPct: number
  reservesPct: number
  dealGapOperatingOverrides: DealGapOperatingOverrides | null
}

export function buildWorksheetState(inputs: WorksheetStateInputs): AnyStrategyState {
  const {
    currentStrategyType,
    dealMakerOverrides,
    inlineOverrides,
    dealRecordArv,
    bd,
    data,
    propertyInfo,
    listPrice,
    targetPrice,
    monthlyRent,
    propertyTaxes,
    insurance,
    rehabCost,
    rate,
    downPaymentPct,
    closingCostsPct,
    loanTermYears,
    vacancyPct,
    maintPct,
    mgmtPct,
    reservesPct,
    dealGapOperatingOverrides,
  } = inputs

  // Read from the SAME merged source we send to the backend (`dealMakerOverrides`)
  // — not `inlineOverrides` alone. Otherwise initialOverrides (session storage,
  // saved Three Paths scenarios) get sent to the backend silently while the
  // slider UI shows the un-applied default, producing inconsistent math
  // (e.g., $0 seller-financing slider but a $130K seller note in the cash flow).
  const mergedOverrides = (dealMakerOverrides ?? {}) as Record<string, unknown>
  const io = mergedOverrides as Record<string, number | undefined>
  const ioAny = mergedOverrides
  const sf = {
    sellerFinancingAmount:
      (typeof ioAny.sellerFinancingAmount === 'number' ? ioAny.sellerFinancingAmount : null) ??
      (typeof ioAny.seller_carry_amount === 'number' ? ioAny.seller_carry_amount : null) ??
      0,
    sellerInterestRate:
      (typeof ioAny.sellerInterestRate === 'number' ? ioAny.sellerInterestRate : null) ??
      (typeof ioAny.seller_carry_rate === 'number' ? ioAny.seller_carry_rate : null) ??
      0,
    sellerTermYears:
      (typeof ioAny.sellerTermYears === 'number' ? ioAny.sellerTermYears : null) ??
      (typeof ioAny.seller_carry_term_years === 'number'
        ? ioAny.seller_carry_term_years
        : null) ??
      30,
    sellerBalloonYears:
      (typeof ioAny.sellerBalloonYears === 'number' ? ioAny.sellerBalloonYears : null) ??
      (typeof ioAny.seller_carry_balloon_years === 'number'
        ? ioAny.seller_carry_balloon_years
        : null) ??
      10,
    sellerInterestOnly:
      (typeof ioAny.sellerInterestOnly === 'boolean' ? ioAny.sellerInterestOnly : null) ??
      (typeof ioAny.seller_carry_interest_only === 'boolean'
        ? ioAny.seller_carry_interest_only
        : null) ??
      false,
  }
  const arvVal =
    io.arv ?? (dealRecordArv && dealRecordArv > 0 ? dealRecordArv : null) ?? bd?.arv ?? data?.inputs_used?.arv ?? listPrice

  switch (currentStrategyType) {
    case 'str': {
      const adr = bd?.adr ?? DEFAULT_STR_DEAL_MAKER_STATE.averageDailyRate
      const occRate =
        bd?.occupancy_rate != null
          ? bd.occupancy_rate / 100
          : DEFAULT_STR_DEAL_MAKER_STATE.occupancyRate
      // Bank Loan is the stored financing input; Down Payment is the derived residual.
      const strBuy = io.purchasePrice ?? targetPrice
      const strSeller = Math.max(0, sf.sellerFinancingAmount)
      const strBankLoan =
        typeof ioAny.bankLoanAmount === 'number' ? Math.max(0, ioAny.bankLoanAmount) : null
      const strDownPct =
        strBankLoan != null && strBuy > 0
          ? Math.max(-1, Math.min(1, (strBuy - strBankLoan - strSeller) / strBuy))
          : io.downPayment != null
            ? io.downPayment / 100
            : downPaymentPct
      return {
        buyPrice: strBuy,
        downPaymentPercent: strDownPct,
        bankLoanAmount: strBankLoan ?? undefined,
        closingCostsPercent: io.closingCosts != null ? io.closingCosts / 100 : closingCostsPct,
        loanType: '30-year' as const,
        interestRate: io.interestRate ?? rate,
        loanTermYears: io.loanTerm ?? loanTermYears,
        rehabBudget: io.rehabBudget ?? rehabCost,
        arv: arvVal,
        furnitureSetupCost:
          io.furnitureSetupCost ??
          bd?.furniture_setup ??
          DEFAULT_STR_DEAL_MAKER_STATE.furnitureSetupCost,
        averageDailyRate: io.averageDailyRate ?? adr,
        occupancyRate: io.occupancyRate ?? occRate,
        cleaningFeeRevenue:
          io.cleaningFeeRevenue ?? DEFAULT_STR_DEAL_MAKER_STATE.cleaningFeeRevenue,
        avgLengthOfStayDays:
          io.avgLengthOfStayDays ?? DEFAULT_STR_DEAL_MAKER_STATE.avgLengthOfStayDays,
        platformFeeRate:
          io.platformFeeRate ??
          (bd?.platform_fees_pct != null
            ? bd.platform_fees_pct / 100
            : DEFAULT_STR_DEAL_MAKER_STATE.platformFeeRate),
        strManagementRate:
          io.strManagementRate ??
          (bd?.management_pct != null
            ? bd.management_pct / 100
            : DEFAULT_STR_DEAL_MAKER_STATE.strManagementRate),
        cleaningCostPerTurnover:
          io.cleaningCostPerTurnover ?? DEFAULT_STR_DEAL_MAKER_STATE.cleaningCostPerTurnover,
        suppliesMonthly:
          io.suppliesMonthly ??
          (bd?.supplies != null
            ? bd.supplies / 12
            : DEFAULT_STR_DEAL_MAKER_STATE.suppliesMonthly),
        additionalUtilitiesMonthly:
          io.additionalUtilitiesMonthly ??
          (bd?.utilities != null
            ? bd.utilities / 12
            : DEFAULT_STR_DEAL_MAKER_STATE.additionalUtilitiesMonthly),
        maintenanceRate: io.maintenanceRate ?? maintPct,
        annualPropertyTax: io.propertyTaxes ?? propertyTaxes,
        annualInsurance: io.insurance ?? insurance,
        monthlyHoa: io.monthlyHoa ?? propertyInfo?.market?.hoa_fees_monthly ?? 0,
        ...sf,
      } satisfies STRDealMakerState
    }

    case 'brrrr': {
      // Acquisition loan is sized off the discount-adjusted effective price; the Bank
      // Loan is the stored financing input and the down payment is the derived residual.
      const brBuy = io.purchasePrice ?? targetPrice
      const brDiscount = io.buyDiscountPct ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.buyDiscountPct
      const brEff = brBuy * (1 - brDiscount)
      const brSeller = Math.max(0, sf.sellerFinancingAmount)
      const brBankLoan =
        typeof ioAny.bankLoanAmount === 'number' ? Math.max(0, ioAny.bankLoanAmount) : null
      const brDownPct =
        brBankLoan != null && brEff > 0
          ? Math.max(-1, Math.min(1, (brEff - brBankLoan - brSeller) / brEff))
          : io.downPayment != null
            ? io.downPayment / 100
            : downPaymentPct
      return {
        purchasePrice: brBuy,
        buyDiscountPct: brDiscount,
        downPaymentPercent: brDownPct,
        bankLoanAmount: brBankLoan ?? undefined,
        closingCostsPercent: io.closingCosts != null ? io.closingCosts / 100 : closingCostsPct,
        hardMoneyRate: io.hardMoneyRate ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.hardMoneyRate,
        rehabBudget: io.rehabBudget ?? rehabCost,
        contingencyPct: io.contingencyPct ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.contingencyPct,
        holdingPeriodMonths:
          io.holdingPeriodMonths ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.holdingPeriodMonths,
        holdingCostsMonthly:
          io.holdingCostsMonthly ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.holdingCostsMonthly,
        arv: arvVal,
        postRehabMonthlyRent: io.monthlyRent ?? monthlyRent,
        postRehabRentIncreasePct: DEFAULT_BRRRR_DEAL_MAKER_STATE.postRehabRentIncreasePct,
        refinanceLtv: io.refinanceLtv ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceLtv,
        refinanceInterestRate:
          io.refinanceInterestRate ??
          (bd?.interest_rate != null
            ? bd.interest_rate / 100
            : DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceInterestRate),
        refinanceTermYears:
          bd?.loan_term_years ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceTermYears,
        refinanceClosingCostsPct: DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceClosingCostsPct,
        vacancyRate: io.vacancyRate != null ? io.vacancyRate / 100 : vacancyPct,
        maintenanceRate: io.maintenanceRate ?? maintPct,
        managementRate: io.managementRate != null ? io.managementRate / 100 : mgmtPct,
        annualPropertyTax: io.propertyTaxes ?? propertyTaxes,
        annualInsurance: io.insurance ?? insurance,
        monthlyHoa: io.monthlyHoa ?? propertyInfo?.market?.hoa_fees_monthly ?? 0,
        ...sf,
      } satisfies BRRRRDealMakerState
    }

    case 'flip': {
      const hoa = io.monthlyHoa ?? propertyInfo?.market?.hoa_fees_monthly ?? 0
      return {
        purchasePrice: io.purchasePrice ?? targetPrice,
        purchaseDiscountPct:
          io.purchaseDiscountPct ?? DEFAULT_FLIP_DEAL_MAKER_STATE.purchaseDiscountPct,
        closingCostsPercent: io.closingCosts != null ? io.closingCosts / 100 : closingCostsPct,
        financingType: (inlineOverrides.financingType as FlipFinancingType) ?? 'hardMoney',
        hardMoneyLtv: io.hardMoneyLtv ?? DEFAULT_FLIP_DEAL_MAKER_STATE.hardMoneyLtv,
        hardMoneyRate: io.hardMoneyRate ?? DEFAULT_FLIP_DEAL_MAKER_STATE.hardMoneyRate,
        loanPoints: io.loanPoints ?? DEFAULT_FLIP_DEAL_MAKER_STATE.loanPoints,
        rehabBudget: io.rehabBudget ?? rehabCost,
        contingencyPct: io.contingencyPct ?? DEFAULT_FLIP_DEAL_MAKER_STATE.contingencyPct,
        rehabTimeMonths:
          io.rehabTimeMonths ??
          bd?.holding_months ??
          DEFAULT_FLIP_DEAL_MAKER_STATE.rehabTimeMonths,
        arv: arvVal,
        // HOA accrues during the hold period, so seed it into the holding-costs
        // baseline when the user hasn't overridden the row directly.
        holdingCostsMonthly:
          io.holdingCostsMonthly ?? propertyTaxes / 12 + insurance / 12 + 200 + hoa,
        daysOnMarket: io.daysOnMarket ?? DEFAULT_FLIP_DEAL_MAKER_STATE.daysOnMarket,
        sellingCostsPct:
          io.sellingCostsPct ??
          (bd?.selling_costs_pct != null
            ? bd.selling_costs_pct / 100
            : DEFAULT_FLIP_DEAL_MAKER_STATE.sellingCostsPct),
        capitalGainsRate: io.capitalGainsRate ?? DEFAULT_FLIP_DEAL_MAKER_STATE.capitalGainsRate,
        monthlyHoa: hoa,
        ...sf,
      } satisfies FlipDealMakerState
    }

    case 'house_hack': {
      const totalBeds = bd?.total_bedrooms ?? propertyInfo?.details?.bedrooms ?? 4
      const rentPerRoom = bd?.rent_per_room ?? monthlyRent / Math.max(totalBeds, 1)
      // Bank Loan is the stored financing input; Down Payment is the derived residual.
      const hhBuy = io.purchasePrice ?? targetPrice
      const hhSeller = Math.max(0, sf.sellerFinancingAmount)
      const hhBankLoan =
        typeof ioAny.bankLoanAmount === 'number' ? Math.max(0, ioAny.bankLoanAmount) : null
      const hhDownPct =
        hhBankLoan != null && hhBuy > 0
          ? Math.max(-1, Math.min(1, (hhBuy - hhBankLoan - hhSeller) / hhBuy))
          : io.downPayment != null
            ? io.downPayment / 100
            : bd?.down_payment_pct != null
              ? bd.down_payment_pct / 100
              : DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.downPaymentPercent
      return {
        purchasePrice: hhBuy,
        totalUnits: io.totalUnits ?? totalBeds,
        ownerOccupiedUnits: io.ownerOccupiedUnits ?? 1,
        ownerUnitMarketRent: rentPerRoom,
        loanType: (inlineOverrides.loanType as HouseHackLoanType) ?? 'fha',
        downPaymentPercent: hhDownPct,
        bankLoanAmount: hhBankLoan ?? undefined,
        interestRate:
          io.interestRate ??
          (bd?.interest_rate != null
            ? bd.interest_rate / 100
            : DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.interestRate),
        loanTermYears:
          io.loanTerm ?? bd?.loan_term_years ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.loanTermYears,
        pmiRate: io.pmiRate ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.pmiRate,
        closingCostsPercent: io.closingCosts != null ? io.closingCosts / 100 : closingCostsPct,
        avgRentPerUnit: io.avgRentPerUnit ?? rentPerRoom,
        vacancyRate: io.vacancyRate != null ? io.vacancyRate / 100 : vacancyPct,
        currentHousingPayment:
          io.currentHousingPayment ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.currentHousingPayment,
        annualPropertyTax: io.propertyTaxes ?? propertyTaxes,
        annualInsurance: io.insurance ?? insurance,
        monthlyHoa: io.monthlyHoa ?? propertyInfo?.market?.hoa_fees_monthly ?? 0,
        utilitiesMonthly:
          io.utilitiesMonthly ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.utilitiesMonthly,
        maintenanceRate: io.maintenanceRate ?? maintPct,
        capexRate: io.capexRate ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.capexRate,
        ...sf,
      } satisfies HouseHackDealMakerState
    }

    case 'wholesale': {
      const contractPrice = io.purchasePrice ?? targetPrice
      return {
        arv: arvVal,
        estimatedRepairs: io.rehabBudget ?? rehabCost,
        squareFootage: propertyInfo?.details?.square_footage ?? 1500,
        contractPrice,
        earnestMoney:
          io.earnestMoney ?? bd?.emd ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.earnestMoney,
        inspectionPeriodDays:
          io.inspectionPeriodDays ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.inspectionPeriodDays,
        daysToClose: io.daysToClose ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.daysToClose,
        assignmentFee:
          io.assignmentFee ??
          bd?.assignment_fee ??
          DEFAULT_WHOLESALE_DEAL_MAKER_STATE.assignmentFee,
        marketingCosts: io.marketingCosts ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.marketingCosts,
        closingCosts: io.closingCosts ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.closingCosts,
        monthlyHoa: io.monthlyHoa ?? propertyInfo?.market?.hoa_fees_monthly ?? 0,
        ...sf,
      } satisfies WholesaleDealMakerState
    }

    case 'ltr':
    default: {
      // Bank Loan + Seller Financing are the financing inputs; Down Payment is the
      // derived residual. When the user has set an explicit Bank Loan it is the source
      // of truth, so the down payment absorbs buy-price / seller-financing changes
      // (this keeps the Bank Loan slider stable instead of feeding back through dp%).
      const ltrBuy = io.purchasePrice ?? targetPrice
      const ltrSeller = Math.max(0, sf.sellerFinancingAmount)
      const ltrBankLoan =
        typeof ioAny.bankLoanAmount === 'number' ? Math.max(0, ioAny.bankLoanAmount) : null
      const ltrDownPct =
        ltrBankLoan != null && ltrBuy > 0
          ? Math.max(-1, Math.min(1, (ltrBuy - ltrBankLoan - ltrSeller) / ltrBuy))
          : io.downPayment != null
            ? io.downPayment / 100
            : downPaymentPct
      return {
        buyPrice: ltrBuy,
        downPaymentPercent: ltrDownPct,
        bankLoanAmount: ltrBankLoan ?? undefined,
        closingCostsPercent: io.closingCosts != null ? io.closingCosts / 100 : closingCostsPct,
        interestRate: io.interestRate ?? rate,
        loanTermYears: io.loanTerm ?? loanTermYears,
        rehabBudget: io.rehabBudget ?? rehabCost,
        arv: arvVal,
        monthlyRent: io.monthlyRent ?? monthlyRent,
        otherIncome: 0,
        vacancyRate: io.vacancyRate != null ? io.vacancyRate / 100 : vacancyPct,
        maintenanceRate: io.maintenanceRate ?? maintPct,
        managementRate: io.managementRate != null ? io.managementRate / 100 : mgmtPct,
        annualPropertyTax: io.propertyTaxes ?? propertyTaxes,
        annualInsurance: io.insurance ?? insurance,
        // Seed HOA from the property feed (`market.hoa_fees_monthly`) so condo /
        // townhome / co-op carrying costs are part of NOI on first render.
        monthlyHoa: io.monthlyHoa ?? propertyInfo?.market?.hoa_fees_monthly ?? 0,
        capexRate:
          io.capexRate ??
          (io.capexPct != null ? io.capexPct : undefined) ??
          reservesPct ??
          dealGapOperatingOverrides?.capexPct ??
          DEFAULT_OPERATING_CAPEX_PCT,
        utilitiesMonthly:
          io.utilitiesMonthly ??
          dealGapOperatingOverrides?.utilitiesMonthly ??
          DEFAULT_OPERATING_UTILITIES_MONTHLY,
        pestControlAnnual:
          io.pestControlAnnual ??
          dealGapOperatingOverrides?.pestControlAnnual ??
          DEFAULT_OPERATING_PEST_CONTROL_ANNUAL,
        ...sf,
      } satisfies LTRDealMakerState
    }
  }
}
