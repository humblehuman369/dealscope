"""3-legged LinkedIn OAuth helper. Prints Railway env lines; does not store tokens.

    cd backend && python -m scripts.linkedin_oauth --account founder
    cd backend && python -m scripts.linkedin_oauth --account company

Requires LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in the environment
(or a local backend/.env). Redirect URI must be registered as
http://localhost:8765/callback on the LinkedIn Developer app.

Founder scopes: openid profile w_member_social
Company scopes: openid profile w_organization_social
  (Community Management API approval required for company posting.)
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
import urllib.request
from datetime import UTC, datetime, timedelta
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

# backend/ on sys.path when run as a script rather than -m
_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.core.config import settings

REDIRECT_URI = "http://localhost:8765/callback"
AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization"
TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
USERINFO_URL = "https://api.linkedin.com/v2/userinfo"

SCOPES = {
    "founder": "openid profile w_member_social",
    "company": "openid profile w_organization_social",
}


class _Callback(BaseHTTPRequestHandler):
    code: str | None = None
    error: str | None = None

    def log_message(self, fmt: str, *args: object) -> None:
        return

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/callback":
            self.send_response(404)
            self.end_headers()
            return
        qs = urllib.parse.parse_qs(parsed.query)
        _Callback.code = (qs.get("code") or [None])[0]
        _Callback.error = (qs.get("error") or [None])[0]
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(b"LinkedIn authorization received. Return to the terminal.")


def _post_form(url: str, data: dict[str, str]) -> dict:
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(  # noqa: S310
        url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:  # noqa: S310
        return json.loads(resp.read().decode())


def _get_json(url: str, token: str) -> dict:
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})  # noqa: S310
    with urllib.request.urlopen(req) as resp:  # noqa: S310
        return json.loads(resp.read().decode())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--account", choices=("founder", "company"), required=True)
    args = parser.parse_args()

    client_id = settings.LINKEDIN_CLIENT_ID
    client_secret = settings.LINKEDIN_CLIENT_SECRET
    if not client_id or not client_secret:
        print(
            "Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET first.",
            file=sys.stderr,
        )
        raise SystemExit(1)

    scope = SCOPES[args.account]
    auth_url = (
        f"{AUTHORIZE_URL}?response_type=code"
        f"&client_id={urllib.parse.quote(client_id)}"
        f"&redirect_uri={urllib.parse.quote(REDIRECT_URI)}"
        f"&scope={urllib.parse.quote(scope)}"
        f"&state={args.account}"
    )
    print("Open this URL in a browser and authorize:\n")
    print(auth_url)
    print(f"\nWaiting for redirect on {REDIRECT_URI} ...")

    server = HTTPServer(("127.0.0.1", 8765), _Callback)
    while _Callback.code is None and _Callback.error is None:
        server.handle_request()
    server.server_close()

    if _Callback.error or not _Callback.code:
        print(f"Authorization failed: {_Callback.error or 'no code'}", file=sys.stderr)
        raise SystemExit(1)

    token = _post_form(
        TOKEN_URL,
        {
            "grant_type": "authorization_code",
            "code": _Callback.code,
            "redirect_uri": REDIRECT_URI,
            "client_id": client_id,
            "client_secret": client_secret,
        },
    )
    access = token.get("access_token", "")
    refresh = token.get("refresh_token", "")
    expires_in = int(token.get("expires_in") or 0)

    expires_at = (datetime.now(UTC) + timedelta(seconds=expires_in)).strftime("%Y-%m-%dT%H:%M:%SZ")

    person_urn = ""
    try:
        info = _get_json(USERINFO_URL, access)
        sub = info.get("sub") or ""
        if sub:
            person_urn = sub if str(sub).startswith("urn:li:") else f"urn:li:person:{sub}"
    except Exception as exc:  # userinfo is founder-only; company may lack openid
        print(f"(userinfo skipped: {exc})", file=sys.stderr)

    print("\nPaste these into the Railway backend service, then keep LINKEDIN_PUBLISH_ENABLED=false until a dry-run tick looks right:\n")
    if args.account == "founder":
        print(f"LINKEDIN_FOUNDER_ACCESS_TOKEN={access}")
        if refresh:
            print(f"LINKEDIN_FOUNDER_REFRESH_TOKEN={refresh}")
        print(f"LINKEDIN_TOKEN_EXPIRES_AT_FOUNDER={expires_at}")
        if person_urn:
            print(f"LINKEDIN_FOUNDER_PERSON_URN={person_urn}")
        else:
            print("# LINKEDIN_FOUNDER_PERSON_URN=urn:li:person:XXXX  (userinfo did not return sub)")
    else:
        print(f"LINKEDIN_COMPANY_ACCESS_TOKEN={access}")
        if refresh:
            print(f"LINKEDIN_COMPANY_REFRESH_TOKEN={refresh}")
        print(f"LINKEDIN_TOKEN_EXPIRES_AT_COMPANY={expires_at}")
        print("# LINKEDIN_COMPANY_ORG_URN=urn:li:organization:XXXX  (from the company page URL)")
        if person_urn:
            print(f"# signed-in member: {person_urn}")
    print("\nLINKEDIN_PUBLISH_ENABLED=false")


if __name__ == "__main__":
    main()
