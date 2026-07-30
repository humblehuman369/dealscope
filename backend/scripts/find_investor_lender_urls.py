"""Find investor-focused deep links for hard-money lenders.

Many lender ``website`` values point at a consumer mortgage homepage. Our
audience pays for investor / hard-money / DSCR / fix-and-flip pages. This script
fetches each homepage, scores it, discovers same-domain investor candidates
(from links + common path probes), and optionally rewrites ``website`` in
``app/data/lenders.json``.

``domain`` is left untouched — it is the seed natural key.

Run from backend/:

    python -m scripts.find_investor_lender_urls [--limit N] [--apply] [--workers 12]

Writes ``docs/lenders/investor-url-audit.json`` (report) always.
With ``--apply``, updates lenders.json for high-confidence upgrades only.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse, urlunparse

import httpx

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("find_investor_urls")

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "app" / "data" / "lenders.json"
REPORT_PATH = ROOT.parent / "docs" / "lenders" / "investor-url-audit.json"

USER_AGENT = (
    "DealGapIQLenderURLAudit/1.0 (+https://dealgapiq.com; directory quality)"
)

HREF_RE = re.compile(r"""href\s*=\s*["']([^"'#]+)["']""", re.I)
TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")

# Prefer path segments that scream investor lending.
PATH_POSITIVE = (
    (r"/lending/investor", 40),
    (r"/investor-loan", 35),
    (r"/investment-loan", 35),
    (r"/hard-?money", 38),
    (r"/fix-?and-?flip", 32),
    (r"/fix-?flip", 30),
    (r"/private-?money", 30),
    (r"/bridge-?loan", 26),
    (r"/dscr", 28),
    (r"/investor", 24),
    (r"/investment", 18),
    (r"/commercial", 10),
)

PATH_NEGATIVE = (
    r"/first-?time",
    r"/homebuyer",
    r"/fha\b",
    r"/va-?loan",
    r"/usda",
    r"/refinance",
    r"/purchase",
    r"/pre-?approv",
    r"/calculator",
    r"/blog",
    r"/careers",
    r"/privacy",
    r"/terms",
    r"/contact",
    r"/about",
    r"/resources",
    r"/apply\b",
    r"/faq",
    r"/faqs",
    r"/news",
    r"/press",
    r"/learn",
    r"/guide",
    r"/overview",
    r"/checklist",
    r"/comparison",
    r"/education",
    r"/uncategorized",
    r"/wp-content",
    r"/uploads/",
    r"/video_category",
    r"/markets/",
    r"/article",
    r"/category/",
    r"/tag/",
    r"/\d{4}/\d{2}/",
    r"pros-and-cons",
    r"/transactions/",
    r"/locations/",
    r"-vs-",
    r"versus",
    r"what-you-need-to-know",
    r"whats-the-difference",
)

# Reject candidate URLs that are clearly content/media, not product pages.
REJECT_CANDIDATE_RE = re.compile(
    r"(blog|faq|faqs|news|press|checklist|contact|education|overview|comparison|"
    r"markets/|article|guide|resource|learn|podcast|webinar|category/|tag/|"
    r"uncategorized|video_category|wp-content|uploads/|"
    r"\d{4}[-/]\d{2}|"
    r"\.(?:png|jpe?g|gif|webp|svg|pdf|mp4)(?:$|\?))",
    re.I,
)

# Require product-ish path for upgrades (avoid bare /investors IR pages).
PRODUCT_PATH_RE = re.compile(
    r"(hard-?money|fix-?and-?flip|fix-?flip|dscr|private-?money|bridge-?loan|"
    r"investor-?loan|investment-?loan|/lending/investor|"
    r"investment-property|rehab|construction|"
    r"investor-real-estate|investor-rehab|investor-cash-flow|"
    r"investor-friendly|/programs/.+investor)",
    re.I,
)

BODY_POSITIVE = (
    (r"hard\s*money", 8),
    (r"fix\s*(?:and|&|-)?\s*flip", 7),
    (r"\bdscr\b", 7),
    (r"private\s*money", 6),
    (r"bridge\s*loan", 5),
    (r"real\s*estate\s*investor", 8),
    (r"investor\s*loan", 8),
    (r"investment\s*loan", 7),
    (r"rental\s*portfolio", 4),
    (r"ground[- ]up\s*construction", 4),
    (r"no[- ]doc\s*investor", 5),
)

BODY_CONSUMER = (
    (r"first[- ]time\s*homebuyer", 8),
    (r"get\s*pre-?approved", 5),
    (r"\bfha\b", 4),
    (r"\bva\s*loan", 4),
    (r"conventional\s*loan", 3),
    (r"buying\s*or\s*refinancing", 6),
    (r"primary\s*residence", 3),
)

PROBE_PATHS = (
    "/lending/investor",
    "/investor",
    "/investors",
    "/investor-loans",
    "/investor-loan",
    "/investor-loan-programs",
    "/investment-loans",
    "/investment-loan-programs",
    "/hard-money",
    "/hard-money-loans",
    "/hard-money-loan",
    "/private-money",
    "/fix-and-flip",
    "/fix-flip",
    "/fix-and-flip-loans",
    "/dscr",
    "/dscr-loans",
    "/bridge-loans",
    "/bridge-loan",
    "/real-estate-investors",
    "/lending/investment",
    "/programs/investor",
    "/loan-programs/investor",
    "/commercial/investor",
)


@dataclass
class AuditRow:
    id: int
    domain: str
    company_name: str
    current_website: str
    homepage_score: int
    homepage_is_investor: bool
    suggested_website: str | None
    suggested_score: int
    action: str  # keep | upgrade | no_better | fetch_failed
    reason: str
    candidates_tried: int = 0


def normalize_url(url: str) -> str:
    parsed = urlparse(url.strip())
    scheme = parsed.scheme or "https"
    netloc = parsed.netloc.lower()
    if netloc.startswith("www."):
        netloc = netloc[4:]
    path = parsed.path.rstrip("/") or ""
    # Drop tracking query/fragment for identity; keep path.
    return urlunparse((scheme, netloc, path, "", "", ""))


def same_registrable_host(url: str, domain: str) -> bool:
    host = urlparse(url).netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    base = domain.lower().lstrip("www.")
    return host == base or host.endswith("." + base)


def path_score(path: str) -> int:
    p = path.lower()
    score = 0
    for pattern, pts in PATH_POSITIVE:
        if re.search(pattern, p):
            score += pts
    for pattern in PATH_NEGATIVE:
        if re.search(pattern, p):
            score -= 15
    return score


def body_score(text: str) -> int:
    t = text.lower()
    score = 0
    for pattern, pts in BODY_POSITIVE:
        if re.search(pattern, t):
            score += pts
    for pattern, pts in BODY_CONSUMER:
        if re.search(pattern, t):
            score -= pts
    return score


def strip_html(html: str) -> str:
    text = TAG_RE.sub(" ", html)
    return WS_RE.sub(" ", text)[:12000]


def extract_same_domain_links(html: str, base_url: str, domain: str) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()
    for match in HREF_RE.finditer(html):
        href = match.group(1).strip()
        if href.startswith(("mailto:", "tel:", "javascript:", "data:")):
            continue
        absolute = urljoin(base_url, href)
        if not same_registrable_host(absolute, domain):
            continue
        cleaned = normalize_url(absolute)
        if cleaned in seen:
            continue
        seen.add(cleaned)
        if path_score(urlparse(cleaned).path) > 0:
            found.append(cleaned)
    return found


async def fetch(
    client: httpx.AsyncClient, url: str
) -> tuple[str | None, str | None, int | None]:
    """Return (final_url, html, status) or (None, None, None) on failure."""
    try:
        response = await client.get(url, follow_redirects=True)
        ctype = response.headers.get("content-type", "")
        if response.status_code >= 400:
            return None, None, response.status_code
        if "text/html" not in ctype and "application/xhtml" not in ctype and ctype:
            # Some servers omit content-type; still try body if it looks like HTML.
            if not response.text.lstrip().lower().startswith("<!doctype") and "<html" not in response.text[:500].lower():
                return None, None, response.status_code
        return str(response.url), response.text, response.status_code
    except Exception as exc:
        logger.debug("fetch failed %s: %s", url, exc)
        return None, None, None


def score_page(url: str, html: str) -> int:
    return path_score(urlparse(url).path) + body_score(strip_html(html))


async def audit_lender(
    client: httpx.AsyncClient,
    row: dict[str, Any],
    sem: asyncio.Semaphore,
) -> AuditRow:
    async with sem:
        domain = row["domain"]
        company = row.get("company_name") or domain
        current = row.get("website") or f"https://{domain}"
        lender_id = int(row["id"])

        home_url, home_html, home_status = await fetch(client, current)
        if not home_url or not home_html:
            # Try apex https if current failed
            apex = f"https://{domain}"
            if normalize_url(apex) != normalize_url(current):
                home_url, home_html, home_status = await fetch(client, apex)
        if not home_url or not home_html:
            return AuditRow(
                id=lender_id,
                domain=domain,
                company_name=company,
                current_website=current,
                homepage_score=0,
                homepage_is_investor=False,
                suggested_website=None,
                suggested_score=0,
                action="fetch_failed",
                reason=f"could not fetch homepage (status={home_status})",
            )

        home_score = score_page(home_url, home_html)
        home_is_investor = home_score >= 12

        candidates: list[str] = []
        seen: set[str] = {normalize_url(home_url), normalize_url(current)}

        for link in extract_same_domain_links(home_html, home_url, domain):
            if REJECT_CANDIDATE_RE.search(urlparse(link).path):
                continue
            if link not in seen:
                seen.add(link)
                candidates.append(link)

        # Probe common investor paths from the apex origin.
        origin = f"{urlparse(home_url).scheme}://{urlparse(home_url).netloc}"
        for probe in PROBE_PATHS:
            candidate = normalize_url(urljoin(origin, probe))
            if REJECT_CANDIDATE_RE.search(urlparse(candidate).path):
                continue
            if candidate not in seen:
                seen.add(candidate)
                candidates.append(candidate)

        # Rank by path score first so we fetch the most promising ones.
        candidates.sort(key=lambda u: path_score(urlparse(u).path), reverse=True)
        candidates = candidates[:18]

        best_url: str | None = None
        best_score = home_score
        tried = 0
        for candidate in candidates:
            tried += 1
            # Skip weak path scores unless homepage is clearly consumer.
            if path_score(urlparse(candidate).path) < 18 and home_is_investor:
                continue
            final_url, html, status = await fetch(client, candidate)
            if not final_url or not html or not same_registrable_host(final_url, domain):
                continue
            # Soft-404 / homepage redirect: identical path to home after normalize.
            if normalize_url(final_url) == normalize_url(home_url):
                continue
            score = score_page(final_url, html)
            if not PRODUCT_PATH_RE.search(urlparse(final_url).path):
                continue
            if REJECT_CANDIDATE_RE.search(urlparse(final_url).path):
                continue
            if score > best_score:
                best_score = score
                best_url = normalize_url(final_url)
            # Strong investor deep link — no need to keep probing.
            if best_score >= 40:
                break

        # High-confidence upgrade: materially better investor page than current.
        upgrade_margin = 10 if home_is_investor else 6
        if (
            best_url
            and best_url != normalize_url(current)
            and best_score >= 28
            and best_score >= home_score + upgrade_margin
            and PRODUCT_PATH_RE.search(urlparse(best_url).path)
            and not REJECT_CANDIDATE_RE.search(urlparse(best_url).path)
        ):
            return AuditRow(
                id=lender_id,
                domain=domain,
                company_name=company,
                current_website=current,
                homepage_score=home_score,
                homepage_is_investor=home_is_investor,
                suggested_website=best_url,
                suggested_score=best_score,
                action="upgrade",
                reason="found stronger same-domain investor page",
                candidates_tried=tried,
            )

        if home_is_investor:
            return AuditRow(
                id=lender_id,
                domain=domain,
                company_name=company,
                current_website=current,
                homepage_score=home_score,
                homepage_is_investor=True,
                suggested_website=None,
                suggested_score=home_score,
                action="keep",
                reason="homepage already investor-focused",
                candidates_tried=tried,
            )

        return AuditRow(
            id=lender_id,
            domain=domain,
            company_name=company,
            current_website=current,
            homepage_score=home_score,
            homepage_is_investor=False,
            suggested_website=best_url if best_url and best_score > home_score else None,
            suggested_score=best_score,
            action="no_better",
            reason="no high-confidence investor deep link found",
            candidates_tried=tried,
        )


async def run(limit: int | None, workers: int, apply: bool, only_domain: str | None) -> None:
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    lenders: list[dict[str, Any]] = payload["lenders"]
    if only_domain:
        lenders = [l for l in lenders if l.get("domain") == only_domain]
    if limit is not None:
        lenders = lenders[:limit]

    logger.info("Auditing %s lenders (workers=%s)", len(lenders), workers)
    sem = asyncio.Semaphore(workers)
    timeout = httpx.Timeout(20.0, connect=10.0)
    limits = httpx.Limits(max_connections=workers + 4, max_keepalive_connections=workers)

    async with httpx.AsyncClient(
        headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"},
        timeout=timeout,
        limits=limits,
        verify=True,
    ) as client:
        rows = await asyncio.gather(*(audit_lender(client, row, sem) for row in lenders))

    results = [asdict(r) for r in rows]
    upgrades = [r for r in results if r["action"] == "upgrade"]
    keep = sum(1 for r in results if r["action"] == "keep")
    failed = sum(1 for r in results if r["action"] == "fetch_failed")
    no_better = sum(1 for r in results if r["action"] == "no_better")

    report = {
        "generated_for": str(DATA_PATH),
        "audited": len(results),
        "summary": {
            "upgrade": len(upgrades),
            "keep": keep,
            "no_better": no_better,
            "fetch_failed": failed,
        },
        "upgrades": upgrades,
        "rows": results,
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    logger.info(
        "Report written to %s — upgrade=%s keep=%s no_better=%s fetch_failed=%s",
        REPORT_PATH,
        len(upgrades),
        keep,
        no_better,
        failed,
    )

    if not apply:
        logger.info("Dry run only. Re-run with --apply to write upgrades into lenders.json")
        return

    by_id = {r["id"]: r for r in upgrades}
    changed = 0
    for lender in payload["lenders"]:
        suggestion = by_id.get(lender["id"])
        if not suggestion or not suggestion["suggested_website"]:
            continue
        new_url = suggestion["suggested_website"]
        # Prefer https://www. when original used www, else bare host + path.
        if "://www." in (lender.get("website") or ""):
            parsed = urlparse(new_url)
            host = parsed.netloc
            if not host.startswith("www."):
                host = "www." + host
            new_url = urlunparse((parsed.scheme, host, parsed.path, "", "", ""))
        if lender.get("website") != new_url:
            lender["website"] = new_url
            changed += 1

    if changed:
        DATA_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    logger.info("Applied %s website updates to %s", changed, DATA_PATH)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=None, help="Audit only the first N lenders")
    parser.add_argument("--workers", type=int, default=10, help="Concurrent fetches")
    parser.add_argument("--apply", action="store_true", help="Write upgrades into lenders.json")
    parser.add_argument("--domain", type=str, default=None, help="Audit a single domain")
    args = parser.parse_args()
    asyncio.run(run(args.limit, args.workers, args.apply, args.domain))


if __name__ == "__main__":
    main()
