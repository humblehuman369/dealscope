#!/usr/bin/env python3
"""
One-off script to export property data for audit: one file with RentCast data only,
one file with AXESSO data only.
Usage (from backend directory):
  python scripts/export_property_report.py "3788 Moon Bay Cir, Wellington, FL 33414"
  python scripts/export_property_report.py "3788 Moon Bay Cir" "Wellington" "FL" "33414"
Output (in current directory):
  Property_Data_RentCast_<address_slug>_<timestamp>.xlsx
  Property_Data_AXESSO_<address_slug>_<timestamp>.xlsx
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
    from app.services.property_export_service import generate_rentcast_only_excel, generate_axesso_only_excel
    from datetime import datetime, timezone

    print(f"Fetching data for: {address}")
    export_data = await property_service.get_property_export_data(address)
    slug = address.replace(" ", "_").replace(",", "")[:40]
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M")

    rentcast_bytes = generate_rentcast_only_excel(export_data)
    rentcast_path = backend_dir / f"Property_Data_RentCast_{slug}_{ts}.xlsx"
    rentcast_path.write_bytes(rentcast_bytes)
    print(f"Wrote (RentCast): {rentcast_path}")

    axesso_bytes = generate_axesso_only_excel(export_data)
    axesso_path = backend_dir / f"Property_Data_AXESSO_{slug}_{ts}.xlsx"
    axesso_path.write_bytes(axesso_bytes)
    print(f"Wrote (AXESSO): {axesso_path}")

    return str(rentcast_path), str(axesso_path)


if __name__ == "__main__":
    asyncio.run(main())
