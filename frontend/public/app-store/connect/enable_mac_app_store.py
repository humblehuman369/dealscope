#!/usr/bin/env python3
"""Opt DealGapIQ into the Mac App Store as an iPhone/iPad app on Apple Silicon.

PUBLIC API LIMITATION:
  Apple no longer exposes iosAppToMacAppStoreOptInSetting on the public ASC API.
  If this script exits with a relationship error, use App Store Connect UI:
  Pricing and Availability → iPhone and iPad Apps on Apple Silicon Mac.
  (Phase 1 is already live on the public Mac App Store listing.)

Uses ASC credentials from /Users/bradgeisen/play-in-432/.secrets/asc.env
(or ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_PATH env vars).

Usage:
  python3 enable_mac_app_store.py
  python3 enable_mac_app_store.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

import jwt
import requests

APP_APPLE_ID = "6759636866"
API = "https://api.appstoreconnect.apple.com"
MAC_INCLUDE = "iosAppToMacAppStoreOptInSetting"
MAC_ATTR = "isOptedInToDistributeIosAppOnMacAppStore"


def load_asc_env() -> tuple[str, str, Path]:
    env_file = Path("/Users/bradgeisen/play-in-432/.secrets/asc.env")
    if env_file.is_file():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"'))
    return (
        os.environ["ASC_KEY_ID"],
        os.environ["ASC_ISSUER_ID"],
        Path(os.environ["ASC_KEY_PATH"]),
    )


def client_token(key_id: str, issuer: str, key_path: Path) -> str:
    now = int(time.time())
    return jwt.encode(
        {
            "iss": issuer,
            "iat": now,
            "exp": now + 1200,
            "aud": "appstoreconnect-v1",
        },
        key_path.read_text(),
        algorithm="ES256",
        headers={"kid": key_id, "typ": "JWT"},
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--opt-out", action="store_true", help="Disable Mac App Store listing")
    args = parser.parse_args()

    key_id, issuer, key_path = load_asc_env()
    session = requests.Session()
    session.headers.update(
        {
            "Authorization": f"Bearer {client_token(key_id, issuer, key_path)}",
            "Content-Type": "application/json",
        }
    )

    desired = not args.opt_out
    print(f"App: {APP_APPLE_ID}")
    print(f"Desired Mac App Store availability: {desired}")

    resp = session.get(
        f"{API}/v1/apps/{APP_APPLE_ID}",
        params={"include": MAC_INCLUDE},
        timeout=60,
    )
    if resp.status_code >= 400:
        print(f"GET app failed: {resp.status_code}\n{resp.text[:2000]}", file=sys.stderr)
        return 1

    payload = resp.json()
    included = payload.get("included") or []
    setting = next((i for i in included if MAC_ATTR in (i.get("attributes") or {})), None)
    if setting is None and included:
        # Some API versions nest the flag under a differently named type.
        setting = included[0]

    if setting is None:
        print(
            "Mac opt-in setting was not returned by the API.\n"
            "Enable manually:\n"
            "  App Store Connect → DealGapIQ → Pricing and Availability →\n"
            "  iPhone and iPad Apps on Apple Silicon Mac → Make this app available\n",
            file=sys.stderr,
        )
        print("Raw relationships:", sorted((payload.get("data") or {}).get("relationships", {})))
        return 2

    current = (setting.get("attributes") or {}).get(MAC_ATTR)
    print(f"Current: {setting['type']} id={setting['id']} {MAC_ATTR}={current}")

    if current is desired:
        print("Already in the desired state. Nothing to do.")
        return 0

    if args.dry_run:
        print(f"dry-run: would PATCH {MAC_ATTR}={desired}")
        return 0

    patch = session.patch(
        f"{API}/v1/{setting['type']}/{setting['id']}",
        json={
            "data": {
                "type": setting["type"],
                "id": setting["id"],
                "attributes": {MAC_ATTR: desired},
            }
        },
        timeout=60,
    )
    print(f"PATCH -> {patch.status_code}")
    if patch.status_code >= 400:
        print(patch.text[:3000], file=sys.stderr)
        return 1

    updated = (patch.json().get("data") or {}).get("attributes") or {}
    print(f"Updated {MAC_ATTR}={updated.get(MAC_ATTR)}")
    print(
        "\nDone. Confirm in App Store Connect → Pricing and Availability →\n"
        "iPhone and iPad Apps on Apple Silicon Mac."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
