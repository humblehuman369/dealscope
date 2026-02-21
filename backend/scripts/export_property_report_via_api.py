#!/usr/bin/env python3
"""
Request a report of the data we receive from RentCast and AXESSO for a property.
Calls the **deployed** backend (e.g. Railway), which has the API keys, and saves the Excel report.

Usage (from backend directory):
  BACKEND_URL=https://your-app.railway.app python scripts/export_property_report_via_api.py "3788 Moon Bay Cir, Wellington, FL 33414"
  # or set BACKEND_URL in .env

  python scripts/export_property_report_via_api.py "3788 Moon Bay Cir" "Wellington" "FL" "33414"

Output: one Excel file (Property_Data_Report_<address>_<timestamp>.xlsx) with two sheets:
        RentCast and AXESSO — the data we receive from each for that property.
"""
import os
import sys
from pathlib import Path

try:
    import httpx
except ImportError:
    print("Install httpx: pip install httpx")
    sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print("Usage: BACKEND_URL=<url> python scripts/export_property_report_via_api.py <address> [city] [state] [zip]")
        print("Example: BACKEND_URL=https://your-app.railway.app python scripts/export_property_report_via_api.py \"3788 Moon Bay Cir\" Wellington FL 33414")
        sys.exit(1)

    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")

    base_url = os.environ.get("BACKEND_URL", "").rstrip("/")
    if not base_url:
        print("Set BACKEND_URL to your deployed backend (e.g. https://your-app.railway.app)")
        sys.exit(1)

    parts = [p.strip() for p in sys.argv[1:]]
    address = parts[0] if parts else ""
    city = parts[1] if len(parts) > 1 else ""
    state = parts[2] if len(parts) > 2 else ""
    zip_code = parts[3] if len(parts) > 3 else ""

    payload = {"address": address}
    if city:
        payload["city"] = city
    if state:
        payload["state"] = state
    if zip_code:
        payload["zip_code"] = zip_code

    url = f"{base_url}/api/v1/properties/export-report"
    print(f"Requesting: {url}")
    print(f"Address: {address}, {city}, {state} {zip_code}".replace(", ,", ",").strip())

    with httpx.Client(timeout=120.0) as client:
        resp = client.post(url, json=payload)
        resp.raise_for_status()

    content_type = resp.headers.get("content-type", "")
    if "spreadsheet" not in content_type and "octet-stream" not in content_type:
        print(f"Unexpected response: {content_type}")
        print(resp.text[:500])
        sys.exit(1)

    backend_dir = Path(__file__).resolve().parent.parent
    filename = resp.headers.get("content-disposition", "").split("filename=")[-1].strip('"') or "Property_Data_Report.xlsx"
    out_path = backend_dir / filename
    out_path.write_bytes(resp.content)
    print(f"Saved: {out_path}")
    return str(out_path)


if __name__ == "__main__":
    main()
