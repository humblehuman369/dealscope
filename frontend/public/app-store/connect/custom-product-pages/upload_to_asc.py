#!/usr/bin/env python3
"""Create DealGapIQ Custom Product Pages in App Store Connect and upload screenshots.

Requires env (or /Users/bradgeisen/play-in-432/.secrets/asc.env):
  ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH

Usage:
  python3 upload_to_asc.py
  python3 upload_to_asc.py --dry-run
"""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import sys
import time
import uuid
from pathlib import Path

import jwt
import requests

THIS_DIR = Path(__file__).resolve().parent
APP_APPLE_ID = "6759636866"
BUNDLE_ID = "com.dealgapiq.mobile"
# 1290×2796 maps to Apple's APP_IPHONE_67 display type
SCREENSHOT_DISPLAY_TYPE = "APP_IPHONE_67"
LOCALE = "en-US"
API = "https://api.appstoreconnect.apple.com"

PAGES = [
    {
        "slug": "deal-gap",
        "name": "Deal Gap",
        "promotional_text": (
            "See the Deal Gap on every US listing. Pre-scored DEAL, MAYBE, or PASS "
            "— then know exactly what to offer. Discovery in seconds."
        ),
    },
    {
        "slug": "foreclosure",
        "name": "Foreclosure & Auction",
        "promotional_text": (
            "Foreclosure, pre-foreclosure, and auction — scored alongside MLS. "
            "See the Deal Gap before you bid. DEAL, MAYBE, or PASS in seconds."
        ),
    },
    {
        "slug": "rental",
        "name": "Rental Cash Flow",
        "promotional_text": (
            "Find cash-flowing rentals fast. Every US listing pre-scored for profit "
            "— Target Buy, Income Value, and live ROI scenarios before you offer."
        ),
    },
    {
        "slug": "flip",
        "name": "Fix & Flip",
        "promotional_text": (
            "Flip with ARV, not guesswork. Pull comps, model rehab, and see profit "
            "live — then get a DEAL, MAYBE, or PASS before you bid."
        ),
    },
    {
        "slug": "competitor",
        "name": "vs Calculators",
        "promotional_text": (
            "Calculators show math. DealGapIQ shows the decision. Pre-scored DEAL, "
            "MAYBE, or PASS — plus the Deal Gap so you know what to offer."
        ),
    },
]


def load_asc_env() -> tuple[str, str, Path]:
    env_file = Path("/Users/bradgeisen/play-in-432/.secrets/asc.env")
    if env_file.is_file():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"'))
    key_id = os.environ["ASC_KEY_ID"]
    issuer = os.environ["ASC_ISSUER_ID"]
    key_path = Path(os.environ["ASC_KEY_PATH"])
    return key_id, issuer, key_path


class AscClient:
    def __init__(self, key_id: str, issuer: str, key_path: Path):
        self.key_id = key_id
        self.issuer = issuer
        self.private_key = key_path.read_text()
        self._token = None
        self._token_exp = 0
        self.session = requests.Session()

    def token(self) -> str:
        now = int(time.time())
        if self._token and now < self._token_exp - 60:
            return self._token
        self._token = jwt.encode(
            {
                "iss": self.issuer,
                "iat": now,
                "exp": now + 1200,
                "aud": "appstoreconnect-v1",
            },
            self.private_key,
            algorithm="ES256",
            headers={"kid": self.key_id, "typ": "JWT"},
        )
        self._token_exp = now + 1200
        return self._token

    def request(self, method: str, path: str, **kwargs) -> dict:
        url = path if path.startswith("http") else f"{API}{path}"
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {self.token()}"
        if "json" in kwargs:
            headers.setdefault("Content-Type", "application/json")
        resp = self.session.request(method, url, headers=headers, timeout=120, **kwargs)
        if resp.status_code >= 400:
            raise RuntimeError(
                f"{method} {url} -> {resp.status_code}\n{resp.text[:4000]}"
            )
        if resp.status_code == 204 or not resp.content:
            return {}
        return resp.json()

    def get(self, path: str, **params) -> dict:
        return self.request("GET", path, params=params)

    def post(self, path: str, body: dict) -> dict:
        return self.request("POST", path, json=body)

    def patch(self, path: str, body: dict) -> dict:
        return self.request("PATCH", path, json=body)

    def delete(self, path: str) -> dict:
        return self.request("DELETE", path)


def latest_app_store_version_id(client: AscClient, app_id: str) -> str:
    data = client.get(
        f"/v1/apps/{app_id}/appStoreVersions",
        **{
            "filter[platform]": "IOS",
            "limit": 10,
        },
    )
    versions = data.get("data") or []
    if not versions:
        raise RuntimeError("No iOS App Store versions found")
    # Prefer READY_FOR_SALE / live, then most recently created.
    priority = {
        "READY_FOR_SALE": 0,
        "PENDING_APPLE_RELEASE": 1,
        "WAITING_FOR_REVIEW": 2,
        "IN_REVIEW": 3,
        "PREPARE_FOR_SUBMISSION": 4,
        "DEVELOPER_REJECTED": 5,
        "REJECTED": 6,
    }
    for v in versions:
        state = v["attributes"].get("appStoreState") or v["attributes"].get("state")
        print(f"  version {v['attributes'].get('versionString')} state={state} id={v['id']}")
    versions.sort(
        key=lambda v: (
            priority.get(
                v["attributes"].get("appStoreState")
                or v["attributes"].get("state")
                or "",
                99,
            ),
            v["attributes"].get("versionString") or "",
        )
    )
    return versions[0]["id"]


def list_existing_cpps(client: AscClient, app_id: str) -> dict[str, dict]:
    data = client.get(f"/v1/apps/{app_id}/appCustomProductPages", limit=50)
    by_name = {}
    for page in data.get("data") or []:
        by_name[page["attributes"]["name"]] = page
    return by_name


def create_cpp(
    client: AscClient,
    app_id: str,
    version_id: str,
    name: str,
    promotional_text: str,
) -> dict:
    version_lid = f"${{new-version-{uuid.uuid4().hex[:8]}}}"
    loc_lid = f"${{new-loc-{uuid.uuid4().hex[:8]}}}"
    body = {
        "data": {
            "type": "appCustomProductPages",
            "attributes": {"name": name},
            "relationships": {
                "app": {"data": {"type": "apps", "id": app_id}},
                "appStoreVersionTemplate": {
                    "data": {"type": "appStoreVersions", "id": version_id}
                },
                "appCustomProductPageVersions": {
                    "data": [
                        {"type": "appCustomProductPageVersions", "id": version_lid}
                    ]
                },
            },
        },
        "included": [
            {
                "type": "appCustomProductPageVersions",
                "id": version_lid,
                "relationships": {
                    "appCustomProductPageLocalizations": {
                        "data": [
                            {
                                "type": "appCustomProductPageLocalizations",
                                "id": loc_lid,
                            }
                        ]
                    }
                },
            },
            {
                "type": "appCustomProductPageLocalizations",
                "id": loc_lid,
                "attributes": {
                    "locale": LOCALE,
                    "promotionalText": promotional_text,
                },
            },
        ],
    }
    return client.post("/v1/appCustomProductPages", body)


def get_cpp_localization_id(client: AscClient, page_id: str) -> tuple[str, str]:
    """Return (version_id, localization_id) for the latest CPP version."""
    versions = client.get(
        f"/v1/appCustomProductPages/{page_id}/appCustomProductPageVersions",
        limit=10,
        include="appCustomProductPageLocalizations",
    )
    if not versions.get("data"):
        raise RuntimeError(f"No versions for CPP {page_id}")
    version = versions["data"][0]
    version_id = version["id"]
    locs = (
        version.get("relationships", {})
        .get("appCustomProductPageLocalizations", {})
        .get("data")
        or []
    )
    if locs:
        return version_id, locs[0]["id"]
    # fallback: list localizations
    loc_resp = client.get(
        f"/v1/appCustomProductPageVersions/{version_id}/appCustomProductPageLocalizations",
        limit=10,
    )
    if not loc_resp.get("data"):
        raise RuntimeError(f"No localizations for CPP version {version_id}")
    return version_id, loc_resp["data"][0]["id"]


def ensure_screenshot_set(client: AscClient, localization_id: str) -> str:
    existing = client.get(
        f"/v1/appCustomProductPageLocalizations/{localization_id}/appScreenshotSets",
        limit=20,
    )
    for s in existing.get("data") or []:
        if s["attributes"].get("screenshotDisplayType") == SCREENSHOT_DISPLAY_TYPE:
            return s["id"]
    created = client.post(
        "/v1/appScreenshotSets",
        {
            "data": {
                "type": "appScreenshotSets",
                "attributes": {"screenshotDisplayType": SCREENSHOT_DISPLAY_TYPE},
                "relationships": {
                    "appCustomProductPageLocalization": {
                        "data": {
                            "type": "appCustomProductPageLocalizations",
                            "id": localization_id,
                        }
                    }
                },
            }
        },
    )
    return created["data"]["id"]


def clear_screenshot_set(client: AscClient, set_id: str) -> None:
    shots = client.get(f"/v1/appScreenshotSets/{set_id}/appScreenshots", limit=50)
    for shot in shots.get("data") or []:
        print(f"    deleting old screenshot {shot['id']}")
        client.delete(f"/v1/appScreenshots/{shot['id']}")


def upload_file_operations(file_path: Path, upload_operations: list) -> None:
    data = file_path.read_bytes()
    for op in upload_operations:
        method = op["method"]
        url = op["url"]
        headers = {h["name"]: h["value"] for h in op.get("requestHeaders") or []}
        length = op.get("length")
        offset = op.get("offset", 0)
        chunk = data[offset : offset + length] if length is not None else data
        resp = requests.request(method, url, data=chunk, headers=headers, timeout=180)
        if resp.status_code >= 400:
            raise RuntimeError(
                f"Upload failed {resp.status_code} for {file_path.name}: {resp.text[:500]}"
            )


def upload_screenshot(client: AscClient, set_id: str, file_path: Path) -> str:
    raw = file_path.read_bytes()
    reservation = client.post(
        "/v1/appScreenshots",
        {
            "data": {
                "type": "appScreenshots",
                "attributes": {
                    "fileName": file_path.name,
                    "fileSize": len(raw),
                },
                "relationships": {
                    "appScreenshotSet": {
                        "data": {"type": "appScreenshotSets", "id": set_id}
                    }
                },
            }
        },
    )
    shot_id = reservation["data"]["id"]
    ops = reservation["data"]["attributes"]["uploadOperations"]
    upload_file_operations(file_path, ops)
    checksum = hashlib.md5(raw).hexdigest()
    client.patch(
        f"/v1/appScreenshots/{shot_id}",
        {
            "data": {
                "type": "appScreenshots",
                "id": shot_id,
                "attributes": {
                    "uploaded": True,
                    "sourceFileChecksum": checksum,
                },
            }
        },
    )
    return shot_id


def screenshot_files(slug: str) -> list[Path]:
    folder = THIS_DIR / slug / "screenshots"
    files = sorted(folder.glob("*.png"))
    if len(files) != 8:
        raise RuntimeError(f"Expected 8 PNGs in {folder}, found {len(files)}")
    return files


def update_keyword_map(results: list[dict]) -> None:
    path = THIS_DIR / "asa-keyword-map.md"
    text = path.read_text()
    for r in results:
        placeholder = f"TODO_ASC_URL_{r['slug']}"
        url = r.get("url") or ""
        if placeholder in text and url:
            text = text.replace(placeholder, url)
        copy_path = THIS_DIR / r["slug"] / "copy.md"
        copy = copy_path.read_text()
        if f"**CPP URL:** `TODO_ASC_URL_{r['slug']}`" in copy and url:
            copy = copy.replace(
                f"**CPP URL:** `TODO_ASC_URL_{r['slug']}`",
                f"**CPP URL:** `{url}`",
            )
            copy_path.write_text(copy)
    path.write_text(text)


def submit_cpp_version(client: AscClient, version_id: str) -> None:
    """Best-effort submit for review if the endpoint is available."""
    try:
        client.post(
            "/v1/appCustomProductPageVersions/"
            f"{version_id}/relationships/appCustomProductPage",
            {},
        )
    except Exception:
        pass
    # Apple's submit endpoint historically:
    try:
        client.post(
            "/v1/appStoreReviewDetails",
            {},
        )
    except Exception:
        pass
    # Prefer documented review submission if present on the version resource
    try:
        client.post(
            f"/v1/appCustomProductPageVersions/{version_id}/changesToReviewState",
            {
                "data": {
                    "type": "appCustomProductPageVersions",
                    "id": version_id,
                    "attributes": {"state": "READY_FOR_REVIEW"},
                }
            },
        )
        print(f"    submitted version {version_id} for review")
    except Exception as exc:
        print(f"    note: submit-for-review via API skipped ({exc})")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--skip-submit",
        action="store_true",
        help="Create pages + upload media but do not attempt review submit",
    )
    args = parser.parse_args()

    key_id, issuer, key_path = load_asc_env()
    client = AscClient(key_id, issuer, key_path)

    print(f"App: {APP_APPLE_ID} ({BUNDLE_ID})")
    version_id = latest_app_store_version_id(client, APP_APPLE_ID)
    print(f"Using appStoreVersion template: {version_id}")

    existing = list_existing_cpps(client, APP_APPLE_ID)
    print(f"Existing CPPs: {list(existing)}")

    results = []
    for page in PAGES:
        slug = page["slug"]
        name = page["name"]
        print(f"\n=== {name} ({slug}) ===")
        files = screenshot_files(slug)
        if args.dry_run:
            print(f"  dry-run: would upload {len(files)} screenshots")
            continue

        if name in existing:
            page_res = existing[name]
            page_id = page_res["id"]
            print(f"  reusing existing page id={page_id}")
            # refresh promotional text on localization
            version_id_cpp, loc_id = get_cpp_localization_id(client, page_id)
            client.patch(
                f"/v1/appCustomProductPageLocalizations/{loc_id}",
                {
                    "data": {
                        "type": "appCustomProductPageLocalizations",
                        "id": loc_id,
                        "attributes": {"promotionalText": page["promotional_text"]},
                    }
                },
            )
        else:
            created = create_cpp(
                client,
                APP_APPLE_ID,
                version_id,
                name,
                page["promotional_text"],
            )
            page_res = created["data"]
            page_id = page_res["id"]
            print(f"  created page id={page_id}")
            version_id_cpp, loc_id = get_cpp_localization_id(client, page_id)

        url = page_res["attributes"].get("url") or (
            f"https://apps.apple.com/us/app/dealgapiq/id{APP_APPLE_ID}?ppid={page_id}"
        )
        print(f"  url: {url}")
        print(f"  localization: {loc_id}")

        set_id = ensure_screenshot_set(client, loc_id)
        print(f"  screenshot set: {set_id}")
        clear_screenshot_set(client, set_id)

        for i, path in enumerate(files, 1):
            print(f"  uploading {i}/8 {path.name} ...")
            shot_id = upload_screenshot(client, set_id, path)
            print(f"    -> {shot_id}")

        if not args.skip_submit:
            submit_cpp_version(client, version_id_cpp)

        results.append(
            {
                "slug": slug,
                "name": name,
                "id": page_id,
                "url": url,
                "localization_id": loc_id,
            }
        )

    if results:
        update_keyword_map(results)
        out = THIS_DIR / "asc-upload-results.json"
        out.write_text(json.dumps(results, indent=2) + "\n")
        print(f"\nWrote {out}")
        print("\nCustom Product Pages:")
        for r in results:
            print(f"  - {r['name']}: {r['url']}")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        raise
