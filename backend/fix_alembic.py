#!/usr/bin/env python3
"""Fix alembic version mismatch before starting the server."""
import os
import sys

def fix_alembic_version():
    """Update alembic_version if it has an invalid revision ID."""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("No DATABASE_URL found, skipping alembic fix")
        return
    
    # Convert postgres:// to postgresql:// for SQLAlchemy
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    try:
        from sqlalchemy import create_engine, text
        
        engine = create_engine(database_url)
        with engine.connect() as conn:
            # Check current version
            result = conn.execute(text("SELECT version_num FROM alembic_version"))
            row = result.fetchone()
            
            if row:
                current_version = row[0]
                print(f"Current alembic version: {current_version}")
                
                # Valid revision IDs in our migration chain
                valid_revisions = {'0001', '0002', '20250112_0001', '20250113_0001', '20260122_0001'}
                
                if current_version not in valid_revisions:
                    print(f"Invalid version '{current_version}', updating to '20260122_0001'")
                    conn.execute(text("UPDATE alembic_version SET version_num = '20260122_0001'"))
                    conn.commit()
                    print("Alembic version fixed!")
                else:
                    print("Alembic version is valid")
            else:
                print("No alembic version found in database")
                
    except Exception as e:
        print(f"Warning: Could not check/fix alembic version: {e}")
        # Don't fail - let the app try to start anyway

if __name__ == "__main__":
    fix_alembic_version()
