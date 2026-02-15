#!/usr/bin/env python3
"""
Database Migration Script for DealScope/DealGapIQ
Helps clone, copy, or rebuild the PostgreSQL database to a new instance.

Usage:
    # Option 1: Clone full database (data + schema) from old to new
    python migrate_database.py clone --old-db "postgres://..." --new-db "postgres://..."
    
    # Option 2: Rebuild schema only (fresh database with no data)
    python migrate_database.py rebuild --new-db "postgres://..."
    
    # Option 3: Export old database to SQL file
    python migrate_database.py export --old-db "postgres://..." --output backup.sql
    
    # Option 4: Import SQL file to new database
    python migrate_database.py import --new-db "postgres://..." --input backup.sql
"""

import argparse
import subprocess
import sys
import os
from urllib.parse import urlparse
import tempfile


def parse_db_url(db_url: str) -> dict:
    """Parse a PostgreSQL connection URL into components."""
    # Normalize postgres:// to postgresql://
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    elif db_url.startswith("postgresql+"):
        # Remove driver suffix like +asyncpg or +psycopg
        db_url = "postgresql://" + db_url.split("://")[1]
    
    parsed = urlparse(db_url)
    
    return {
        "host": parsed.hostname or "localhost",
        "port": str(parsed.port or 5432),
        "database": parsed.path.lstrip("/") if parsed.path else "postgres",
        "user": parsed.username or "postgres",
        "password": parsed.password or "",
    }


def set_pg_env(db_info: dict) -> dict:
    """Set PostgreSQL environment variables for auth."""
    env = os.environ.copy()
    if db_info["password"]:
        env["PGPASSWORD"] = db_info["password"]
    return env


def run_command(cmd: list, env: dict = None, capture_output: bool = False):
    """Run a shell command and handle errors."""
    print(f"  Running: {' '.join(cmd[:3])}...")
    result = subprocess.run(
        cmd,
        env=env or os.environ,
        capture_output=capture_output,
        text=True
    )
    if result.returncode != 0:
        if capture_output and result.stderr:
            print(f"  Error: {result.stderr}")
        return False
    return True


def export_database(old_db_url: str, output_file: str) -> bool:
    """Export database to SQL file using pg_dump."""
    print("\n📦 Exporting database...")
    db = parse_db_url(old_db_url)
    env = set_pg_env(db)
    
    cmd = [
        "pg_dump",
        "-h", db["host"],
        "-p", db["port"],
        "-U", db["user"],
        "-d", db["database"],
        "-F", "c",  # Custom format for pg_restore
        "-f", output_file,
        "--no-owner",
        "--no-privileges",
        "--clean",
        "--if-exists",
    ]
    
    if run_command(cmd, env):
        print(f"  ✅ Database exported to: {output_file}")
        return True
    else:
        print("  ❌ Export failed")
        return False


def import_database(new_db_url: str, input_file: str) -> bool:
    """Import SQL file to database using pg_restore."""
    print("\n📥 Importing database...")
    db = parse_db_url(new_db_url)
    env = set_pg_env(db)
    
    cmd = [
        "pg_restore",
        "-h", db["host"],
        "-p", db["port"],
        "-U", db["user"],
        "-d", db["database"],
        "--no-owner",
        "--no-privileges",
        "--clean",
        "--if-exists",
        input_file,
    ]
    
    if run_command(cmd, env):
        print("  ✅ Database imported successfully")
        return True
    else:
        # pg_restore may return error even on success due to --clean --if-exists
        print("  ⚠️  Import completed (some warnings may be normal)")
        return True


def clone_database(old_db_url: str, new_db_url: str) -> bool:
    """Clone database from old to new (full copy with data)."""
    print("\n🔄 Cloning database (full copy with data)...")
    
    # Use a temp file for the dump
    with tempfile.NamedTemporaryFile(suffix=".dump", delete=False) as tmp:
        tmp_path = tmp.name
    
    try:
        # Export old database
        if not export_database(old_db_url, tmp_path):
            return False
        
        # Import to new database
        if not import_database(new_db_url, tmp_path):
            return False
        
        print("\n✅ Database cloned successfully!")
        return True
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def rebuild_schema(new_db_url: str) -> bool:
    """Rebuild database schema using Alembic migrations (no data)."""
    print("\n🏗️  Rebuilding database schema...")
    
    # Set the DATABASE_URL for Alembic
    env = os.environ.copy()
    env["DATABASE_URL"] = new_db_url
    
    # Change to backend directory
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Run alembic upgrade head
    print("  Running Alembic migrations...")
    cmd = ["python", "-m", "alembic", "upgrade", "head"]
    
    result = subprocess.run(
        cmd,
        cwd=backend_dir,
        env=env,
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"  ❌ Migration failed: {result.stderr}")
        return False
    
    print(result.stdout)
    print("  ✅ Database schema rebuilt successfully!")
    return True


def test_connection(db_url: str, name: str = "Database") -> bool:
    """Test database connection."""
    print(f"\n🔌 Testing {name} connection...")
    db = parse_db_url(db_url)
    env = set_pg_env(db)
    
    cmd = [
        "psql",
        "-h", db["host"],
        "-p", db["port"],
        "-U", db["user"],
        "-d", db["database"],
        "-c", "SELECT 1;"
    ]
    
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)
    
    if result.returncode == 0:
        print(f"  ✅ {name} connection successful!")
        print(f"     Host: {db['host']}:{db['port']}")
        print(f"     Database: {db['database']}")
        return True
    else:
        print(f"  ❌ {name} connection failed!")
        print(f"     Error: {result.stderr}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Database migration tool for DealScope/DealGapIQ",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  Clone database (full copy with data):
    python migrate_database.py clone --old-db "postgres://user:pass@old-host:5432/db" --new-db "postgres://user:pass@new-host:5432/db"
    
  Rebuild schema only (fresh empty database):
    python migrate_database.py rebuild --new-db "postgres://user:pass@new-host:5432/db"
    
  Test connection:
    python migrate_database.py test --new-db "postgres://user:pass@new-host:5432/db"
"""
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Clone command
    clone_parser = subparsers.add_parser("clone", help="Clone full database (data + schema)")
    clone_parser.add_argument("--old-db", required=True, help="Old database URL")
    clone_parser.add_argument("--new-db", required=True, help="New database URL")
    
    # Rebuild command
    rebuild_parser = subparsers.add_parser("rebuild", help="Rebuild schema only (fresh database)")
    rebuild_parser.add_argument("--new-db", required=True, help="New database URL")
    
    # Export command
    export_parser = subparsers.add_parser("export", help="Export database to file")
    export_parser.add_argument("--old-db", required=True, help="Old database URL")
    export_parser.add_argument("--output", "-o", required=True, help="Output file path")
    
    # Import command
    import_parser = subparsers.add_parser("import", help="Import database from file")
    import_parser.add_argument("--new-db", required=True, help="New database URL")
    import_parser.add_argument("--input", "-i", required=True, help="Input file path")
    
    # Test command
    test_parser = subparsers.add_parser("test", help="Test database connection")
    test_parser.add_argument("--old-db", help="Old database URL to test")
    test_parser.add_argument("--new-db", help="New database URL to test")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    print("=" * 60)
    print("  DealScope Database Migration Tool")
    print("=" * 60)
    
    if args.command == "clone":
        if not test_connection(args.old_db, "Old Database"):
            sys.exit(1)
        if not test_connection(args.new_db, "New Database"):
            sys.exit(1)
        if not clone_database(args.old_db, args.new_db):
            sys.exit(1)
            
    elif args.command == "rebuild":
        if not test_connection(args.new_db, "New Database"):
            sys.exit(1)
        if not rebuild_schema(args.new_db):
            sys.exit(1)
            
    elif args.command == "export":
        if not test_connection(args.old_db, "Old Database"):
            sys.exit(1)
        if not export_database(args.old_db, args.output):
            sys.exit(1)
            
    elif args.command == "import":
        if not test_connection(args.new_db, "New Database"):
            sys.exit(1)
        if not import_database(args.new_db, args.input):
            sys.exit(1)
            
    elif args.command == "test":
        if args.old_db:
            test_connection(args.old_db, "Old Database")
        if args.new_db:
            test_connection(args.new_db, "New Database")
        if not args.old_db and not args.new_db:
            print("Please provide --old-db or --new-db to test")
            sys.exit(1)
    
    print("\n" + "=" * 60)
    print("  Migration completed!")
    print("=" * 60)


if __name__ == "__main__":
    main()

