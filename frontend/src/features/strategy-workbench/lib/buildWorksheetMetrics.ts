/**
 * buildWorksheetMetrics — derives the per-strategy worksheet metrics from the
 * worksheet state + backend breakdown fallbacks.
 * Extracted verbatim from `app/strategy/page.tsx` (R4 Stage 1) — no behavior change.
 */

import { calculateMortgagePayment } from '@/utils/calculations'
import { computeLtrOperatingExpenseBreakdown } from '@/lib/ltrOperatingExpenses'
import { sellerMonthlyPayment } from '@/lib/sellerFinancing'
import type {
  StrategyType,
  AnyStrategyState,
  AnyStrategyMetrics,
  LTRDealMakerState,
  LTRDealMakerMetrics,
  STRDealMakerState,
  STRMetrics,
  BRRRRDealMakerState,
  BRRRRMetrics,
  FlipDealMakerState,
  FlipMetrics,
  HouseHackDealMakerState,
  HouseHackMetrics,
  WholesaleDealMakerState,
  WholesaleMetrics,
} from '@/features/deal-maker/components/types'
import { cashNeededFromLtrState, cashNeededFromStrState } from './shared'
import type { DealGapOperatingOverrides } from './shared'

export interface WorksheetMetricsInputs {
  currentStrategyType: StrategyType
  worksheetState: AnyStrategyState
  bd: Record<string, number> | undefined
  propertyTaxes: number
  insurance: number
  totalExpenses: number
  monthlyPI: number
  loanAmount: number
  noi: number
  dealGapPct: number
  strategyCashFlow: number
  strategyAnnualCashFlow: number
  capRateVal: number | null
  cocVal: number | null
  ltrLiveMetrics: LTRDealMakerMetrics | null
  dealGapOperatingOverrides: DealGapOperatingOverrides | null
}

export function buildWorksheetMetrics(inputs: WorksheetMetricsInputs): AnyStrategyMetrics {
  const {
    currentStrategyType,
    worksheetState,
    bd,
    propertyTaxes,
    insurance,
    totalExpenses,
    monthlyPI,
    loanAmount,
    noi,
    dealGapPct,
    strategyCashFlow,
    strategyAnnualCashFlow,
    capRateVal,
    cocVal,
    ltrLiveMetrics,
    dealGapOperatingOverrides,
  } = inputs

  switch (currentStrategyType) {
    case 'str': {
      const strState = worksheetState as STRDealMakerState
      const adr = strState.averageDailyRate
      const occ = strState.occupancyRate
      const annualRevenue = bd?.annual_gross_revenue ?? adr * 365 * occ
      const nightsOcc = Math.round(365 * occ)
      const turnovers = Math.ceil(nightsOcc / strState.avgLengthOfStayDays)
      const cashNeededWs = cashNeededFromStrState(strState)
      const dpFromState = strState.buyPrice * strState.downPaymentPercent
      const closingFromState = strState.buyPrice * strState.closingCostsPercent
      return {
        cashNeeded: cashNeededWs,
        totalInvestmentWithFurniture: cashNeededWs,
        downPaymentAmount: dpFromState,
        closingCostsAmount: closingFromState,
        loanAmount,
        monthlyPayment: monthlyPI,
        grossNightlyRevenue: adr,
        monthlyGrossRevenue: annualRevenue / 12,
        annualGrossRevenue: annualRevenue,
        revPAR: adr * occ,
        numberOfTurnovers: turnovers,
        nightsOccupied: nightsOcc,
        monthlyExpenses: {
          mortgage: monthlyPI,
          taxes: propertyTaxes / 12,
          insurance: insurance / 12,
          hoa: strState.monthlyHoa,
          utilities: (bd?.utilities ?? 0) / 12,
          maintenance: (bd?.maintenance ?? 0) / 12,
          management: (bd?.management ?? 0) / 12,
          platformFees: (bd?.platform_fees ?? 0) / 12,
          cleaning: (strState.cleaningCostPerTurnover * turnovers) / 12,
          supplies: strState.suppliesMonthly,
        },
        totalMonthlyExpenses: totalExpenses / 12,
        totalAnnualExpenses: totalExpenses,
        monthlyCashFlow: strategyCashFlow,
        annualCashFlow: strategyAnnualCashFlow,
        noi,
        capRate: capRateVal ?? 0,
        cocReturn: cocVal ?? 0,
        breakEvenOccupancy: adr > 0 ? (totalExpenses + monthlyPI * 12) / (adr * 365) : 0,
        equityCreated: 0,
        dealScore: 0,
        dealGrade: 'C' as const,
        profitQuality: 'C' as const,
      } satisfies STRMetrics
    }

    case 'brrrr': {
      const brState = worksheetState as BRRRRDealMakerState
      const initialDown = brState.purchasePrice * brState.downPaymentPercent
      const initialClosing = brState.purchasePrice * brState.closingCostsPercent
      const totalRehabCost = brState.rehabBudget * (1 + brState.contingencyPct)
      const holdCosts = brState.holdingCostsMonthly * brState.holdingPeriodMonths
      const cashPhase1 = initialDown + initialClosing
      const cashPhase2 = totalRehabCost + holdCosts
      const allIn = brState.purchasePrice + totalRehabCost + holdCosts
      const refiLoan = brState.arv * brState.refinanceLtv
      const refiClosing = refiLoan * brState.refinanceClosingCostsPct
      const cashOut = Math.max(0, refiLoan - (brState.purchasePrice - initialDown) - refiClosing)
      const totalInvested = cashPhase1 + cashPhase2
      const cashLeftInDeal = Math.max(0, totalInvested - cashOut)
      const capitalRecycled =
        totalInvested > 0 ? ((totalInvested - cashLeftInDeal) / totalInvested) * 100 : 0
      const refiPayment = calculateMortgagePayment(
        refiLoan,
        brState.refinanceInterestRate * 100,
        brState.refinanceTermYears,
      )
      const annualRentBrrrr = brState.postRehabMonthlyRent * 12
      const effIncome = annualRentBrrrr * (1 - brState.vacancyRate)
      const opex =
        propertyTaxes +
        insurance +
        annualRentBrrrr * (brState.managementRate + brState.maintenanceRate)
      const estNoi = effIncome - opex
      const postRefiAnnualCF = estNoi - refiPayment * 12
      const minCashForCoc = Math.max(cashLeftInDeal, totalInvested * 0.1)
      const postRefiCoc =
        cashLeftInDeal <= 0
          ? postRefiAnnualCF > 0
            ? 999
            : 0
          : (postRefiAnnualCF / minCashForCoc) * 100
      return {
        initialLoanAmount: brState.purchasePrice - initialDown,
        initialDownPayment: initialDown,
        initialClosingCosts: initialClosing,
        cashRequiredPhase1: cashPhase1,
        totalRehabCost,
        holdingCosts: holdCosts,
        cashRequiredPhase2: cashPhase2,
        allInCost: allIn,
        estimatedNoi: estNoi,
        estimatedCapRate: brState.purchasePrice > 0 ? (estNoi / brState.purchasePrice) * 100 : 0,
        refinanceLoanAmount: refiLoan,
        refinanceClosingCosts: refiClosing,
        cashOutAtRefinance: cashOut,
        newMonthlyPayment: refiPayment,
        totalCashInvested: totalInvested,
        cashLeftInDeal,
        capitalRecycledPct: capitalRecycled,
        infiniteRoiAchieved: cashLeftInDeal <= 0,
        equityPosition: brState.arv - refiLoan,
        equityPct: brState.arv > 0 ? ((brState.arv - refiLoan) / brState.arv) * 100 : 0,
        postRefiMonthlyCashFlow: postRefiAnnualCF / 12,
        postRefiAnnualCashFlow: postRefiAnnualCF,
        postRefiCashOnCash: postRefiCoc,
        dealScore: 0,
        dealGrade: 'C' as const,
      } satisfies BRRRRMetrics
    }

    case 'flip': {
      const fState = worksheetState as FlipDealMakerState
      const fSeller = Math.max(0, fState.sellerFinancingAmount ?? 0)
      const fLoan =
        fState.financingType !== 'cash' ? fState.purchasePrice * fState.hardMoneyLtv : 0
      // Down payment is the residual after the hard money loan and any seller note:
      // Down Payment = Purchase Price − (Hard Money Loan + Seller Financing).
      const fDown = fState.purchasePrice - fLoan - fSeller
      const fClosing = fState.purchasePrice * fState.closingCostsPercent
      const pointsCost = fLoan * (fState.loanPoints / 100)
      const totalRehab = fState.rehabBudget * (1 + fState.contingencyPct)
      const domMonths = fState.daysOnMarket / 30
      const holdMonths = fState.rehabTimeMonths + domMonths
      const interestCosts =
        fState.financingType !== 'cash' ? fLoan * fState.hardMoneyRate * (holdMonths / 12) : 0
      const totalHolding = fState.holdingCostsMonthly * holdMonths + interestCosts
      const totalProject =
        fState.purchasePrice + fClosing + totalRehab + totalHolding + pointsCost
      const sellingCosts = fState.arv * fState.sellingCostsPct
      const grossProfit = fState.arv - totalProject - sellingCosts
      const capGainsTax = Math.max(0, grossProfit) * fState.capitalGainsRate
      const netProfit = grossProfit - capGainsTax
      const cashRequired = fDown + fClosing + pointsCost + totalRehab + totalHolding
      const fRoi = cashRequired > 0 ? (netProfit / cashRequired) * 100 : 0
      const annRoi = holdMonths > 0 ? fRoi * (12 / holdMonths) : 0
      const mao = fState.arv * 0.7 - fState.rehabBudget
      return {
        loanAmount: fLoan,
        downPayment: fDown,
        closingCosts: fClosing,
        loanPointsCost: pointsCost,
        cashAtPurchase: fDown + fClosing + pointsCost,
        totalRehabCost: totalRehab,
        holdingPeriodMonths: holdMonths,
        totalHoldingCosts: totalHolding,
        interestCosts,
        grossSaleProceeds: fState.arv,
        sellingCosts,
        netSaleProceeds: fState.arv - sellingCosts,
        totalProjectCost: totalProject,
        grossProfit,
        capitalGainsTax: capGainsTax,
        netProfit,
        cashRequired,
        roi: fRoi,
        annualizedRoi: annRoi,
        profitMargin: fState.arv > 0 ? (netProfit / fState.arv) * 100 : 0,
        maxAllowableOffer: mao,
        meets70PercentRule: fState.purchasePrice <= mao,
        dealScore: 0,
        dealGrade: 'C' as const,
      } satisfies FlipMetrics
    }

    case 'house_hack': {
      const hState = worksheetState as HouseHackDealMakerState
      const hSeller = Math.max(0, hState.sellerFinancingAmount ?? 0)
      const hDown = hState.purchasePrice * hState.downPaymentPercent
      // Bank loan is the residual after the buyer's cash down and the seller note.
      const hLoan = Math.max(0, hState.purchasePrice - hDown - hSeller)
      const hBankPi = calculateMortgagePayment(
        hLoan,
        hState.interestRate * 100,
        hState.loanTermYears,
      )
      const hSellerPi =
        hSeller > 0
          ? sellerMonthlyPayment(
              hSeller,
              hState.sellerInterestRate,
              hState.sellerTermYears,
              hState.sellerInterestOnly ?? false,
            )
          : 0
      const hPI = hBankPi + hSellerPi
      const hPmi = (hLoan * hState.pmiRate) / 12
      const hTaxes = hState.annualPropertyTax / 12
      const hIns = hState.annualInsurance / 12
      const hPiti = hPI + hPmi + hTaxes + hIns + hState.monthlyHoa
      const hClosing = hState.purchasePrice * hState.closingCostsPercent
      // Sources & uses: (price + closing) − (bank loan + seller note). May be negative.
      const hCashToClose = hState.purchasePrice + hClosing - hLoan - hSeller
      const rentedUnits = Math.max(0, hState.totalUnits - hState.ownerOccupiedUnits)
      const grossRental = hState.avgRentPerUnit * rentedUnits
      const effectiveRental = grossRental * (1 - hState.vacancyRate)
      const monthlyMaint = effectiveRental * hState.maintenanceRate
      const monthlyCapex = effectiveRental * hState.capexRate
      const monthlyOpex = hState.utilitiesMonthly + monthlyMaint + monthlyCapex
      const netRental = effectiveRental - monthlyOpex
      const effectiveCost = hPiti - netRental
      return {
        loanAmount: hLoan,
        monthlyPrincipalInterest: hPI,
        monthlyPmi: hPmi,
        monthlyTaxes: hTaxes,
        monthlyInsurance: hIns,
        monthlyPITI: hPiti,
        downPayment: hDown,
        closingCosts: hClosing,
        cashToClose: hCashToClose,
        rentedUnits,
        grossRentalIncome: grossRental,
        effectiveRentalIncome: effectiveRental,
        monthlyMaintenance: monthlyMaint,
        monthlyCapex,
        monthlyOperatingExpenses: monthlyOpex,
        netRentalIncome: netRental,
        effectiveHousingCost: effectiveCost,
        housingCostSavings: hState.currentHousingPayment - effectiveCost,
        housingOffsetPercent: hPiti > 0 ? (netRental / hPiti) * 100 : 0,
        livesForFree: effectiveCost <= 0,
        annualCashFlow: netRental * 12 - hPiti * 12,
        cashOnCashReturn:
          hCashToClose > 0 ? (((netRental - hPiti) * 12) / hCashToClose) * 100 : 0,
        fullRentalIncome: hState.avgRentPerUnit * hState.totalUnits,
        fullRentalCashFlow:
          (hState.avgRentPerUnit * hState.totalUnits * (1 - hState.vacancyRate) -
            monthlyOpex -
            hPiti) *
          12,
        fullRentalCoCReturn: 0,
        dealScore: 0,
        dealGrade: 'C' as const,
      } satisfies HouseHackMetrics
    }

    case 'wholesale': {
      const wState = worksheetState as WholesaleDealMakerState
      const mao = wState.arv * 0.7 - wState.estimatedRepairs
      const endBuyerPrice = wState.contractPrice + wState.assignmentFee
      const endBuyerAllIn = endBuyerPrice + wState.estimatedRepairs
      const endBuyerProfit = wState.arv - endBuyerAllIn
      const cashAtRisk = wState.earnestMoney + wState.marketingCosts + wState.closingCosts
      const netProfit = wState.assignmentFee - wState.marketingCosts - wState.closingCosts
      const wRoi = cashAtRisk > 0 ? (netProfit / cashAtRisk) * 100 : 0
      const annROI = wState.daysToClose > 0 ? wRoi * (365 / wState.daysToClose) : 0
      const viability: 'strong' | 'moderate' | 'tight' | 'notViable' =
        wState.contractPrice <= mao * 0.9
          ? 'strong'
          : wState.contractPrice <= mao
            ? 'moderate'
            : wState.contractPrice <= mao * 1.05
              ? 'tight'
              : 'notViable'
      return {
        maxAllowableOffer: mao,
        contractVsMAO: wState.contractPrice - mao,
        meets70PercentRule: wState.contractPrice <= mao,
        endBuyerPrice,
        endBuyerAllIn,
        endBuyerProfit,
        endBuyerROI: endBuyerAllIn > 0 ? (endBuyerProfit / endBuyerAllIn) * 100 : 0,
        totalCashAtRisk: cashAtRisk,
        grossProfit: wState.assignmentFee,
        netProfit,
        roi: wRoi,
        annualizedROI: annROI,
        dealViability: viability,
        dealScore: 0,
        dealGrade: 'C' as const,
      } satisfies WholesaleMetrics
    }

    case 'ltr':
    default: {
      if (ltrLiveMetrics) return ltrLiveMetrics
      const ltrState = worksheetState as LTRDealMakerState
      const ltrGrossMonthly = ltrState.monthlyRent + (ltrState.otherIncome ?? 0)
      const ltrOpex = computeLtrOperatingExpenseBreakdown({
        annualPropertyTax: ltrState.annualPropertyTax,
        annualInsurance: ltrState.annualInsurance,
        monthlyHoa: ltrState.monthlyHoa,
        managementRate: ltrState.managementRate ?? 0,
        maintenanceRate: ltrState.maintenanceRate,
        annualGrossRent: ltrGrossMonthly * 12,
        capexPct: ltrState.capexRate,
        utilitiesMonthly: ltrState.utilitiesMonthly,
        pestControlAnnual: ltrState.pestControlAnnual,
        landscapingAnnual: dealGapOperatingOverrides?.landscapingAnnual,
      })
      return {
        cashNeeded: cashNeededFromLtrState(ltrState),
        dealGap: dealGapPct / 100,
        annualProfit: strategyAnnualCashFlow,
        capRate: capRateVal ?? 0,
        cocReturn: cocVal ?? 0,
        monthlyPayment: monthlyPI,
        loanAmount,
        equityCreated: 0,
        grossMonthlyIncome: ltrGrossMonthly,
        totalMonthlyExpenses: ltrOpex.total / 12,
      } satisfies LTRDealMakerMetrics
    }
  }
}
