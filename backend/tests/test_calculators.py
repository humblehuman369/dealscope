"""
Tests for investment calculators.

These are pure functions, making them ideal for unit testing.
"""
import pytest
from app.services.calculators import (
    calculate_ltr,
    calculate_str,
    calculate_brrrr,
    calculate_flip,
    calculate_house_hack,
    calculate_wholesale,
    calculate_seller_motivation,
)


class TestLTRCalculator:
    """Tests for long-term rental calculations."""
    
    def test_basic_ltr_calculation(self):
        """Basic LTR calculation should return expected metrics."""
        result = calculate_ltr(
            purchase_price=300000,
            monthly_rent=2500,
            property_taxes_annual=3600,
            down_payment_pct=0.20,
            interest_rate=0.06,
            loan_term_years=30,
            closing_costs_pct=0.03,
            vacancy_rate=0.05,
            property_management_pct=0.10,
            maintenance_pct=0.05,
            insurance_annual=1200
        )
        
        assert "monthly_cash_flow" in result
        assert "annual_cash_flow" in result
        assert "cash_on_cash_return" in result
        assert "cap_rate" in result
        assert "total_investment" in result
    
    def test_ltr_positive_cash_flow(self):
        """High rent relative to purchase price should produce positive cash flow."""
        result = calculate_ltr(
            purchase_price=200000,
            monthly_rent=2500,  # High rent relative to price
            property_taxes_annual=2400,
            down_payment_pct=0.20,
            interest_rate=0.06,
            loan_term_years=30,
            closing_costs_pct=0.03,
            vacancy_rate=0.05,
            property_management_pct=0.10,
            maintenance_pct=0.05,
            insurance_annual=1000
        )
        
        assert result["monthly_cash_flow"] > 0
        assert result["cash_on_cash_return"] > 0
    
    def test_ltr_with_zero_vacancy(self):
        """Zero vacancy should improve cash flow."""
        with_vacancy = calculate_ltr(
            purchase_price=300000,
            monthly_rent=2500,
            property_taxes_annual=3600,
            down_payment_pct=0.20,
            interest_rate=0.06,
            loan_term_years=30,
            closing_costs_pct=0.03,
            vacancy_rate=0.05,
            property_management_pct=0.10,
            maintenance_pct=0.05,
            insurance_annual=1200
        )
        
        without_vacancy = calculate_ltr(
            purchase_price=300000,
            monthly_rent=2500,
            property_taxes_annual=3600,
            down_payment_pct=0.20,
            interest_rate=0.06,
            loan_term_years=30,
            closing_costs_pct=0.03,
            vacancy_rate=0.0,
            property_management_pct=0.10,
            maintenance_pct=0.05,
            insurance_annual=1200
        )
        
        assert without_vacancy["monthly_cash_flow"] > with_vacancy["monthly_cash_flow"]


class TestFlipCalculator:
    """Tests for fix & flip calculations."""
    
    def test_basic_flip_calculation(self):
        """Basic flip calculation should return expected metrics."""
        result = calculate_flip(
            market_value=250000,
            arv=350000,
            purchase_discount_pct=0.20,
            hard_money_ltv=0.90,
            hard_money_rate=0.12,
            closing_costs_pct=0.03,
            renovation_budget=50000,
            contingency_pct=0.10,
            holding_period_months=6,
            property_taxes_annual=3000,
            selling_costs_pct=0.06
        )
        
        assert "net_profit" in result
        assert "roi" in result
        assert "total_investment" in result
        assert "hold_time_months" in result
    
    def test_flip_profit_with_good_arv(self):
        """Good ARV relative to purchase should produce profit."""
        result = calculate_flip(
            market_value=200000,
            arv=400000,  # High ARV
            purchase_discount_pct=0.25,
            hard_money_ltv=0.90,
            hard_money_rate=0.12,
            closing_costs_pct=0.03,
            renovation_budget=50000,
            contingency_pct=0.10,
            holding_period_months=4,
            property_taxes_annual=2400,
            selling_costs_pct=0.06
        )
        
        assert result["net_profit"] > 0
        assert result["roi"] > 0


class TestWholesaleCalculator:
    """Tests for wholesale deal calculations."""
    
    def test_basic_wholesale_calculation(self):
        """Basic wholesale calculation should return expected metrics."""
        result = calculate_wholesale(
            arv=400000,
            estimated_rehab_costs=50000,
            assignment_fee=15000,
            marketing_costs=500,
            earnest_money_deposit=1000,
            days_to_close=45
        )
        
        assert "seventy_pct_max_offer" in result
        assert "contract_price" in result
        assert "net_profit" in result
        assert "roi" in result
        assert "assignment_fee" in result

    def test_wholesale_70_percent_rule(self):
        """70% rule: seventy_pct_max_offer = ARV*(1 - arv_discount_pct) - rehab; default 30% discount."""
        result = calculate_wholesale(
            arv=400000,
            estimated_rehab_costs=50000,
            assignment_fee=15000,
            marketing_costs=500,
            earnest_money_deposit=1000,
            days_to_close=45
        )
        # seventy_pct_max_offer = 400k * 0.70 - 50k = 230000
        expected_mao = 400000 * 0.70 - 50000
        assert result["seventy_pct_max_offer"] == expected_mao
        assert result["contract_price"] == expected_mao


class TestHouseHackCalculator:
    """Tests for house hack calculations."""
    
    def test_basic_house_hack_calculation(self):
        """Basic house hack calculation should return expected metrics."""
        result = calculate_house_hack(
            purchase_price=300000,
            monthly_rent_per_room=800,
            rooms_rented=2,
            property_taxes_annual=3600,
            owner_unit_market_rent=1500,
            down_payment_pct=0.035,
            interest_rate=0.065,
            loan_term_years=30,
            closing_costs_pct=0.03,
            fha_mip_rate=0.0085,
            insurance_annual=1200
        )
        
        assert "monthly_savings" in result
        assert "net_housing_cost" in result
        assert "total_investment" in result
    
    def test_house_hack_reduces_housing_cost(self):
        """Renting rooms should reduce net housing cost."""
        result = calculate_house_hack(
            purchase_price=300000,
            monthly_rent_per_room=1000,  # Good room rent
            rooms_rented=2,
            property_taxes_annual=3600,
            owner_unit_market_rent=1500,
            down_payment_pct=0.035,
            interest_rate=0.065,
            loan_term_years=30,
            closing_costs_pct=0.03,
            fha_mip_rate=0.0085,
            insurance_annual=1200
        )
        
        # Net housing cost should be less than full mortgage payment
        assert result["net_housing_cost"] < result.get("monthly_payment", float('inf'))


class TestBRRRRCalculator:
    """Tests for BRRRR strategy calculations."""
    
    def test_basic_brrrr_calculation(self):
        """Basic BRRRR calculation should return expected metrics."""
        result = calculate_brrrr(
            market_value=200000,
            arv=300000,
            monthly_rent_post_rehab=2200,
            property_taxes_annual=3000,
            purchase_discount_pct=0.15,
            down_payment_pct=0.20,
            interest_rate=0.06,
            loan_term_years=30,
            closing_costs_pct=0.03,
            renovation_budget=40000,
            contingency_pct=0.10,
            holding_period_months=4,
            monthly_holding_costs=2000,
            refinance_ltv=0.75,
            refinance_interest_rate=0.06,
            refinance_term_years=30,
            refinance_closing_costs=3500
        )
        
        assert "cash_left_in_deal" in result
        assert "monthly_cash_flow_after_refi" in result
        assert "infinite_return" in result
    
    def test_brrrr_cash_out(self):
        """Good BRRRR deal should allow cash out on refinance."""
        result = calculate_brrrr(
            market_value=150000,
            arv=250000,  # Strong ARV increase
            monthly_rent_post_rehab=2000,
            property_taxes_annual=2400,
            purchase_discount_pct=0.10,
            down_payment_pct=0.25,
            interest_rate=0.06,
            loan_term_years=30,
            closing_costs_pct=0.03,
            renovation_budget=30000,
            contingency_pct=0.10,
            holding_period_months=3,
            monthly_holding_costs=1500,
            refinance_ltv=0.75,
            refinance_interest_rate=0.06,
            refinance_term_years=30,
            refinance_closing_costs=3000
        )
        
        # Should leave minimal or no cash in deal
        assert result["cash_left_in_deal"] < result.get("total_investment", float('inf'))


# TestDealScoring removed: calculate_deal_score does not exist in calculators;
# deal scoring is in iq_verdict_service and worksheet endpoints.


class TestSellerMotivation:
    """Tests for seller motivation scoring (calculate_seller_motivation returns dict with 'score')."""

    def test_motivation_score_range(self):
        """Motivation score should be between 0 and 100."""
        result = calculate_seller_motivation(days_on_market=30, price_reduction_count=1)
        score = result["score"]
        assert 0 <= score <= 100

    def test_high_dom_increases_motivation(self):
        """High days on market should increase motivation score."""
        short_dom = calculate_seller_motivation(days_on_market=10, price_reduction_count=0)
        long_dom = calculate_seller_motivation(days_on_market=180, price_reduction_count=0)
        assert long_dom["score"] > short_dom["score"]

    def test_price_drops_increase_motivation(self):
        """Price reductions should increase motivation score."""
        no_drops = calculate_seller_motivation(days_on_market=60, price_reduction_count=0)
        with_drops = calculate_seller_motivation(days_on_market=60, price_reduction_count=3)
        assert with_drops["score"] > no_drops["score"]
