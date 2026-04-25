#!/usr/bin/env python3
"""
Property cache invalidation for diagnostics (matches backend CacheService.generate_key).

Usage:
  # Print exact Redis keys for one or more address strings
  python scripts/diagnostics/flush_property_cache.py \\
    "3783 Moon Bay Circle, Wellington, FL 33414" \\
    "3783 Moon Bay Cir, Wellington, FL 33414" \\
    "3783 Moon Bay Circle, Wellington, FL 33414, USA"

  # Delete those keys in Redis (local or when REDIS_URL is set)
  python scripts/diagnostics/flush_property_cache.py --redis-del \\
    "3783 Moon Bay Circle, Wellington, FL 33414" ...

  # Call admin API (same as DELETE /api/v1/admin/cache/property?address=...)
  # Requires admin JWT with admin:manage and user with that permission
  API_BASE_URL=https://api.example.com \\
  ADMIN_BEARER_TOKEN=eyJ... \\
  python scripts/diagnostics/flush_property_cache.py --api

Environment:
  REDIS_URL   - e.g. redis://localhost:6379/0 (default for --redis-del)
  API_BASE_URL - Base URL of FastAPI app (no trailing slash), e.g. https://api.dealgapiq.com
  ADMIN_BEARER_TOKEN - JWT for Authorization: Bearer

This script is idempotent: missing keys are fine.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import re
import sys
import urllib.parse


def generate_cache_key(prefix: str, identifier: str) -> str:
    """Mirror backend app.services.cache_service.CacheService.generate_key."""
    normalized = re.sub(r"\s+", " ", (identifier or "").strip().lower())
    normalized = re.sub(r",\s*usa$", "", normalized)
    hash_part = hashlib.sha256(normalized.encode()).hexdigest()[:16]
    return f"{prefix}:{hash_part}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Property cache key diagnostics and flush")
    parser.add_argument(
        "addresses",
        nargs="*",
        help="Address strings to resolve (if empty, uses Wellington plan defaults)",
    )
    parser.add_argument(
        "--redis-del",
        action="store_true",
        help="Delete property:* keys in Redis (requires redis package + REDIS_URL)",
    )
    parser.add_argument(
        "--api",
        action="store_true",
        help="Call DELETE /api/v1/admin/cache/property for each address (requires API_BASE_URL + ADMIN_BEARER_TOKEN)",
    )
    args = parser.parse_args()

    defaults = [
        "3783 Moon Bay Circle, Wellington, FL 33414",
        "3783 Moon Bay Cir, Wellington, FL 33414",
        "3783 Moon Bay Circle, Wellington, FL 33414, USA",
    ]
    addresses = args.addresses if args.addresses else defaults

    print("Address → normalized (for hash) → Redis key\n")
    for raw in addresses:
        norm = re.sub(r"\s+", " ", (raw or "").strip().lower())
        norm = re.sub(r",\s*usa$", "", norm)
        key = generate_cache_key("property", raw)
        print(f"  IN:  {raw!r}")
        print(f"  NORM: {norm!r}")
        print(f"  KEY:  {key}")
        print()

    if args.redis_del:
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        try:
            import redis
        except ImportError:
            print("Install redis: pip install redis", file=sys.stderr)
            return 1
        r = redis.from_url(redis_url, decode_responses=True)
        for raw in addresses:
            k = generate_cache_key("property", raw)
            n = r.delete(k)
            print(f"REDIS DEL {k} → deleted={n}", flush=True)
        return 0

    if args.api:
        import urllib.request

        base = (os.environ.get("API_BASE_URL") or "").rstrip("/")
        token = os.environ.get("ADMIN_BEARER_TOKEN") or ""
        if not base or not token:
            print("Set API_BASE_URL and ADMIN_BEARER_TOKEN for --api", file=sys.stderr)
            return 1
        for raw in addresses:
            q = urllib.parse.urlencode({"address": raw})
            url = f"{base}/api/v1/admin/cache/property?{q}"
            req = urllib.request.Request(
                url,
                method="DELETE",
                headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            )
            try:
                with urllib.request.urlopen(req, timeout=60) as resp:
                    body = resp.read().decode()
                    print(f"OK {url}\n{body}")
            except Exception as e:
                print(f"FAIL {url}\n{e}", file=sys.stderr)
                return 1
        return 0

    print("Dry run only. To delete keys: add --redis-del (and REDIS_URL) or --api (and API_BASE_URL + ADMIN_BEARER_TOKEN).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
