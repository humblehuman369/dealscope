"""Add deal_maker_record column to saved_properties

This migration adds the central DealMakerRecord column which replaces
custom_assumptions and worksheet_assumptions as the single source of truth
for Deal Maker data.

IMPORTANT: This migration performs a DATA MIGRATION and is IRREVERSIBLE.
The downgrade will DROP user financial data stored in deal_maker_record.
Before running downgrade in production:
  1. Export deal_maker_record data for all affected rows
  2. Notify users of potential data loss
  3. Consider if original custom_assumptions/worksheet_assumptions can be restored

Revision ID: 20260130_0001
Revises: 20260122_0001
Create Date: 2026-01-30 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '20260130_0001'
down_revision = '20260122_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add deal_maker_record column to saved_properties table."""
    
    # Step 1: Add the new column
    op.add_column(
        'saved_properties',
        sa.Column('deal_maker_record', JSON, nullable=True)
    )
    
    # Step 2: Migrate existing data
    # This converts existing custom_assumptions and worksheet_assumptions
    # into the new DealMakerRecord format
    connection = op.get_bind()
    
    # Get all saved properties with existing assumptions
    result = connection.execute(text("""
        SELECT id, property_data_snapshot, custom_assumptions, worksheet_assumptions, address_zip
        FROM saved_properties
        WHERE (custom_assumptions IS NOT NULL AND custom_assumptions != '{}')
           OR (worksheet_assumptions IS NOT NULL AND worksheet_assumptions != '{}')
    """))
    
    for row in result:
        property_id = row[0]
        snapshot = row[1] or {}
        custom = row[2] or {}
        worksheet = row[3] or {}
        zip_code = row[4]
        
        # Extract values from snapshot
        list_price = snapshot.get('listPrice') or snapshot.get('list_price') or 0
        rent_estimate = snapshot.get('monthlyRent') or snapshot.get('rent_estimate') or 0
        property_taxes = snapshot.get('propertyTaxes') or snapshot.get('property_taxes') or 0
        insurance = snapshot.get('insurance') or 0
        sqft = snapshot.get('sqft') or snapshot.get('livingArea')
        beds = snapshot.get('bedrooms') or snapshot.get('beds')
        baths = snapshot.get('bathrooms') or snapshot.get('baths')
        year_built = snapshot.get('yearBuilt') or snapshot.get('year_built')
        
        # Extract user adjustments from worksheet_assumptions (preferred) or custom_assumptions
        buy_price = worksheet.get('purchasePrice') or custom.get('ltr', {}).get('purchase_price') or list_price
        down_pct = worksheet.get('downPaymentPct') or 0.20
        closing_pct = worksheet.get('closingCostsPct') or 0.03
        interest = worksheet.get('interestRate') or 0.06
        term = worksheet.get('loanTermYears') or 30
        rehab = worksheet.get('rehabCosts') or 0
        arv = worksheet.get('arv') or list_price
        rent = worksheet.get('monthlyRent') or rent_estimate
        vacancy = worksheet.get('vacancyRate') or 0.01
        maint = worksheet.get('maintenancePct') or 0.05
        mgmt = worksheet.get('managementPct') or 0.00
        taxes = worksheet.get('propertyTaxes') or property_taxes
        ins = worksheet.get('insurance') or insurance
        hoa = worksheet.get('hoaFees') or 0
        
        # Build the DealMakerRecord
        deal_maker_record = {
            'list_price': list_price,
            'rent_estimate': rent_estimate,
            'property_taxes': property_taxes,
            'insurance': insurance,
            'arv_estimate': arv,
            'sqft': sqft,
            'bedrooms': beds,
            'bathrooms': baths,
            'year_built': year_built,
            'property_type': snapshot.get('propertyType'),
            'initial_assumptions': {
                'down_payment_pct': 0.20,
                'closing_costs_pct': 0.03,
                'interest_rate': 0.06,
                'loan_term_years': 30,
                'vacancy_rate': 0.01,
                'maintenance_pct': 0.05,
                'management_pct': 0.00,
                'insurance_pct': 0.01,
                'capex_pct': 0.05,
                'appreciation_rate': 0.05,
                'rent_growth_rate': 0.05,
                'expense_growth_rate': 0.03,
                'zip_code': zip_code,
            },
            'buy_price': buy_price,
            'down_payment_pct': down_pct,
            'closing_costs_pct': closing_pct,
            'interest_rate': interest,
            'loan_term_years': term,
            'rehab_budget': rehab,
            'arv': arv,
            'monthly_rent': rent,
            'other_income': 0,
            'vacancy_rate': vacancy,
            'maintenance_pct': maint,
            'management_pct': mgmt,
            'capex_pct': 0.05,
            'annual_property_tax': taxes,
            'annual_insurance': ins,
            'monthly_hoa': hoa / 12 if hoa > 100 else hoa,  # Convert annual to monthly if needed
            'monthly_utilities': 0,
            'cached_metrics': None,  # Will be calculated on first load
            'version': 1,
        }
        
        # Update the record
        import json
        connection.execute(
            text("""
                UPDATE saved_properties 
                SET deal_maker_record = :record 
                WHERE id = :id
            """),
            {'record': json.dumps(deal_maker_record), 'id': property_id}
        )
    
    print(f"Migrated deal_maker_record for existing properties")


def downgrade() -> None:
    """
    Remove deal_maker_record column from saved_properties table.
    
    WARNING: This is a DESTRUCTIVE operation that will permanently delete
    user financial data stored in deal_maker_record. The original
    custom_assumptions and worksheet_assumptions columns may not contain
    the most recent user edits.
    
    Before running this downgrade in production:
    1. Create a backup: SELECT id, deal_maker_record FROM saved_properties WHERE deal_maker_record IS NOT NULL;
    2. Verify custom_assumptions/worksheet_assumptions contain acceptable fallback data
    3. Notify affected users of potential data loss
    """
    import os
    
    # Safety check: require explicit confirmation in production
    if os.environ.get('ENVIRONMENT', 'development').lower() == 'production':
        confirm = os.environ.get('CONFIRM_DESTRUCTIVE_MIGRATION', '')
        if confirm != 'YES_I_UNDERSTAND_DATA_WILL_BE_LOST':
            raise RuntimeError(
                "DESTRUCTIVE MIGRATION: This downgrade will permanently delete deal_maker_record data. "
                "Set CONFIRM_DESTRUCTIVE_MIGRATION='YES_I_UNDERSTAND_DATA_WILL_BE_LOST' to proceed."
            )
    
    print("WARNING: Dropping deal_maker_record column - user financial data will be lost!")
    op.drop_column('saved_properties', 'deal_maker_record')
