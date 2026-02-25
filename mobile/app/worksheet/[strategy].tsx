/**
 * Unified Worksheet Screen
 * Route: /worksheet/[strategy]
 *
 * Handles all 6 investment strategies via a single, config-driven component.
 * Strategy-specific fields and result layouts are defined in STRATEGY_CONFIGS.
 *
 * Inputs auto-calculate with 500ms debounce. Percent values are stored as
 * decimals (0.20) but displayed as whole numbers (20) in the input fields.
 */

import { ScreenErrorFallback as ErrorBoundary } from '../../components/ScreenErrorFallback';
export { ErrorBoundary };

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { api } from '../../services/apiClient';
import { useTheme } from '../../context/ThemeContext';
import { useAssumptionsStore, useWorksheetStore } from '../../stores';
import type { StrategyId } from '../../types/analytics';
import { isValidStrategy, InvalidParamFallback } from '../../hooks/useValidatedParams';

// ─── Types ──────────────────────────────────────────────────────────────────

type InputFormat = 'currency' | 'percent' | 'number' | 'months';
type ResultFormat = 'currency' | 'percent' | 'number' | 'boolean' | 'score';

interface FieldConfig {
  key: string;
  label: string;
  format: InputFormat;
  defaultValue: number;
}

interface InputSectionConfig {
  title: string;
  fields: FieldConfig[];
}

interface MetricConfig {
  key: string;
  label: string;
  format: ResultFormat;
}

interface ResultSectionConfig {
  title: string;
  icon: string;
  metrics: MetricConfig[];
}

interface StrategyConfig {
  label: string;
  icon: string;
  color: string;
  endpoint: string;
  inputSections: InputSectionConfig[];
  resultSections: ResultSectionConfig[];
  heroKeys: string[];
}

// ─── Strategy Configurations ────────────────────────────────────────────────

const STRATEGY_CONFIGS: Record<StrategyId, StrategyConfig> = {
  // ── Long-Term Rental ────────────────────────────────────────────────────
  ltr: {
    label: 'Long-Term Rental',
    icon: 'home-outline',
    color: '#0d9488',
    endpoint: '/api/v1/worksheet/ltr/calculate',
    heroKeys: ['monthly_cash_flow', 'cash_on_cash_return', 'cap_rate', 'deal_score'],
    inputSections: [
      {
        title: 'Purchase & Financing',
        fields: [
          { key: 'purchase_price', label: 'Purchase Price', format: 'currency', defaultValue: 0 },
          { key: 'monthly_rent', label: 'Monthly Rent', format: 'currency', defaultValue: 0 },
          { key: 'down_payment_pct', label: 'Down Payment %', format: 'percent', defaultValue: 0.20 },
          { key: 'interest_rate', label: 'Interest Rate', format: 'percent', defaultValue: 0.07 },
          { key: 'loan_term_years', label: 'Loan Term', format: 'number', defaultValue: 30 },
          { key: 'closing_costs', label: 'Closing Costs', format: 'currency', defaultValue: 0 },
          { key: 'rehab_costs', label: 'Rehab Costs', format: 'currency', defaultValue: 0 },
        ],
      },
      {
        title: 'Operating Expenses',
        fields: [
          { key: 'vacancy_rate', label: 'Vacancy Rate', format: 'percent', defaultValue: 0.08 },
          { key: 'property_management_pct', label: 'Property Mgmt', format: 'percent', defaultValue: 0.08 },
          { key: 'maintenance_pct', label: 'Maintenance', format: 'percent', defaultValue: 0.05 },
          { key: 'capex_pct', label: 'CapEx Reserve', format: 'percent', defaultValue: 0.05 },
          { key: 'property_taxes_annual', label: 'Annual Taxes', format: 'currency', defaultValue: 0 },
          { key: 'insurance_annual', label: 'Annual Insurance', format: 'currency', defaultValue: 0 },
          { key: 'hoa_monthly', label: 'HOA/month', format: 'currency', defaultValue: 0 },
        ],
      },
    ],
    resultSections: [
      {
        title: 'Cash Flow',
        icon: 'cash-outline',
        metrics: [
          { key: 'monthly_cash_flow', label: 'Monthly Cash Flow', format: 'currency' },
          { key: 'annual_cash_flow', label: 'Annual Cash Flow', format: 'currency' },
        ],
      },
      {
        title: 'Returns',
        icon: 'trending-up-outline',
        metrics: [
          { key: 'cap_rate', label: 'Cap Rate', format: 'percent' },
          { key: 'cash_on_cash_return', label: 'Cash-on-Cash', format: 'percent' },
          { key: 'dscr', label: 'DSCR', format: 'number' },
          { key: 'one_percent_rule', label: '1% Rule', format: 'boolean' },
        ],
      },
      {
        title: 'Income',
        icon: 'wallet-outline',
        metrics: [
          { key: 'noi', label: 'NOI', format: 'currency' },
          { key: 'gross_income', label: 'Gross Income', format: 'currency' },
          { key: 'gross_expenses', label: 'Gross Expenses', format: 'currency' },
        ],
      },
      {
        title: 'Financing',
        icon: 'card-outline',
        metrics: [
          { key: 'loan_amount', label: 'Loan Amount', format: 'currency' },
          { key: 'down_payment', label: 'Down Payment', format: 'currency' },
          { key: 'monthly_payment', label: 'Monthly Payment', format: 'currency' },
        ],
      },
      {
        title: 'Deal Score',
        icon: 'star-outline',
        metrics: [
          { key: 'deal_score', label: 'Deal Score', format: 'score' },
        ],
      },
    ],
  },

  // ── Short-Term Rental ───────────────────────────────────────────────────
  str: {
    label: 'Short-Term Rental',
    icon: 'calendar-outline',
    color: '#8b5cf6',
    endpoint: '/api/v1/worksheet/str/calculate',
    heroKeys: ['monthly_cash_flow', 'cash_on_cash_return', 'cap_rate', 'deal_score'],
    inputSections: [
      {
        title: 'Purchase & Financing',
        fields: [
          { key: 'purchase_price', label: 'Purchase Price', format: 'currency', defaultValue: 0 },
          { key: 'average_daily_rate', label: 'Average Daily Rate', format: 'currency', defaultValue: 200 },
          { key: 'occupancy_rate', label: 'Occupancy Rate', format: 'percent', defaultValue: 0.75 },
          { key: 'down_payment_pct', label: 'Down Payment %', format: 'percent', defaultValue: 0.20 },
          { key: 'interest_rate', label: 'Interest Rate', format: 'percent', defaultValue: 0.07 },
          { key: 'loan_term_years', label: 'Loan Term', format: 'number', defaultValue: 30 },
          { key: 'furnishing_budget', label: 'Furnishing Budget', format: 'currency', defaultValue: 15000 },
        ],
      },
      {
        title: 'Operating',
        fields: [
          { key: 'platform_fees_pct', label: 'Platform Fees', format: 'percent', defaultValue: 0.03 },
          { key: 'property_management_pct', label: 'Property Mgmt', format: 'percent', defaultValue: 0.20 },
          { key: 'cleaning_cost_per_turn', label: 'Cleaning/Turn', format: 'currency', defaultValue: 150 },
          { key: 'cleaning_fee_revenue', label: 'Cleaning Fee Rev', format: 'currency', defaultValue: 200 },
          { key: 'avg_booking_length', label: 'Avg Booking Length', format: 'number', defaultValue: 4 },
          { key: 'supplies_monthly', label: 'Monthly Supplies', format: 'currency', defaultValue: 200 },
          { key: 'utilities_monthly', label: 'Monthly Utilities', format: 'currency', defaultValue: 300 },
          { key: 'property_taxes_annual', label: 'Annual Taxes', format: 'currency', defaultValue: 0 },
          { key: 'insurance_annual', label: 'Annual Insurance', format: 'currency', defaultValue: 0 },
          { key: 'maintenance_pct', label: 'Maintenance', format: 'percent', defaultValue: 0.03 },
          { key: 'capex_pct', label: 'CapEx Reserve', format: 'percent', defaultValue: 0.05 },
        ],
      },
    ],
    resultSections: [
      {
        title: 'Cash Flow',
        icon: 'cash-outline',
        metrics: [
          { key: 'monthly_cash_flow', label: 'Monthly Cash Flow', format: 'currency' },
          { key: 'annual_cash_flow', label: 'Annual Cash Flow', format: 'currency' },
        ],
      },
      {
        title: 'Returns',
        icon: 'trending-up-outline',
        metrics: [
          { key: 'cap_rate', label: 'Cap Rate', format: 'percent' },
          { key: 'cash_on_cash_return', label: 'Cash-on-Cash', format: 'percent' },
          { key: 'dscr', label: 'DSCR', format: 'number' },
          { key: 'break_even_occupancy', label: 'Break-Even Occupancy', format: 'percent' },
        ],
      },
      {
        title: 'Revenue',
        icon: 'wallet-outline',
        metrics: [
          { key: 'gross_revenue', label: 'Gross Revenue', format: 'currency' },
          { key: 'noi', label: 'NOI', format: 'currency' },
        ],
      },
      {
        title: 'Deal Score',
        icon: 'star-outline',
        metrics: [
          { key: 'deal_score', label: 'Deal Score', format: 'score' },
        ],
      },
    ],
  },

  // ── BRRRR ───────────────────────────────────────────────────────────────
  brrrr: {
    label: 'BRRRR',
    icon: 'repeat-outline',
    color: '#f59e0b',
    endpoint: '/api/v1/worksheet/brrrr/calculate',
    heroKeys: ['cash_left_in_deal', 'cash_on_cash_return', 'equity_created', 'deal_score'],
    inputSections: [
      {
        title: 'Acquisition',
        fields: [
          { key: 'purchase_price', label: 'Purchase Price', format: 'currency', defaultValue: 0 },
          { key: 'purchase_costs', label: 'Purchase Costs', format: 'currency', defaultValue: 0 },
          { key: 'rehab_costs', label: 'Rehab Costs', format: 'currency', defaultValue: 30000 },
          { key: 'arv', label: 'After Repair Value', format: 'currency', defaultValue: 0 },
          { key: 'monthly_rent', label: 'Monthly Rent', format: 'currency', defaultValue: 0 },
        ],
      },
      {
        title: 'Initial Financing',
        fields: [
          { key: 'down_payment_pct', label: 'Down Payment %', format: 'percent', defaultValue: 0.20 },
          { key: 'interest_rate', label: 'Interest Rate', format: 'percent', defaultValue: 0.10 },
          { key: 'points', label: 'Points', format: 'number', defaultValue: 2 },
          { key: 'holding_months', label: 'Holding Period', format: 'months', defaultValue: 6 },
        ],
      },
      {
        title: 'Refinance',
        fields: [
          { key: 'refi_ltv', label: 'Refi LTV', format: 'percent', defaultValue: 0.75 },
          { key: 'refi_interest_rate', label: 'Refi Rate', format: 'percent', defaultValue: 0.07 },
          { key: 'refi_loan_term', label: 'Refi Term', format: 'number', defaultValue: 30 },
          { key: 'refi_closing_costs', label: 'Refi Closing Costs', format: 'currency', defaultValue: 3000 },
        ],
      },
      {
        title: 'Operating',
        fields: [
          { key: 'property_taxes_annual', label: 'Annual Taxes', format: 'currency', defaultValue: 6000 },
          { key: 'insurance_annual', label: 'Annual Insurance', format: 'currency', defaultValue: 2000 },
          { key: 'utilities_monthly', label: 'Monthly Utilities', format: 'currency', defaultValue: 0 },
          { key: 'vacancy_rate', label: 'Vacancy Rate', format: 'percent', defaultValue: 0.08 },
          { key: 'property_management_pct', label: 'Property Mgmt', format: 'percent', defaultValue: 0.08 },
          { key: 'maintenance_pct', label: 'Maintenance', format: 'percent', defaultValue: 0.05 },
          { key: 'capex_pct', label: 'CapEx Reserve', format: 'percent', defaultValue: 0.05 },
        ],
      },
    ],
    resultSections: [
      {
        title: 'Capital Recovery',
        icon: 'refresh-outline',
        metrics: [
          { key: 'cash_left_in_deal', label: 'Cash Left in Deal', format: 'currency' },
          { key: 'infinite_roi_achieved', label: 'Infinite ROI', format: 'boolean' },
        ],
      },
      {
        title: 'Cash Flow',
        icon: 'cash-outline',
        metrics: [
          { key: 'annual_cash_flow', label: 'Annual Cash Flow', format: 'currency' },
          { key: 'monthly_cash_flow', label: 'Monthly Cash Flow', format: 'currency' },
        ],
      },
      {
        title: 'Returns',
        icon: 'trending-up-outline',
        metrics: [
          { key: 'cap_rate_arv', label: 'Cap Rate (ARV)', format: 'percent' },
          { key: 'cash_on_cash_return', label: 'Cash-on-Cash', format: 'percent' },
          { key: 'return_on_equity', label: 'Return on Equity', format: 'percent' },
          { key: 'total_roi_year1', label: 'Total ROI Year 1', format: 'percent' },
        ],
      },
      {
        title: 'Equity',
        icon: 'bar-chart-outline',
        metrics: [
          { key: 'equity_position', label: 'Equity Position', format: 'currency' },
          { key: 'equity_created', label: 'Equity Created', format: 'currency' },
          { key: 'all_in_pct_arv', label: 'All-In % of ARV', format: 'percent' },
        ],
      },
      {
        title: 'Deal Score',
        icon: 'star-outline',
        metrics: [
          { key: 'deal_score', label: 'Deal Score', format: 'score' },
        ],
      },
    ],
  },

  // ── Fix & Flip ──────────────────────────────────────────────────────────
  flip: {
    label: 'Fix & Flip',
    icon: 'hammer-outline',
    color: '#ef4444',
    endpoint: '/api/v1/worksheet/flip/calculate',
    heroKeys: ['net_profit_after_tax', 'roi', 'annualized_roi', 'deal_score'],
    inputSections: [
      {
        title: 'Purchase',
        fields: [
          { key: 'purchase_price', label: 'Purchase Price', format: 'currency', defaultValue: 0 },
          { key: 'purchase_costs', label: 'Purchase Costs', format: 'currency', defaultValue: 0 },
          { key: 'rehab_costs', label: 'Rehab Costs', format: 'currency', defaultValue: 30000 },
          { key: 'arv', label: 'After Repair Value', format: 'currency', defaultValue: 0 },
        ],
      },
      {
        title: 'Financing',
        fields: [
          { key: 'down_payment_pct', label: 'Down Payment %', format: 'percent', defaultValue: 0.10 },
          { key: 'interest_rate', label: 'Interest Rate', format: 'percent', defaultValue: 0.12 },
          { key: 'points', label: 'Points', format: 'number', defaultValue: 2 },
          { key: 'holding_months', label: 'Holding Period', format: 'months', defaultValue: 6 },
        ],
      },
      {
        title: 'Holding Costs',
        fields: [
          { key: 'property_taxes_annual', label: 'Annual Taxes', format: 'currency', defaultValue: 4000 },
          { key: 'insurance_annual', label: 'Annual Insurance', format: 'currency', defaultValue: 1500 },
          { key: 'utilities_monthly', label: 'Monthly Utilities', format: 'currency', defaultValue: 150 },
          { key: 'dumpster_monthly', label: 'Monthly Dumpster', format: 'currency', defaultValue: 100 },
        ],
      },
      {
        title: 'Selling',
        fields: [
          { key: 'selling_costs_pct', label: 'Selling Costs', format: 'percent', defaultValue: 0.08 },
          { key: 'capital_gains_rate', label: 'Capital Gains Tax', format: 'percent', defaultValue: 0.20 },
        ],
      },
    ],
    resultSections: [
      {
        title: 'Profit',
        icon: 'cash-outline',
        metrics: [
          { key: 'net_profit_before_tax', label: 'Profit (Pre-Tax)', format: 'currency' },
          { key: 'net_profit_after_tax', label: 'Profit (After Tax)', format: 'currency' },
        ],
      },
      {
        title: 'Returns',
        icon: 'trending-up-outline',
        metrics: [
          { key: 'roi', label: 'ROI', format: 'percent' },
          { key: 'annualized_roi', label: 'Annualized ROI', format: 'percent' },
          { key: 'profit_margin', label: 'Profit Margin', format: 'percent' },
        ],
      },
      {
        title: 'Project Costs',
        icon: 'receipt-outline',
        metrics: [
          { key: 'total_project_cost', label: 'Total Project Cost', format: 'currency' },
          { key: 'total_cash_required', label: 'Total Cash Required', format: 'currency' },
        ],
      },
      {
        title: 'Deal Rules',
        icon: 'checkmark-circle-outline',
        metrics: [
          { key: 'meets_70_rule', label: '70% Rule', format: 'boolean' },
          { key: 'mao', label: 'Max Allowable Offer', format: 'currency' },
        ],
      },
      {
        title: 'Deal Score',
        icon: 'star-outline',
        metrics: [
          { key: 'deal_score', label: 'Deal Score', format: 'score' },
        ],
      },
    ],
  },

  // ── House Hack ──────────────────────────────────────────────────────────
  house_hack: {
    label: 'House Hack',
    icon: 'people-outline',
    color: '#3b82f6',
    endpoint: '/api/v1/worksheet/househack/calculate',
    heroKeys: ['your_housing_cost', 'savings_vs_renting', 'housing_offset', 'deal_score'],
    inputSections: [
      {
        title: 'Purchase',
        fields: [
          { key: 'purchase_price', label: 'Purchase Price', format: 'currency', defaultValue: 0 },
          { key: 'down_payment_pct', label: 'Down Payment %', format: 'percent', defaultValue: 0.035 },
          { key: 'interest_rate', label: 'Interest Rate', format: 'percent', defaultValue: 0.07 },
          { key: 'loan_term_years', label: 'Loan Term', format: 'number', defaultValue: 30 },
          { key: 'closing_costs', label: 'Closing Costs', format: 'currency', defaultValue: 0 },
        ],
      },
      {
        title: 'Rental Income',
        fields: [
          { key: 'unit_rent_1', label: 'Unit 1 Rent', format: 'currency', defaultValue: 0 },
          { key: 'unit_rent_2', label: 'Unit 2 Rent', format: 'currency', defaultValue: 0 },
          { key: 'unit_rent_3', label: 'Unit 3 Rent', format: 'currency', defaultValue: 0 },
          { key: 'owner_market_rent', label: 'Owner Market Rent', format: 'currency', defaultValue: 1500 },
        ],
      },
      {
        title: 'Expenses',
        fields: [
          { key: 'property_taxes_annual', label: 'Annual Taxes', format: 'currency', defaultValue: 6000 },
          { key: 'insurance_annual', label: 'Annual Insurance', format: 'currency', defaultValue: 2000 },
          { key: 'pmi_rate', label: 'PMI Rate', format: 'percent', defaultValue: 0.005 },
          { key: 'vacancy_rate', label: 'Vacancy Rate', format: 'percent', defaultValue: 0.05 },
          { key: 'maintenance_monthly', label: 'Monthly Maintenance', format: 'currency', defaultValue: 200 },
          { key: 'capex_monthly', label: 'Monthly CapEx', format: 'currency', defaultValue: 100 },
          { key: 'utilities_monthly', label: 'Monthly Utilities', format: 'currency', defaultValue: 150 },
        ],
      },
    ],
    resultSections: [
      {
        title: 'Housing Cost',
        icon: 'home-outline',
        metrics: [
          { key: 'your_housing_cost', label: 'Your Housing Cost', format: 'currency' },
          { key: 'savings_vs_renting', label: 'Savings vs Renting', format: 'currency' },
        ],
      },
      {
        title: 'Rental Income',
        icon: 'key-outline',
        metrics: [
          { key: 'rental_income', label: 'Rental Income', format: 'currency' },
          { key: 'total_rent', label: 'Total Rent', format: 'currency' },
        ],
      },
      {
        title: 'Coverage',
        icon: 'shield-outline',
        metrics: [
          { key: 'housing_offset', label: 'Housing Offset', format: 'percent' },
        ],
      },
      {
        title: 'Move-Out Analysis',
        icon: 'exit-outline',
        metrics: [
          { key: 'full_rental_cash_flow', label: 'Full Rental Cash Flow', format: 'currency' },
          { key: 'moveout_cap_rate', label: 'Move-Out Cap Rate', format: 'percent' },
        ],
      },
      {
        title: 'Deal Score',
        icon: 'star-outline',
        metrics: [
          { key: 'deal_score', label: 'Deal Score', format: 'score' },
        ],
      },
    ],
  },

  // ── Wholesale ───────────────────────────────────────────────────────────
  wholesale: {
    label: 'Wholesale',
    icon: 'swap-horizontal-outline',
    color: '#10b981',
    endpoint: '/api/v1/worksheet/wholesale/calculate',
    heroKeys: ['assignment_fee', 'net_profit', 'roi', 'deal_score'],
    inputSections: [
      {
        title: 'Deal Terms',
        fields: [
          { key: 'arv', label: 'After Repair Value', format: 'currency', defaultValue: 0 },
          { key: 'contract_price', label: 'Contract Price', format: 'currency', defaultValue: 0 },
          { key: 'investor_price', label: 'Investor Price', format: 'currency', defaultValue: 0 },
          { key: 'rehab_costs', label: 'Rehab Costs', format: 'currency', defaultValue: 30000 },
          { key: 'assignment_fee', label: 'Assignment Fee', format: 'currency', defaultValue: 15000 },
        ],
      },
      {
        title: 'Costs',
        fields: [
          { key: 'marketing_costs', label: 'Marketing Costs', format: 'currency', defaultValue: 500 },
          { key: 'earnest_money', label: 'Earnest Money', format: 'currency', defaultValue: 1000 },
          { key: 'selling_costs_pct', label: 'Selling Costs', format: 'percent', defaultValue: 0.06 },
          { key: 'investor_down_payment_pct', label: 'Investor Down Pmt', format: 'percent', defaultValue: 0.25 },
          { key: 'investor_purchase_costs_pct', label: 'Investor Costs', format: 'percent', defaultValue: 0.03 },
          { key: 'tax_rate', label: 'Tax Rate', format: 'percent', defaultValue: 0.20 },
        ],
      },
    ],
    resultSections: [
      {
        title: 'Profit',
        icon: 'cash-outline',
        metrics: [
          { key: 'assignment_fee', label: 'Assignment Fee', format: 'currency' },
          { key: 'gross_profit', label: 'Gross Profit', format: 'currency' },
          { key: 'net_profit', label: 'Net Profit', format: 'currency' },
          { key: 'post_tax_profit', label: 'Post-Tax Profit', format: 'currency' },
        ],
      },
      {
        title: 'Returns',
        icon: 'trending-up-outline',
        metrics: [
          { key: 'roi', label: 'ROI', format: 'percent' },
          { key: 'total_cash_at_risk', label: 'Cash at Risk', format: 'currency' },
        ],
      },
      {
        title: 'Investor Analysis',
        icon: 'person-outline',
        metrics: [
          { key: 'investor_profit', label: 'Investor Profit', format: 'currency' },
          { key: 'investor_roi', label: 'Investor ROI', format: 'percent' },
        ],
      },
      {
        title: 'Viability',
        icon: 'checkmark-circle-outline',
        metrics: [
          { key: 'deal_viability', label: 'Deal Viable', format: 'boolean' },
          { key: 'spread_available', label: 'Spread Available', format: 'currency' },
        ],
      },
      {
        title: 'Deal Score',
        icon: 'star-outline',
        metrics: [
          { key: 'deal_score', label: 'Deal Score', format: 'score' },
        ],
      },
    ],
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Display value shown inside a TextInput. Percents are stored as decimals. */
function formatInputDisplay(value: number, format: InputFormat): string {
  if (value === 0) return '0';
  if (format === 'percent') {
    const pct = value * 100;
    return pct % 1 === 0 ? String(Math.round(pct)) : String(parseFloat(pct.toFixed(2)));
  }
  return String(value);
}

/** Convert user-typed text back into a storable number. */
function parseInputValue(text: string, format: InputFormat): number {
  const cleaned = text.replace(/[^0-9.\-]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  if (format === 'percent') return num / 100;
  return num;
}

/** Format a result value for display. */
function formatResultValue(value: unknown, format: ResultFormat): string {
  if (value === null || value === undefined) return '—';
  switch (format) {
    case 'currency': {
      const n = Number(value);
      if (isNaN(n)) return '—';
      const abs = Math.abs(n);
      const formatted = abs.toLocaleString('en-US', { maximumFractionDigits: 0 });
      return n < 0 ? `-$${formatted}` : `$${formatted}`;
    }
    case 'percent': {
      const n = Number(value);
      if (isNaN(n)) return '—';
      return `${(n * 100).toFixed(1)}%`;
    }
    case 'number': {
      const n = Number(value);
      if (isNaN(n)) return '—';
      return n % 1 === 0 ? String(n) : n.toFixed(2);
    }
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'score': {
      const n = Number(value);
      if (isNaN(n)) return '—';
      return `${Math.round(n)} / 100`;
    }
    default:
      return String(value);
  }
}

/** Compact format for hero KPI cards. */
function formatHeroValue(value: unknown, format: ResultFormat): string {
  if (value === null || value === undefined) return '—';
  switch (format) {
    case 'currency': {
      const n = Number(value);
      if (isNaN(n)) return '—';
      const abs = Math.abs(n);
      const sign = n < 0 ? '-' : '';
      if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
      return `${sign}$${Math.round(abs)}`;
    }
    case 'percent': {
      const n = Number(value);
      if (isNaN(n)) return '—';
      return `${(n * 100).toFixed(1)}%`;
    }
    case 'number': {
      const n = Number(value);
      if (isNaN(n)) return '—';
      return n % 1 === 0 ? String(n) : n.toFixed(2);
    }
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'score':
      return String(Math.round(Number(value)));
    default:
      return String(value);
  }
}

/** Color for a result value: green for positive currency, red for negative. */
function getValueColor(
  value: unknown,
  format: ResultFormat,
  accentColor: string,
): string | undefined {
  if (format === 'currency') {
    const n = Number(value);
    if (n > 0) return '#10b981';
    if (n < 0) return '#ef4444';
  }
  if (format === 'boolean') {
    return value ? '#10b981' : '#ef4444';
  }
  if (format === 'score') {
    const n = Number(value);
    if (n >= 80) return '#10b981';
    if (n >= 60) return accentColor;
    if (n >= 40) return '#f59e0b';
    return '#ef4444';
  }
  return undefined;
}

/** Resolve a deal-score number to a label. */
function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

/** Look up a metric definition by key across all result sections. */
function findMetric(config: StrategyConfig, key: string): MetricConfig | undefined {
  for (const section of config.resultSections) {
    const found = section.metrics.find(m => m.key === key);
    if (found) return found;
  }
  return undefined;
}

/**
 * Build the API payload from raw inputs. For house_hack, merges
 * unit_rent_1 / unit_rent_2 / unit_rent_3 into a `unit_rents` array.
 */
function preparePayload(
  strategy: StrategyId,
  inputs: Record<string, number>,
): Record<string, unknown> {
  if (strategy === 'house_hack') {
    const { unit_rent_1, unit_rent_2, unit_rent_3, ...rest } = inputs;
    return {
      ...rest,
      unit_rents: [unit_rent_1 ?? 0, unit_rent_2 ?? 0, unit_rent_3 ?? 0],
    };
  }
  return { ...inputs };
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function WorksheetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  // ── Search / route params ───────────────────────────────────────────────
  const params = useLocalSearchParams<{
    strategy: string;
    propertyId?: string;
    address?: string;
    price?: string;
    rent?: string;
    beds?: string;
    baths?: string;
    sqft?: string;
    adr?: string;
    arv?: string;
  }>();

  const strategy = (params.strategy || 'ltr') as StrategyId;
  const config = useMemo(() => STRATEGY_CONFIGS[strategy], [strategy]);

  const address = params.address ? decodeURIComponent(params.address) : '';
  const beds = params.beds || '';
  const baths = params.baths || '';
  const sqft = params.sqft || '';
  const subtitle = [
    beds ? `${beds}bd` : '',
    baths ? `${baths}ba` : '',
    sqft ? `${Number(sqft).toLocaleString()} sqft` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  // ── Theme colors ────────────────────────────────────────────────────────
  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const inputBg = isDark ? '#0f172a' : '#f1f5f9';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#0d9488';

  // ── State ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'inputs' | 'results'>('inputs');
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pull user's saved defaults from assumptions store
  const storeAssumptions = useAssumptionsStore((s) => s.assumptions);

  // Build a map from worksheet input keys → store values for the current strategy
  const storeDefaults = useMemo((): Record<string, number> => {
    const m: Record<string, number> = {};
    const { financing, operating } = storeAssumptions;
    // Financing defaults
    m.down_payment_pct = financing.down_payment_pct;
    m.interest_rate = financing.interest_rate;
    m.loan_term_years = financing.loan_term_years;
    // Operating defaults
    m.vacancy_rate = operating.vacancy_rate;
    m.property_management_pct = operating.property_management_pct;
    m.maintenance_pct = operating.maintenance_pct;
    m.capex_pct = operating.maintenance_pct; // fallback
    // Strategy-specific
    if (strategy === 'str') {
      const s = storeAssumptions.str;
      m.occupancy_rate = 0.75;
      m.platform_fees_pct = s.platform_fees_pct;
      m.furnishing_budget = s.furniture_setup_cost;
      m.supplies_monthly = s.supplies_monthly;
    } else if (strategy === 'brrrr') {
      const b = storeAssumptions.brrrr;
      m.refi_ltv = b.refinance_ltv;
      m.refi_interest_rate = b.refinance_interest_rate;
      m.refi_loan_term = b.refinance_term_years;
    } else if (strategy === 'flip') {
      const f = storeAssumptions.flip;
      m.selling_costs_pct = f.selling_costs_pct;
      m.holding_months = f.holding_period_months;
    } else if (strategy === 'house_hack') {
      const h = storeAssumptions.house_hack;
      m.down_payment_pct = h.fha_down_payment_pct;
      m.pmi_rate = h.fha_mip_rate;
    } else if (strategy === 'wholesale') {
      const w = storeAssumptions.wholesale;
      m.assignment_fee = w.assignment_fee;
      m.marketing_costs = w.marketing_costs;
      m.earnest_money = w.earnest_money_deposit;
    }
    return m;
  }, [strategy, storeAssumptions]);

  // Worksheet persistence store
  const worksheetStore = useWorksheetStore();
  // Prefer explicit propertyId for unambiguous deep linking; fall back to address
  const propertyId = params.propertyId
    || (params.address ? encodeURIComponent(decodeURIComponent(params.address as string)) : 'default');

  // Initialise inputs from strategy defaults + store overrides + URL params
  // If the store has a persisted entry for this property+strategy, re-use it
  const [inputs, setInputs] = useState<Record<string, number>>(() => {
    if (!config) return {};

    // Check for persisted entry
    const persisted = worksheetStore.getEntry(propertyId, strategy);

    const initial: Record<string, number> = {};
    for (const section of config.inputSections) {
      for (const field of section.fields) {
        // Priority: persisted > store defaults > config default
        initial[field.key] =
          persisted?.inputs[field.key] ??
          storeDefaults[field.key] ??
          field.defaultValue;
      }
    }
    const price = parseFloat(String(params.price ?? ''));
    if (!isNaN(price) && price > 0) {
      if ('purchase_price' in initial && !persisted) initial.purchase_price = price;
      if ('contract_price' in initial && !persisted) initial.contract_price = price;
    }
    const rent = parseFloat(String(params.rent ?? ''));
    if (!isNaN(rent) && rent > 0 && 'monthly_rent' in initial && !persisted) {
      initial.monthly_rent = rent;
    }
    const adr = parseFloat(String(params.adr ?? ''));
    if (!isNaN(adr) && adr > 0 && 'average_daily_rate' in initial && !persisted) {
      initial.average_daily_rate = adr;
    }
    const arv = parseFloat(String(params.arv ?? ''));
    if (!isNaN(arv) && arv > 0 && 'arv' in initial && !persisted) {
      initial.arv = arv;
    }
    return initial;
  });

  // Register this worksheet in the persistence store on mount
  useEffect(() => {
    if (config && Object.keys(inputs).length > 0) {
      worksheetStore.initWorksheet(propertyId, strategy, inputs);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // All input sections start expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    if (!config) return {};
    const expanded: Record<string, boolean> = {};
    for (const section of config.inputSections) {
      expanded[section.title] = true;
    }
    return expanded;
  });

  // ── Input updater (also persists to store) ──────────────────────────────
  const updateInput = useCallback((key: string, value: number) => {
    setInputs(prev => {
      const next = { ...prev, [key]: value };
      // Persist to worksheet store
      worksheetStore.updateInput(key, value);
      return next;
    });
  }, [worksheetStore]);

  // ── Debounced API calculation ───────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!config) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setIsCalculating(true);
      setError(null);
      try {
        const payload = preparePayload(strategy, inputs);
        const data = await api.post<Record<string, unknown>>(config.endpoint, payload);
        setResults(data);
        // Also persist inputs + results snapshot to store
        worksheetStore.initWorksheet(propertyId, strategy, inputs);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message || 'Calculation failed');
      } finally {
        setIsCalculating(false);
      }
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [inputs, config, strategy]);

  // ── Section toggle ──────────────────────────────────────────────────────
  const toggleSection = useCallback((title: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
  }, []);

  // ── Tab switch ──────────────────────────────────────────────────────────
  const switchTab = useCallback((tab: 'inputs' | 'results') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);

  // ── Unknown strategy guard ──────────────────────────────────────────────
  if (!config) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }}>
        <Ionicons name={'alert-circle-outline' as any} size={48} color={mutedColor} />
        <Text style={{ color: textColor, fontSize: 18, fontWeight: '600', marginTop: 12 }}>
          Unknown Strategy
        </Text>
        <Text style={{ color: mutedColor, fontSize: 14, marginTop: 4 }}>
          "{params.strategy}" is not a valid strategy.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: accentColor, borderRadius: 10 }}
        >
          <Text style={{ color: '#ffffff', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Derived: strategy color for accents ─────────────────────────────────
  const strategyColor = config.color;

  if (!isValidStrategy(params.strategy)) return <InvalidParamFallback message="Unknown strategy" />;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: cardBg,
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
        }}
      >
        {/* Back + Title row */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: inputBg,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <Ionicons name={'chevron-back' as any} size={20} color={textColor} />
          </TouchableOpacity>

          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: `${strategyColor}18`,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 10,
            }}
          >
            <Ionicons name={config.icon as any} size={20} color={strategyColor} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: textColor }}>
              {config.label}
            </Text>
            {address ? (
              <Text
                numberOfLines={1}
                style={{ fontSize: 13, color: mutedColor, marginTop: 1 }}
              >
                {address}{subtitle ? `  ·  ${subtitle}` : ''}
              </Text>
            ) : null}
          </View>

          {isCalculating && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: `${strategyColor}18`,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
              }}
            >
              <ActivityIndicator size="small" color={strategyColor} />
              <Text style={{ color: strategyColor, fontSize: 11, fontWeight: '600', marginLeft: 5 }}>
                Calculating
              </Text>
            </View>
          )}
        </View>

        {/* ── Tab Bar ───────────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            marginTop: 14,
            backgroundColor: inputBg,
            borderRadius: 12,
            padding: 3,
          }}
        >
          <TouchableOpacity
            onPress={() => switchTab('inputs')}
            activeOpacity={0.7}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: 10,
              backgroundColor: activeTab === 'inputs' ? accentColor : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
            }}
          >
            <Ionicons
              name={'create-outline' as any}
              size={15}
              color={activeTab === 'inputs' ? '#ffffff' : mutedColor}
              style={{ marginRight: 5 }}
            />
            <Text
              style={{
                color: activeTab === 'inputs' ? '#ffffff' : mutedColor,
                fontWeight: '600',
                fontSize: 14,
              }}
            >
              Inputs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => switchTab('results')}
            activeOpacity={0.7}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: 10,
              backgroundColor: activeTab === 'results' ? accentColor : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
            }}
          >
            <Ionicons
              name={'analytics-outline' as any}
              size={15}
              color={activeTab === 'results' ? '#ffffff' : mutedColor}
              style={{ marginRight: 5 }}
            />
            <Text
              style={{
                color: activeTab === 'results' ? '#ffffff' : mutedColor,
                fontWeight: '600',
                fontSize: 14,
              }}
            >
              Results
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {activeTab === 'inputs' ? (
          /* ── Inputs Tab ──────────────────────────────────────────────── */
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {config.inputSections.map(section => (
              <View
                key={section.title}
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 14,
                  marginBottom: 14,
                  borderWidth: 1,
                  borderColor,
                  overflow: 'hidden',
                }}
              >
                {/* Section header */}
                <TouchableOpacity
                  onPress={() => toggleSection(section.title)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: textColor }}>
                    {section.title}
                  </Text>
                  <Ionicons
                    name={expandedSections[section.title] ? 'chevron-up' as any : 'chevron-down' as any}
                    size={18}
                    color={mutedColor}
                  />
                </TouchableOpacity>

                {/* Fields */}
                {expandedSections[section.title] && (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                    {section.fields.map((field, idx) => (
                      <View
                        key={field.key}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 10,
                          borderTopWidth: idx === 0 ? 1 : 0,
                          borderTopColor: borderColor,
                          borderBottomWidth: idx < section.fields.length - 1 ? 1 : 0,
                          borderBottomColor: borderColor,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            color: textColor,
                            flex: 1,
                            marginRight: 12,
                          }}
                          numberOfLines={1}
                        >
                          {field.label}
                        </Text>

                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: inputBg,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor,
                            paddingHorizontal: 10,
                            minWidth: 120,
                          }}
                        >
                          {field.format === 'currency' && (
                            <Text style={{ color: mutedColor, fontSize: 14, marginRight: 2 }}>$</Text>
                          )}
                          <TextInput
                            style={{
                              flex: 1,
                              fontSize: 14,
                              fontWeight: '500',
                              color: textColor,
                              paddingVertical: Platform.OS === 'ios' ? 10 : 7,
                              textAlign: 'right',
                              minWidth: 60,
                            }}
                            value={formatInputDisplay(inputs[field.key] ?? 0, field.format)}
                            onChangeText={text => {
                              updateInput(field.key, parseInputValue(text, field.format));
                            }}
                            keyboardType="decimal-pad"
                            returnKeyType="done"
                            placeholder="0"
                            placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                            selectTextOnFocus
                          />
                          {field.format === 'percent' && (
                            <Text style={{ color: mutedColor, fontSize: 14, marginLeft: 2 }}>%</Text>
                          )}
                          {field.format === 'months' && (
                            <Text style={{ color: mutedColor, fontSize: 12, marginLeft: 4 }}>mo</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          /* ── Results Tab ─────────────────────────────────────────────── */
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Error state */}
            {error && !isCalculating && (
              <View
                style={{
                  backgroundColor: '#fef2f2',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Ionicons name={'alert-circle' as any} size={20} color="#ef4444" />
                <Text style={{ color: '#b91c1c', fontSize: 14, marginLeft: 8, flex: 1 }}>
                  {error}
                </Text>
              </View>
            )}

            {/* Loading placeholder */}
            {!results && isCalculating && (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <ActivityIndicator size="large" color={strategyColor} />
                <Text style={{ color: mutedColor, fontSize: 14, marginTop: 12 }}>
                  Calculating results…
                </Text>
              </View>
            )}

            {/* Empty state (no results yet, not loading) */}
            {!results && !isCalculating && !error && (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Ionicons name={'calculator-outline' as any} size={48} color={mutedColor} />
                <Text style={{ color: mutedColor, fontSize: 15, marginTop: 12, textAlign: 'center' }}>
                  Switch to Inputs and enter your deal numbers to see results.
                </Text>
              </View>
            )}

            {/* Results content */}
            {results && (
              <>
                {/* ── Hero KPI Cards ───────────────────────────────────── */}
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    marginHorizontal: -5,
                    marginBottom: 10,
                  }}
                >
                  {config.heroKeys.map(key => {
                    const metric = findMetric(config, key);
                    if (!metric) return null;
                    const value = results[key];
                    const color = getValueColor(value, metric.format, accentColor);
                    const isScore = metric.format === 'score';

                    return (
                      <View key={key} style={{ width: '50%', padding: 5 }}>
                        <View
                          style={{
                            backgroundColor: cardBg,
                            borderRadius: 14,
                            padding: 14,
                            borderWidth: 1,
                            borderColor: isScore ? strategyColor : borderColor,
                            ...(isScore ? { borderWidth: 2 } : {}),
                          }}
                        >
                          <Text
                            numberOfLines={1}
                            style={{ fontSize: 12, color: mutedColor, fontWeight: '500', marginBottom: 6 }}
                          >
                            {metric.label}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={{
                              fontSize: 22,
                              fontWeight: '800',
                              color: color || textColor,
                            }}
                          >
                            {formatHeroValue(value, metric.format)}
                          </Text>
                          {isScore && (
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '600',
                                color: color || mutedColor,
                                marginTop: 2,
                              }}
                            >
                              {getScoreLabel(Number(value) || 0)}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* ── Result Sections ──────────────────────────────────── */}
                {config.resultSections.map(section => {
                  const isDealScoreSection =
                    section.metrics.length === 1 && section.metrics[0].format === 'score';

                  // Deal score gets a special gauge treatment
                  if (isDealScoreSection) {
                    const scoreVal = Number(results[section.metrics[0].key]) || 0;
                    const scoreColor = getValueColor(scoreVal, 'score', accentColor) || mutedColor;
                    const pct = Math.min(Math.max(scoreVal, 0), 100);

                    return (
                      <View
                        key={section.title}
                        style={{
                          backgroundColor: cardBg,
                          borderRadius: 14,
                          padding: 18,
                          marginBottom: 14,
                          borderWidth: 1,
                          borderColor,
                        }}
                      >
                        {/* Section header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                          <View
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              backgroundColor: `${strategyColor}18`,
                              justifyContent: 'center',
                              alignItems: 'center',
                              marginRight: 10,
                            }}
                          >
                            <Ionicons name={section.icon as any} size={16} color={strategyColor} />
                          </View>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: textColor }}>
                            {section.title}
                          </Text>
                        </View>

                        {/* Score display */}
                        <View style={{ alignItems: 'center', marginBottom: 12 }}>
                          <Text style={{ fontSize: 48, fontWeight: '800', color: scoreColor }}>
                            {Math.round(scoreVal)}
                          </Text>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: scoreColor, marginTop: -2 }}>
                            {getScoreLabel(scoreVal)}
                          </Text>
                        </View>

                        {/* Gauge bar */}
                        <View
                          style={{
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
                            overflow: 'hidden',
                          }}
                        >
                          <View
                            style={{
                              width: `${pct}%`,
                              height: 10,
                              borderRadius: 5,
                              backgroundColor: scoreColor,
                            }}
                          />
                        </View>

                        {/* Scale labels */}
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            marginTop: 6,
                          }}
                        >
                          <Text style={{ fontSize: 10, color: mutedColor }}>0</Text>
                          <Text style={{ fontSize: 10, color: mutedColor }}>25</Text>
                          <Text style={{ fontSize: 10, color: mutedColor }}>50</Text>
                          <Text style={{ fontSize: 10, color: mutedColor }}>75</Text>
                          <Text style={{ fontSize: 10, color: mutedColor }}>100</Text>
                        </View>
                      </View>
                    );
                  }

                  // Standard metric section
                  return (
                    <View
                      key={section.title}
                      style={{
                        backgroundColor: cardBg,
                        borderRadius: 14,
                        padding: 16,
                        marginBottom: 14,
                        borderWidth: 1,
                        borderColor,
                      }}
                    >
                      {/* Section header */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginBottom: 12,
                          paddingBottom: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: borderColor,
                        }}
                      >
                        <View
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            backgroundColor: `${strategyColor}18`,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 10,
                          }}
                        >
                          <Ionicons name={section.icon as any} size={16} color={strategyColor} />
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: textColor }}>
                          {section.title}
                        </Text>
                      </View>

                      {/* Metrics */}
                      {section.metrics.map((metric, idx) => {
                        const value = results[metric.key];
                        const valueColor = getValueColor(value, metric.format, accentColor);

                        return (
                          <View
                            key={metric.key}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingVertical: 10,
                              borderBottomWidth: idx < section.metrics.length - 1 ? 1 : 0,
                              borderBottomColor: borderColor,
                            }}
                          >
                            <Text style={{ fontSize: 14, color: mutedColor, flex: 1 }}>
                              {metric.label}
                            </Text>
                            <Text
                              style={{
                                fontSize: 15,
                                fontWeight: '600',
                                color: valueColor || textColor,
                              }}
                            >
                              {formatResultValue(value, metric.format)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}
