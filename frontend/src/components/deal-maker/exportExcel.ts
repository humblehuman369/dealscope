/**
 * Client-side Excel export for Deal Maker worksheets.
 *
 * Uses ExcelJS to generate a styled .xlsx directly in the browser —
 * no backend round-trip required. Works for both saved and unsaved properties.
 */

import ExcelJS from 'exceljs'
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
} from './types'

// ── Style tokens ────────────────────────────────────────────────────────────

const BRAND = '0EA5E9'
const HEADER_BG = '1F4E79'
const SECTION_BG = 'D6DCE4'
const SUMMARY_BG = 'E2EFDA'
const WHITE = 'FFFFFF'

const CUR = '_($* #,##0_);_($* (#,##0);_($* "-"_);_(@_)'
const PCT = '0.0%'
const PCT2 = '0.00%'
const INT = '#,##0'

const STRATEGY_LABELS: Record<StrategyType, string> = {
  ltr: 'Long-term Rental',
  str: 'Short-term Rental',
  brrrr: 'BRRRR',
  flip: 'Fix & Flip',
  house_hack: 'House Hack',
  wholesale: 'Wholesale',
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function num(obj: Record<string, unknown>, key: string): number {
  const v = obj[key]
  return typeof v === 'number' && isFinite(v) ? v : 0
}

function applyHeaderRow(ws: ExcelJS.Worksheet, row: number, text: string) {
  const r = ws.getRow(row)
  ws.mergeCells(row, 1, row, 3)
  const cell = ws.getCell(row, 1)
  cell.value = text
  cell.font = { bold: true, color: { argb: WHITE }, size: 12, name: 'Calibri' }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
  cell.alignment = { horizontal: 'left', vertical: 'middle' }
  r.height = 24
}

function applySectionHeader(ws: ExcelJS.Worksheet, row: number, text: string) {
  const r = ws.getRow(row)
  ws.mergeCells(row, 1, row, 3)
  const cell = ws.getCell(row, 1)
  cell.value = text
  cell.font = { bold: true, size: 10, name: 'Calibri', color: { argb: HEADER_BG } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SECTION_BG } }
  cell.alignment = { horizontal: 'left', vertical: 'middle' }
  r.height = 20
}

function addRow(ws: ExcelJS.Worksheet, row: number, label: string, value: number | string, fmt?: string, note?: string) {
  const labelCell = ws.getCell(row, 1)
  labelCell.value = label
  labelCell.font = { size: 10, name: 'Calibri' }

  const valCell = ws.getCell(row, 2)
  valCell.value = value
  valCell.font = { size: 10, name: 'Calibri' }
  valCell.alignment = { horizontal: 'right' }
  if (fmt) valCell.numFmt = fmt

  if (note) {
    const noteCell = ws.getCell(row, 3)
    noteCell.value = note
    noteCell.font = { size: 9, name: 'Calibri', italic: true, color: { argb: '808080' } }
  }
}

function addTotalRow(ws: ExcelJS.Worksheet, row: number, label: string, value: number | string, fmt?: string) {
  const labelCell = ws.getCell(row, 1)
  labelCell.value = label
  labelCell.font = { bold: true, size: 10, name: 'Calibri' }

  const valCell = ws.getCell(row, 2)
  valCell.value = value
  valCell.font = { bold: true, size: 10, name: 'Calibri' }
  valCell.alignment = { horizontal: 'right' }
  if (fmt) valCell.numFmt = fmt

  for (let c = 1; c <= 3; c++) {
    const cell = ws.getCell(row, c)
    cell.border = {
      top: { style: 'medium', color: { argb: BRAND } },
      bottom: { style: 'medium', color: { argb: BRAND } },
    }
  }
}

function addSummaryRow(ws: ExcelJS.Worksheet, row: number, label: string, value: number | string, fmt?: string, highlight?: 'good' | 'bad') {
  const labelCell = ws.getCell(row, 1)
  labelCell.value = label
  labelCell.font = { bold: true, size: 10, name: 'Calibri' }

  const valCell = ws.getCell(row, 2)
  valCell.value = value
  valCell.font = { bold: true, size: 10, name: 'Calibri' }
  valCell.alignment = { horizontal: 'right' }
  if (fmt) valCell.numFmt = fmt

  if (highlight) {
    for (let c = 1; c <= 3; c++) {
      ws.getCell(row, c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: highlight === 'good' ? SUMMARY_BG : 'FCE4EC' },
      }
    }
  }
}

function setupSheet(wb: ExcelJS.Workbook, title: string, address: string, strategyLabel: string): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(title)
  ws.getColumn(1).width = 35
  ws.getColumn(2).width = 22
  ws.getColumn(3).width = 22

  applyHeaderRow(ws, 1, `Deal Maker IQ — ${strategyLabel} Analysis`)

  const addrCell = ws.getCell(2, 1)
  ws.mergeCells(2, 1, 2, 3)
  addrCell.value = address
  addrCell.font = { size: 10, name: 'Calibri', color: { argb: '555555' } }

  const dateCell = ws.getCell(3, 1)
  ws.mergeCells(3, 1, 3, 3)
  dateCell.value = `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`
  dateCell.font = { size: 9, name: 'Calibri', italic: true, color: { argb: '808080' } }

  return ws
}

function triggerDownload(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Strategy builders ───────────────────────────────────────────────────────

function buildLTRSheet(wb: ExcelJS.Workbook, state: LTRDealMakerState, metrics: LTRDealMakerMetrics, address: string, listPrice: number) {
  const ws = setupSheet(wb, 'LTR Analysis', address, STRATEGY_LABELS.ltr)
  const m = metrics as unknown as Record<string, unknown>

  const downPayment = state.buyPrice * state.downPaymentPercent
  const closingCosts = state.buyPrice * state.closingCostsPercent
  const loanAmount = num(m, 'loanAmount') || (state.buyPrice - downPayment)
  const monthlyPayment = num(m, 'monthlyPayment')
  const grossMonthly = num(m, 'grossMonthlyIncome') || (state.monthlyRent + state.otherIncome)
  const totalMonthlyExp = num(m, 'totalMonthlyExpenses')
  const annualProfit = num(m, 'annualProfit')
  const capRate = num(m, 'capRate')
  const cocReturn = num(m, 'cocReturn')
  const cashNeeded = num(m, 'cashNeeded') || (downPayment + closingCosts + state.rehabBudget)
  const noi = annualProfit + monthlyPayment * 12

  let r = 5
  applySectionHeader(ws, r++, 'ACQUISITION')
  addRow(ws, r++, 'Market Price', listPrice || state.buyPrice, CUR)
  addRow(ws, r++, 'Buy Price', state.buyPrice, CUR)
  addRow(ws, r++, 'Down Payment', downPayment, CUR, `${(state.downPaymentPercent * 100).toFixed(1)}%`)
  addRow(ws, r++, 'Closing Costs', closingCosts, CUR, `${(state.closingCostsPercent * 100).toFixed(1)}%`)
  addRow(ws, r++, 'Rehab Budget', state.rehabBudget, CUR)
  addTotalRow(ws, r++, 'Total Cash Needed', cashNeeded, CUR)

  r++
  applySectionHeader(ws, r++, 'FINANCING')
  addRow(ws, r++, 'Loan Amount', loanAmount, CUR)
  addRow(ws, r++, 'Interest Rate', state.interestRate, PCT2)
  addRow(ws, r++, 'Loan Term', state.loanTermYears, '#,##0 "years"')
  addRow(ws, r++, 'Monthly Payment', monthlyPayment, CUR)
  addTotalRow(ws, r++, 'Annual Debt Service', monthlyPayment * 12, CUR)

  r++
  applySectionHeader(ws, r++, 'OPERATING EXPENSES (Annual)')
  addRow(ws, r++, 'Property Tax', state.annualPropertyTax, CUR)
  addRow(ws, r++, 'Insurance', state.annualInsurance, CUR)
  addRow(ws, r++, 'Management', grossMonthly * (state.managementRate ?? 0) * 12, CUR, `${((state.managementRate ?? 0) * 100).toFixed(0)}%`)
  addRow(ws, r++, 'Maintenance', grossMonthly * state.maintenanceRate * 12, CUR, `${(state.maintenanceRate * 100).toFixed(0)}%`)
  addRow(ws, r++, 'Vacancy', grossMonthly * state.vacancyRate * 12, CUR, `${(state.vacancyRate * 100).toFixed(0)}%`)
  if (state.monthlyHoa > 0) addRow(ws, r++, 'HOA', state.monthlyHoa * 12, CUR)
  addTotalRow(ws, r++, 'Total Operating Expenses', totalMonthlyExp * 12 - monthlyPayment * 12, CUR)

  r++
  applySectionHeader(ws, r++, 'INCOME')
  addRow(ws, r++, 'Monthly Rent', state.monthlyRent, CUR)
  if (state.otherIncome > 0) addRow(ws, r++, 'Other Income', state.otherIncome, CUR)
  addRow(ws, r++, 'Gross Monthly Income', grossMonthly, CUR)
  addTotalRow(ws, r++, 'Gross Annual Income', grossMonthly * 12, CUR)

  r++
  applySectionHeader(ws, r++, 'SUMMARY')
  addSummaryRow(ws, r++, 'NOI (Before Mortgage)', noi, CUR, noi >= 0 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'Net Cash Flow (After Mortgage)', annualProfit, CUR, annualProfit >= 0 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'Monthly Cash Flow', annualProfit / 12, CUR, annualProfit >= 0 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'Cap Rate', capRate / 100, PCT, capRate >= 6 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'Cash-on-Cash Return', cocReturn / 100, PCT, cocReturn >= 8 ? 'good' : 'bad')
}

function buildSTRSheet(wb: ExcelJS.Workbook, state: STRDealMakerState, metrics: STRMetrics, address: string, listPrice: number) {
  const ws = setupSheet(wb, 'STR Analysis', address, STRATEGY_LABELS.str)
  const m = metrics as unknown as Record<string, unknown>

  const downPayment = num(m, 'downPaymentAmount') || (state.buyPrice * state.downPaymentPercent)
  const closingCosts = num(m, 'closingCostsAmount') || (state.buyPrice * state.closingCostsPercent)
  const loanAmount = num(m, 'loanAmount') || (state.buyPrice - downPayment)
  const monthlyPayment = num(m, 'monthlyPayment')
  const cashNeeded = num(m, 'cashNeeded') || (downPayment + closingCosts + state.furnitureSetupCost)
  const nightsOccupied = num(m, 'nightsOccupied')
  const annualGross = num(m, 'annualGrossRevenue')
  const totalMonthlyExp = num(m, 'totalMonthlyExpenses')
  const annualCF = num(m, 'annualCashFlow')
  const noi = num(m, 'noi') || (annualCF + monthlyPayment * 12)
  const capRate = num(m, 'capRate')
  const cocReturn = num(m, 'cocReturn')

  let r = 5
  applySectionHeader(ws, r++, 'ACQUISITION')
  addRow(ws, r++, 'Market Price', listPrice || state.buyPrice, CUR)
  addRow(ws, r++, 'Buy Price', state.buyPrice, CUR)
  addRow(ws, r++, 'Down Payment', downPayment, CUR, `${(state.downPaymentPercent * 100).toFixed(1)}%`)
  addRow(ws, r++, 'Closing Costs', closingCosts, CUR, `${(state.closingCostsPercent * 100).toFixed(1)}%`)
  addRow(ws, r++, 'Rehab Budget', state.rehabBudget, CUR)
  addRow(ws, r++, 'Furniture & Setup', state.furnitureSetupCost, CUR)
  addTotalRow(ws, r++, 'Total Cash Needed', cashNeeded, CUR)

  r++
  applySectionHeader(ws, r++, 'FINANCING')
  addRow(ws, r++, 'Loan Amount', loanAmount, CUR)
  addRow(ws, r++, 'Interest Rate', state.interestRate, PCT2)
  addRow(ws, r++, 'Loan Term', state.loanTermYears, '#,##0 "years"')
  addRow(ws, r++, 'Monthly Payment', monthlyPayment, CUR)
  addTotalRow(ws, r++, 'Annual Debt Service', monthlyPayment * 12, CUR)

  r++
  applySectionHeader(ws, r++, 'REVENUE')
  addRow(ws, r++, 'Average Daily Rate', state.averageDailyRate, CUR)
  addRow(ws, r++, 'Occupancy Rate', state.occupancyRate, PCT)
  addRow(ws, r++, 'Cleaning Fee / Booking', state.cleaningFeeRevenue, CUR)
  addRow(ws, r++, 'Avg Length of Stay', state.avgLengthOfStayDays, '#,##0 "days"')
  addRow(ws, r++, 'Nights Occupied / Year', Math.round(nightsOccupied), INT)
  addRow(ws, r++, 'Monthly Gross Revenue', annualGross / 12, CUR)
  addTotalRow(ws, r++, 'Annual Gross Revenue', annualGross, CUR)

  r++
  applySectionHeader(ws, r++, 'EXPENSES (Annual)')
  addRow(ws, r++, 'Platform Fees', state.platformFeeRate, PCT, `${(state.platformFeeRate * 100).toFixed(0)}%`)
  addRow(ws, r++, 'STR Management', state.strManagementRate, PCT, `${(state.strManagementRate * 100).toFixed(0)}%`)
  addRow(ws, r++, 'Cleaning / Turnover', state.cleaningCostPerTurnover, CUR)
  addRow(ws, r++, 'Supplies', state.suppliesMonthly * 12, CUR, `${state.suppliesMonthly}/mo`)
  addRow(ws, r++, 'Utilities', state.additionalUtilitiesMonthly * 12, CUR, `${state.additionalUtilitiesMonthly}/mo`)
  addRow(ws, r++, 'Property Tax', state.annualPropertyTax, CUR)
  addRow(ws, r++, 'Insurance', state.annualInsurance, CUR)
  addTotalRow(ws, r++, 'Total Monthly Expenses', totalMonthlyExp, CUR)

  r++
  applySectionHeader(ws, r++, 'SUMMARY')
  addSummaryRow(ws, r++, 'NOI (Before Mortgage)', noi, CUR, noi >= 0 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'Net Cash Flow (After Mortgage)', annualCF, CUR, annualCF >= 0 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'Monthly Cash Flow', annualCF / 12, CUR, annualCF >= 0 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'Cap Rate', capRate / 100, PCT, capRate >= 6 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'Cash-on-Cash Return', cocReturn / 100, PCT, cocReturn >= 8 ? 'good' : 'bad')
}

function buildBRRRRSheet(wb: ExcelJS.Workbook, state: BRRRRDealMakerState, metrics: BRRRRMetrics, address: string) {
  const ws = setupSheet(wb, 'BRRRR Analysis', address, STRATEGY_LABELS.brrrr)
  const m = metrics as unknown as Record<string, unknown>

  const initialDown = num(m, 'initialDownPayment')
  const initialClosing = num(m, 'initialClosingCosts')
  const cashPhase1 = num(m, 'cashRequiredPhase1')
  const holdingCosts = num(m, 'holdingCosts')
  const allIn = num(m, 'allInCost')
  const refiLoan = num(m, 'refinanceLoanAmount')
  const newPayment = num(m, 'newMonthlyPayment')
  const cashOut = num(m, 'cashOutAtRefinance')
  const totalInvested = num(m, 'totalCashInvested')
  const cashLeft = num(m, 'cashLeftInDeal')
  const capitalRecycled = num(m, 'capitalRecycledPct')
  const annualCF = num(m, 'postRefiAnnualCashFlow')
  const coc = num(m, 'postRefiCashOnCash')
  const estimatedNoi = num(m, 'estimatedNoi')
  const capRate = num(m, 'estimatedCapRate')
  const noi = estimatedNoi || (annualCF + newPayment * 12)

  let r = 5
  applySectionHeader(ws, r++, 'PHASE 1 — BUY')
  addRow(ws, r++, 'Purchase Price', state.purchasePrice, CUR)
  addRow(ws, r++, 'Discount from Market', state.buyDiscountPct, PCT)
  addRow(ws, r++, 'Down Payment', initialDown, CUR, `${(state.downPaymentPercent * 100).toFixed(0)}%`)
  addRow(ws, r++, 'Hard Money Rate', state.hardMoneyRate, PCT2)
  addRow(ws, r++, 'Closing Costs', initialClosing, CUR)
  addTotalRow(ws, r++, 'Cash Required', cashPhase1, CUR)

  r++
  applySectionHeader(ws, r++, 'PHASE 2 — REHAB')
  addRow(ws, r++, 'Rehab Budget', state.rehabBudget, CUR)
  addRow(ws, r++, 'Contingency', state.rehabBudget * state.contingencyPct, CUR, `${(state.contingencyPct * 100).toFixed(0)}%`)
  addRow(ws, r++, 'Holding Period', state.holdingPeriodMonths, '#,##0 "months"')
  addRow(ws, r++, 'Holding Costs', state.holdingCostsMonthly, CUR, '/month')
  addRow(ws, r++, 'After Repair Value (ARV)', state.arv, CUR)
  addRow(ws, r++, 'Total Holding Costs', holdingCosts, CUR)
  addTotalRow(ws, r++, 'All-In Cost', allIn, CUR)

  r++
  applySectionHeader(ws, r++, 'REFINANCE')
  addRow(ws, r++, 'Refinance LTV', state.refinanceLtv, PCT)
  addRow(ws, r++, 'Refinance Rate', state.refinanceInterestRate, PCT2)
  addRow(ws, r++, 'Refinance Loan Amount', refiLoan, CUR)
  addRow(ws, r++, 'New Monthly Payment', newPayment, CUR)
  addTotalRow(ws, r++, 'Cash Out at Refinance', cashOut, CUR)

  r++
  applySectionHeader(ws, r++, 'EXPENSES & RETURNS')
  addRow(ws, r++, 'Vacancy Rate', state.vacancyRate, PCT)
  addRow(ws, r++, 'Management Rate', state.managementRate, PCT)
  addRow(ws, r++, 'Maintenance Rate', state.maintenanceRate, PCT)
  addRow(ws, r++, 'Property Tax', state.annualPropertyTax, CUR, '/year')
  addRow(ws, r++, 'Insurance', state.annualInsurance, CUR, '/year')
  if (state.monthlyHoa > 0) addRow(ws, r++, 'HOA', state.monthlyHoa, CUR, '/month')
  addRow(ws, r++, 'Total Cash Invested', totalInvested, CUR)
  addRow(ws, r++, 'Cash Left in Deal', cashLeft, CUR)
  addRow(ws, r++, 'Capital Recycled', capitalRecycled / 100, PCT)

  r++
  applySectionHeader(ws, r++, 'SUMMARY')
  addSummaryRow(ws, r++, 'NOI (Before Mortgage)', noi, CUR, noi >= 0 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'Annual Cash Flow (Post-Refi)', annualCF, CUR, annualCF >= 0 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'Monthly Cash Flow', annualCF / 12, CUR, annualCF >= 0 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'Cap Rate', capRate / 100, PCT, capRate >= 6 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'Cash-on-Cash Return', coc > 999 ? 'Infinite' : coc / 100, coc > 999 ? undefined : PCT, coc >= 8 ? 'good' : 'bad')
}

function buildFlipSheet(wb: ExcelJS.Workbook, state: FlipDealMakerState, metrics: FlipMetrics, address: string) {
  const ws = setupSheet(wb, 'Flip Analysis', address, STRATEGY_LABELS.flip)
  const m = metrics as unknown as Record<string, unknown>

  const loanAmount = num(m, 'loanAmount')
  const downPayment = num(m, 'downPayment')
  const closingCosts = num(m, 'closingCosts')
  const points = num(m, 'loanPointsCost')
  const cashAtPurchase = num(m, 'cashAtPurchase')
  const totalRehab = num(m, 'totalRehabCost')
  const holdingMonths = num(m, 'holdingPeriodMonths')
  const totalHolding = num(m, 'totalHoldingCosts')
  const interestCosts = num(m, 'interestCosts')
  const grossProceeds = num(m, 'grossSaleProceeds')
  const sellingCosts = num(m, 'sellingCosts')
  const netProceeds = num(m, 'netSaleProceeds')
  const totalProject = num(m, 'totalProjectCost')
  const grossProfit = num(m, 'grossProfit')
  const capGains = num(m, 'capitalGainsTax')
  const netProfit = num(m, 'netProfit')
  const roi = num(m, 'roi')
  const annualizedRoi = num(m, 'annualizedRoi')

  let r = 5
  applySectionHeader(ws, r++, 'ACQUISITION')
  addRow(ws, r++, 'Purchase Price', state.purchasePrice, CUR)
  addRow(ws, r++, 'Discount from ARV', state.purchaseDiscountPct, PCT)
  addRow(ws, r++, 'Closing Costs', closingCosts, CUR, `${(state.closingCostsPercent * 100).toFixed(1)}%`)
  addRow(ws, r++, 'Financing Type', state.financingType === 'cash' ? 'Cash' : 'Hard Money')
  if (state.financingType !== 'cash') {
    addRow(ws, r++, 'Loan-to-Value', state.hardMoneyLtv, PCT)
    addRow(ws, r++, 'Interest Rate', state.hardMoneyRate, PCT2)
    addRow(ws, r++, 'Points', state.loanPoints, '0.0 "pts"')
    addRow(ws, r++, 'Loan Amount', loanAmount, CUR)
  }
  addTotalRow(ws, r++, 'Cash at Purchase', cashAtPurchase, CUR)

  r++
  applySectionHeader(ws, r++, 'REHAB & HOLDING')
  addRow(ws, r++, 'Rehab Budget', state.rehabBudget, CUR)
  addRow(ws, r++, 'Contingency', state.rehabBudget * state.contingencyPct, CUR, `${(state.contingencyPct * 100).toFixed(0)}%`)
  addRow(ws, r++, 'Rehab Time', state.rehabTimeMonths, '#,##0 "months"')
  addRow(ws, r++, 'After Repair Value (ARV)', state.arv, CUR)
  addRow(ws, r++, 'Monthly Holding Costs', state.holdingCostsMonthly, CUR)
  addRow(ws, r++, 'Days on Market', state.daysOnMarket, '#,##0 "days"')
  addRow(ws, r++, 'Total Rehab Cost', totalRehab, CUR)
  addRow(ws, r++, 'Holding Period', holdingMonths, '0.0 "months"')
  if (state.financingType !== 'cash') addRow(ws, r++, 'Interest Costs', interestCosts, CUR)
  addTotalRow(ws, r++, 'Total Project Cost', totalProject, CUR)

  r++
  applySectionHeader(ws, r++, 'SALE')
  addRow(ws, r++, 'ARV / Sale Price', grossProceeds || state.arv, CUR)
  addRow(ws, r++, 'Selling Costs', sellingCosts, CUR, `${(state.sellingCostsPct * 100).toFixed(0)}%`)
  addTotalRow(ws, r++, 'Net Proceeds', netProceeds, CUR)

  r++
  applySectionHeader(ws, r++, 'PROFIT ANALYSIS')
  addRow(ws, r++, 'Gross Profit', grossProfit, CUR)
  addRow(ws, r++, 'Capital Gains Tax', capGains, CUR, `${(state.capitalGainsRate * 100).toFixed(0)}%`)
  addTotalRow(ws, r++, 'Net Profit', netProfit, CUR)

  r++
  applySectionHeader(ws, r++, 'SUMMARY')
  addSummaryRow(ws, r++, 'Net Profit', netProfit, CUR, netProfit >= 0 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'ROI', roi / 100, PCT, roi >= 20 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'Annualized ROI', annualizedRoi / 100, PCT, annualizedRoi >= 30 ? 'good' : 'bad')
  addSummaryRow(ws, r++, '70% Rule', metrics.meets70PercentRule ? 'PASS' : 'FAIL', undefined, metrics.meets70PercentRule ? 'good' : 'bad')
}

function buildHouseHackSheet(wb: ExcelJS.Workbook, state: HouseHackDealMakerState, metrics: HouseHackMetrics, address: string) {
  const ws = setupSheet(wb, 'House Hack Analysis', address, STRATEGY_LABELS.house_hack)
  const m = metrics as unknown as Record<string, unknown>

  const downPayment = num(m, 'downPayment')
  const closingCosts = num(m, 'closingCosts')
  const cashToClose = num(m, 'cashToClose')
  const pi = num(m, 'monthlyPrincipalInterest')
  const pmi = num(m, 'monthlyPmi')
  const taxes = num(m, 'monthlyTaxes')
  const ins = num(m, 'monthlyInsurance')
  const piti = num(m, 'monthlyPITI')
  const rentedUnits = num(m, 'rentedUnits')
  const grossRental = num(m, 'grossRentalIncome')
  const effectiveRental = num(m, 'effectiveRentalIncome')
  const netRental = num(m, 'netRentalIncome')
  const effectiveCost = num(m, 'effectiveHousingCost')
  const savings = num(m, 'housingCostSavings')
  const offset = num(m, 'housingOffsetPercent')
  const coc = num(m, 'cashOnCashReturn')

  let r = 5
  applySectionHeader(ws, r++, 'ACQUISITION')
  addRow(ws, r++, 'Purchase Price', state.purchasePrice, CUR)
  addRow(ws, r++, 'Total Units', state.totalUnits, INT)
  addRow(ws, r++, 'Owner-Occupied Units', state.ownerOccupiedUnits, INT)
  addRow(ws, r++, 'Loan Type', state.loanType.toUpperCase())
  addRow(ws, r++, 'Down Payment', downPayment, CUR, `${(state.downPaymentPercent * 100).toFixed(1)}%`)
  addRow(ws, r++, 'Interest Rate', state.interestRate, PCT2)
  addRow(ws, r++, 'PMI/MIP Rate', state.pmiRate, PCT2)
  addRow(ws, r++, 'Closing Costs', closingCosts, CUR, `${(state.closingCostsPercent * 100).toFixed(1)}%`)
  addTotalRow(ws, r++, 'Cash to Close', cashToClose, CUR)

  r++
  applySectionHeader(ws, r++, 'MONTHLY PAYMENT')
  addRow(ws, r++, 'Principal & Interest', pi, CUR)
  if (pmi > 0) addRow(ws, r++, 'PMI/MIP', pmi, CUR)
  addRow(ws, r++, 'Property Tax', taxes, CUR)
  addRow(ws, r++, 'Insurance', ins, CUR)
  if (state.monthlyHoa > 0) addRow(ws, r++, 'HOA', state.monthlyHoa, CUR)
  addTotalRow(ws, r++, 'Total PITI', piti, CUR)

  r++
  applySectionHeader(ws, r++, 'RENTAL INCOME')
  addRow(ws, r++, 'Avg Rent Per Unit', state.avgRentPerUnit, CUR)
  addRow(ws, r++, 'Vacancy Rate', state.vacancyRate, PCT)
  addRow(ws, r++, 'Current Housing Payment', state.currentHousingPayment, CUR)
  addRow(ws, r++, 'Rented Units', Math.round(rentedUnits), INT)
  addRow(ws, r++, 'Gross Rental Income', grossRental, CUR, '/month')
  addRow(ws, r++, 'Effective Rental Income', effectiveRental, CUR, '/month')
  addTotalRow(ws, r++, 'Net Rental Income', netRental, CUR)

  r++
  applySectionHeader(ws, r++, 'EXPENSES')
  addRow(ws, r++, 'Property Tax', state.annualPropertyTax, CUR, '/year')
  addRow(ws, r++, 'Insurance', state.annualInsurance, CUR, '/year')
  if (state.monthlyHoa > 0) addRow(ws, r++, 'HOA', state.monthlyHoa, CUR, '/month')
  addRow(ws, r++, 'Utilities', state.utilitiesMonthly, CUR, '/month')
  addRow(ws, r++, 'Maintenance', state.maintenanceRate, PCT)
  addRow(ws, r++, 'CapEx Reserve', state.capexRate, PCT)

  r++
  applySectionHeader(ws, r++, 'SUMMARY')
  addSummaryRow(ws, r++, 'Effective Housing Cost', effectiveCost, CUR, effectiveCost <= 0 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'Net Rental Income', netRental, CUR, netRental >= 0 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'vs Current Housing', savings, CUR, savings >= 0 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'Housing Offset', offset / 100, PCT, offset >= 100 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'Cash-on-Cash Return', coc / 100, PCT, coc >= 8 ? 'good' : 'bad')
}

function buildWholesaleSheet(wb: ExcelJS.Workbook, state: WholesaleDealMakerState, metrics: WholesaleMetrics, address: string) {
  const ws = setupSheet(wb, 'Wholesale Analysis', address, STRATEGY_LABELS.wholesale)
  const m = metrics as unknown as Record<string, unknown>

  const mao = num(m, 'maxAllowableOffer')
  const meets70 = !!(m.meets70PercentRule)
  const endBuyerPrice = num(m, 'endBuyerPrice')
  const endBuyerAllIn = num(m, 'endBuyerAllIn')
  const endBuyerProfit = num(m, 'endBuyerProfit')
  const endBuyerROI = num(m, 'endBuyerROI')
  const cashAtRisk = num(m, 'totalCashAtRisk')
  const netProfit = num(m, 'netProfit')
  const roi = num(m, 'roi')
  const annROI = num(m, 'annualizedROI')

  let r = 5
  applySectionHeader(ws, r++, 'DEAL ANALYSIS')
  addRow(ws, r++, 'After Repair Value (ARV)', state.arv, CUR)
  addRow(ws, r++, 'Estimated Repairs', state.estimatedRepairs, CUR)
  addRow(ws, r++, 'Contract Price', state.contractPrice, CUR)
  addTotalRow(ws, r++, 'MAO (70% Rule)', mao, CUR)
  addRow(ws, r++, '70% Rule', meets70 ? 'PASS' : 'FAIL')

  r++
  applySectionHeader(ws, r++, 'CONTRACT TERMS')
  addRow(ws, r++, 'Earnest Money', state.earnestMoney, CUR)
  addRow(ws, r++, 'Inspection Period', state.inspectionPeriodDays, '#,##0 "days"')
  addRow(ws, r++, 'Days to Close', state.daysToClose, '#,##0 "days"')
  addTotalRow(ws, r++, 'Cash at Risk', cashAtRisk, CUR)

  r++
  applySectionHeader(ws, r++, 'ASSIGNMENT & COSTS')
  addRow(ws, r++, 'Assignment Fee', state.assignmentFee, CUR)
  addRow(ws, r++, 'Marketing Costs', state.marketingCosts, CUR)
  addRow(ws, r++, 'Closing Costs', state.closingCosts, CUR)
  addTotalRow(ws, r++, 'Net Profit', netProfit, CUR)

  r++
  applySectionHeader(ws, r++, 'END BUYER ANALYSIS')
  addRow(ws, r++, "Buyer's Price", endBuyerPrice, CUR)
  addRow(ws, r++, '+ Repairs', state.estimatedRepairs, CUR)
  addRow(ws, r++, 'All-In Cost', endBuyerAllIn, CUR)
  addRow(ws, r++, 'Buyer Profit', endBuyerProfit, CUR)
  addTotalRow(ws, r++, 'Buyer ROI', endBuyerROI / 100, PCT)

  r++
  applySectionHeader(ws, r++, 'SUMMARY')
  addSummaryRow(ws, r++, 'Net Profit', netProfit, CUR, netProfit >= 0 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'ROI', roi / 100, PCT, roi >= 200 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'Annualized ROI', annROI / 100, PCT, annROI >= 500 ? 'good' : 'bad')
  addSummaryRow(ws, r++, 'Buyer ROI', endBuyerROI / 100, PCT, endBuyerROI >= 20 ? 'good' : 'bad')
}

// ── Public entry point ──────────────────────────────────────────────────────

export async function exportDealMakerExcel(
  strategyType: StrategyType,
  state: AnyStrategyState,
  metrics: AnyStrategyMetrics,
  propertyAddress: string,
  listPrice: number,
) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'DealScope IQ'
  wb.created = new Date()

  switch (strategyType) {
    case 'ltr':
      buildLTRSheet(wb, state as LTRDealMakerState, metrics as LTRDealMakerMetrics, propertyAddress, listPrice)
      break
    case 'str':
      buildSTRSheet(wb, state as STRDealMakerState, metrics as STRMetrics, propertyAddress, listPrice)
      break
    case 'brrrr':
      buildBRRRRSheet(wb, state as BRRRRDealMakerState, metrics as BRRRRMetrics, propertyAddress)
      break
    case 'flip':
      buildFlipSheet(wb, state as FlipDealMakerState, metrics as FlipMetrics, propertyAddress)
      break
    case 'house_hack':
      buildHouseHackSheet(wb, state as HouseHackDealMakerState, metrics as HouseHackMetrics, propertyAddress)
      break
    case 'wholesale':
      buildWholesaleSheet(wb, state as WholesaleDealMakerState, metrics as WholesaleMetrics, propertyAddress)
      break
  }

  const buffer = await wb.xlsx.writeBuffer()
  const slug = propertyAddress.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 30) || 'property'
  const label = STRATEGY_LABELS[strategyType].replace(/\s+/g, '_')
  triggerDownload(buffer as ArrayBuffer, `DealMaker_${label}_${slug}.xlsx`)
}
