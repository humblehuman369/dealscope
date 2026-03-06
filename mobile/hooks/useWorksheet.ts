import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import type { PropertyResponse } from '@dealscope/shared';

export interface WorksheetData {
  strategy_id: string;
  purchase_price: number;
  monthly_rent: number;
  // Financing
  down_payment: number;
  loan_amount: number;
  monthly_mortgage: number;
  // Operating
  monthly_expenses: number;
  vacancy_cost: number;
  management_cost: number;
  maintenance_cost: number;
  insurance_cost: number;
  property_taxes_monthly: number;
  // Returns
  monthly_cash_flow: number;
  annual_cash_flow: number;
  noi: number;
  cash_on_cash: number;
  cap_rate: number;
  dscr: number;
  total_cash_needed: number;
  // Strategy-specific
  [key: string]: any;
}

export function useWorksheet(
  property: PropertyResponse | undefined,
  strategyId: string | undefined,
) {
  return useQuery<WorksheetData>({
    queryKey: ['worksheet', property?.property_id, strategyId],
    queryFn: async () => {
      const v = property!.valuations;
      const r = property!.rentals;
      const m = property!.market;

      const purchasePrice = v.market_price ?? v.value_iq_estimate ?? v.zestimate ?? 0;
      const monthlyRent = r.monthly_rent_ltr ?? 0;
      const propertyTaxes = m.property_taxes_annual ? m.property_taxes_annual / 12 : 0;

      const downPaymentPct = 0.20;
      const interestRate = 0.06;
      const loanTermYears = 30;
      const vacancyRate = 0.01;
      const managementPct = 0;
      const maintenancePct = 0.05;
      const insurancePct = 0.01;

      const downPayment = purchasePrice * downPaymentPct;
      const loanAmount = purchasePrice - downPayment;
      const monthlyRate = interestRate / 12;
      const numPayments = loanTermYears * 12;
      const monthlyMortgage = loanAmount > 0 && monthlyRate > 0
        ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
        : 0;

      const vacancyCost = monthlyRent * vacancyRate;
      const managementCost = monthlyRent * managementPct;
      const maintenanceCost = monthlyRent * maintenancePct;
      const insuranceCost = (purchasePrice * insurancePct) / 12;

      const monthlyExpenses = propertyTaxes + insuranceCost + vacancyCost + managementCost + maintenanceCost;
      const noi = (monthlyRent * 12) - (monthlyExpenses * 12);
      const monthlyCashFlow = monthlyRent - monthlyMortgage - monthlyExpenses;
      const annualCashFlow = monthlyCashFlow * 12;
      const closingCosts = purchasePrice * 0.03;
      const totalCashNeeded = downPayment + closingCosts;

      const cashOnCash = totalCashNeeded > 0 ? (annualCashFlow / totalCashNeeded) * 100 : 0;
      const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;
      const dscr = monthlyMortgage > 0 ? (monthlyRent - monthlyExpenses + monthlyMortgage) / monthlyMortgage : 0;

      return {
        strategy_id: strategyId!,
        purchase_price: purchasePrice,
        monthly_rent: monthlyRent,
        down_payment: downPayment,
        loan_amount: loanAmount,
        monthly_mortgage: monthlyMortgage,
        monthly_expenses: monthlyExpenses,
        vacancy_cost: vacancyCost,
        management_cost: managementCost,
        maintenance_cost: maintenanceCost,
        insurance_cost: insuranceCost,
        property_taxes_monthly: propertyTaxes,
        monthly_cash_flow: monthlyCashFlow,
        annual_cash_flow: annualCashFlow,
        noi,
        cash_on_cash: cashOnCash,
        cap_rate: capRate,
        dscr,
        total_cash_needed: totalCashNeeded,
      };
    },
    enabled: !!property && !!strategyId,
    staleTime: 5 * 60 * 1000,
  });
}
