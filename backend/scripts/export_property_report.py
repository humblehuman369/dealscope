#!/usr/bin/env python3
"""
One-off script to export property data report (RentCast, AXESSO, Verdict/Strategy) to Excel.
Usage (from backend directory):
  python scripts/export_property_report.py "3788 Moon Bay Cir, Wellington, FL 33414"
  python scripts/export_property_report.py "3788 Moon Bay Cir" "Wellington" "FL" "33414"
Output: Property_Data_<address_slug>_<timestamp>.xlsx in current directory.
Requires .env with RENTCAST_API_KEY and AXESSO_API_KEY (or set in environment).
"""
import asyncio
import os
import sys
from pathlib import Path

# Ensure backend app is on path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

os.chdir(backend_dir)


async def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/export_property_report.py <full_address>")
        print('   or: python scripts/export_property_report.py "3788 Moon Bay Cir, Wellington, FL 33414"')
        sys.exit(1)
    address = ", ".join(a.strip() for a in sys.argv[1:]).strip()
    if not address:
        print("Error: address is required")
        sys.exit(1)

    from dotenv import load_dotenv
    load_dotenv()

    from app.services.property_service import property_service
    from app.services.property_export_service import generate_property_data_excel
    from datetime import datetime, timezone

    print(f"Fetching data for: {address}")
    export_data = await property_service.get_property_export_data(address)
    excel_bytes = generate_property_data_excel(export_data)
    slug = address.replace(" ", "_").replace(",", "")[:40]
    filename = f"Property_Data_{slug}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M')}.xlsx"
    out_path = backend_dir / filename
    out_path.write_bytes(excel_bytes)
    print(f"Wrote: {out_path}")
    return str(out_path)


if __name__ == "__main__":
    asyncio.run(main())
