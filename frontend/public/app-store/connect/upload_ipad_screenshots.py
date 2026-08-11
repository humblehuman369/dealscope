#!/usr/bin/env python3
"""Upload iPad App Store screenshots (2048×2732) to the active iOS version.

Uses the same ASC credentials as custom-product-pages/upload_to_asc.py.

Usage:
  python3 upload_ipad_screenshots.py
  python3 upload_ipad_screenshots.py --dry-run
  python3 upload_ipad_screenshots.py --version 2.3.0
"""

from __future__ import annotations

import argparse
import hashlib
import os
import sys
import time
from pathlib import Path

import jwt
import requests

THIS_DIR = Path(__file__).resolve().parent
SCREENSHOTS_DIR = THIS_DIR / "screenshots-ipad"
APP_APPLE_ID = "6759636866"
# 2048×2732 → 12.9" / 13" iPad Pro class
SCREENSHOT_DISPLAY_TYPE = "APP_IPAD_PRO_3GEN_129"
LOCALE = "en-US"
API = "https://api.appstoreconnect.apple.com"


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


def find_version_id(client: AscClient, version_string: str | None) -> tuple[str, str, str]:
    data = client.get(
        f"/v1/apps/{APP_APPLE_ID}/appStoreVersions",
        **{"filter[platform]": "IOS", "limit": 20},
    )
    versions = data.get("data") or []
    if not versions:
        raise RuntimeError("No iOS App Store versions found")

    for v in versions:
        attrs = v["attributes"]
        state = attrs.get("appStoreState") or attrs.get("state")
        print(f"  version {attrs.get('versionString')} state={state} id={v['id']}")

    if version_string:
        for v in versions:
            if v["attributes"].get("versionString") == version_string:
                state = (
                    v["attributes"].get("appStoreState")
                    or v["attributes"].get("state")
                    or ""
                )
                return v["id"], version_string, state
        raise RuntimeError(f"Version {version_string} not found")

    # Prefer an editable version, then newest.
    priority = {
        "PREPARE_FOR_SUBMISSION": 0,
        "DEVELOPER_REJECTED": 1,
        "REJECTED": 2,
        "WAITING_FOR_REVIEW": 3,
        "IN_REVIEW": 4,
        "PENDING_APPLE_RELEASE": 5,
        "READY_FOR_SALE": 6,
    }
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
    chosen = versions[0]
    attrs = chosen["attributes"]
    state = attrs.get("appStoreState") or attrs.get("state") or ""
    return chosen["id"], attrs.get("versionString") or "?", state


def get_localization_id(client: AscClient, version_id: str) -> str:
    data = client.get(
        f"/v1/appStoreVersions/{version_id}/appStoreVersionLocalizations",
        limit=20,
    )
    for loc in data.get("data") or []:
        if loc["attributes"].get("locale") == LOCALE:
            return loc["id"]
    raise RuntimeError(f"No {LOCALE} localization on version {version_id}")


def ensure_screenshot_set(client: AscClient, localization_id: str) -> str:
    existing = client.get(
        f"/v1/appStoreVersionLocalizations/{localization_id}/appScreenshotSets",
        limit=30,
    )
    for s in existing.get("data") or []:
        dtype = s["attributes"].get("screenshotDisplayType")
        print(f"  existing set: {dtype} id={s['id']}")
        if dtype == SCREENSHOT_DISPLAY_TYPE:
            return s["id"]

    created = client.post(
        "/v1/appScreenshotSets",
        {
            "data": {
                "type": "appScreenshotSets",
                "attributes": {"screenshotDisplayType": SCREENSHOT_DISPLAY_TYPE},
                "relationships": {
                    "appStoreVersionLocalization": {
                        "data": {
                            "type": "appStoreVersionLocalizations",
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


def screenshot_files() -> list[Path]:
    files = sorted(SCREENSHOTS_DIR.glob("*.png"))
    if len(files) != 8:
        raise RuntimeError(f"Expected 8 PNGs in {SCREENSHOTS_DIR}, found {len(files)}")
    return files


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--version",
        default="2.3.0",
        help="App Store version string to attach screenshots to (default: 2.3.0)",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        default=True,
        help="Replace any existing iPad screenshots in the set (default: on)",
    )
    args = parser.parse_args()

    files = screenshot_files()
    key_id, issuer, key_path = load_asc_env()
    client = AscClient(key_id, issuer, key_path)

    print(f"App: {APP_APPLE_ID}")
    print(f"Display type: {SCREENSHOT_DISPLAY_TYPE}")
    print(f"Source: {SCREENSHOTS_DIR}")
    version_id, version_string, state = find_version_id(client, args.version)
    print(f"Target version: {version_string} ({state}) id={version_id}")

    loc_id = get_localization_id(client, version_id)
    print(f"Localization {LOCALE}: {loc_id}")

    if args.dry_run:
        print(f"dry-run: would upload {len(files)} iPad screenshots")
        for f in files:
            print(f"  - {f.name}")
        return 0

    set_id = ensure_screenshot_set(client, loc_id)
    print(f"Screenshot set: {set_id}")
    if args.replace:
        clear_screenshot_set(client, set_id)

    for i, path in enumerate(files, 1):
        print(f"Uploading {i}/8 {path.name} ...")
        shot_id = upload_screenshot(client, set_id, path)
        print(f"  -> {shot_id}")

    print(
        f"\nDone. Uploaded {len(files)} iPad screenshots to version {version_string}."
    )
    print("Confirm in App Store Connect → iOS App → Screenshots → 12.9\" / 13\" iPad.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        raise
