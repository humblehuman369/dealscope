"""Build LinkedIn document carousels (PDF) from the /for persona listicle pages.

One slide per reason, plus a cover and a closing slide, so the carousel says
exactly what the landing page says. Colors are the brand tokens from
frontend/src/app/globals.css; this is offline PDF generation, an allowed
exception to the theme-surface contract.

Usage (from the repo root):

    (cd frontend && node --import tsx scripts/export-persona-pages.ts) > /tmp/persona-pages.json
    python3 scripts/build_listicle_carousels.py /tmp/persona-pages.json \
        --out docs/marketing/linkedin/assets/batch-02 \
        --slugs house-hackers wholesalers out-of-state-investors creative-finance-buyers

Requires reportlab (``pip install reportlab``).
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas

PAGE = 1080  # LinkedIn renders documents at any aspect; square reads best in feed.
MARGIN = 88

# Brand tokens (globals.css): surface-base, accent-brand-blue, accent-sky,
# text-heading, text-secondary, text-muted.
BG = HexColor("#000000")
BRAND_BLUE = HexColor("#0465F2")
SKY = HexColor("#0FA4E9")
HEADING = HexColor("#FFFFFF")
SECONDARY = HexColor("#94A3B8")
MUTED = HexColor("#64748B")

FONT = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

SIGN_OFF = "Google Deal Gap IQ. Know what to offer."


def wrap(c: canvas.Canvas, text: str, font: str, size: float, width: float) -> list[str]:
    """Greedy word wrap using the canvas's string metrics."""
    words = text.split()
    lines: list[str] = []
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if c.stringWidth(candidate, font, size) <= width:
            line = candidate
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


@dataclass
class Block:
    text: str
    font: str
    size: float
    color: object
    gap_before: float = 0  # extra space above this block
    leading_ratio: float = 1.22


def draw_blocks(c: canvas.Canvas, blocks: list[Block], x: float, width: float) -> None:
    """Wrap every block, then draw the stack vertically centered on the page."""
    measured = []
    total = 0.0
    for b in blocks:
        lines = wrap(c, b.text, b.font, b.size, width)
        leading = b.size * b.leading_ratio
        height = leading * len(lines)
        measured.append((b, lines, leading))
        total += b.gap_before + height
    # Baseline of the first line: centre the block, then step down by the first ascent.
    y = (PAGE + total) / 2 - measured[0][0].size
    for b, lines, leading in measured:
        y -= b.gap_before
        c.setFont(b.font, b.size)
        c.setFillColor(b.color)
        for line in lines:
            c.drawString(x, y, line)
            y -= leading


def fit_size(c: canvas.Canvas, text: str, font: str, width: float, max_size: float, max_lines: int, min_size: float = 28) -> float:
    """Largest font size at or below ``max_size`` that fits ``text`` in ``max_lines``."""
    size = max_size
    while size > min_size and len(wrap(c, text, font, size, width)) > max_lines:
        size -= 2
    return size


def frame(c: canvas.Canvas) -> None:
    c.setFillColor(BG)
    c.rect(0, 0, PAGE, PAGE, stroke=0, fill=1)
    c.setFillColor(BRAND_BLUE)
    c.rect(0, PAGE - 14, PAGE, 14, stroke=0, fill=1)


def footer(c: canvas.Canvas, left: str, right: str) -> None:
    c.setFont(FONT, 22)
    c.setFillColor(MUTED)
    c.drawString(MARGIN, MARGIN - 20, left)
    c.drawRightString(PAGE - MARGIN, MARGIN - 20, right)


def brand_tag(c: canvas.Canvas, text: str = "DEALGAPIQ") -> None:
    c.setFont(FONT_BOLD, 22)
    c.setFillColor(SKY)
    # Letter-spaced small caps, the way the landing pages set their eyebrow text.
    x = MARGIN
    for ch in text:
        c.drawString(x, PAGE - MARGIN - 10, ch)
        x += c.stringWidth(ch, FONT_BOLD, 22) + 4


def cover(c: canvas.Canvas, page: dict, url: str) -> None:
    frame(c)
    brand_tag(c)
    width = PAGE - 2 * MARGIN
    size = fit_size(c, page["headline"], FONT_BOLD, width, 80, 5)
    draw_blocks(
        c,
        [
            Block(page["headline"], FONT_BOLD, size, HEADING, leading_ratio=1.12),
            Block("Swipe \u2192", FONT, 32, SECONDARY, gap_before=36),
        ],
        MARGIN,
        width,
    )
    footer(c, url, "")
    c.showPage()


def reason_slide(c: canvas.Canvas, index: int, total: int, reason: dict, url: str) -> None:
    frame(c)
    width = PAGE - 2 * MARGIN
    heading_size = fit_size(c, reason["heading"], FONT_BOLD, width, 60, 3)
    body_size = fit_size(c, reason["body"], FONT, width, 36, 7, min_size=28)
    draw_blocks(
        c,
        [
            Block(f"{index:02d}", FONT_BOLD, 120, SKY, leading_ratio=1.0),
            Block(reason["heading"], FONT_BOLD, heading_size, HEADING, gap_before=28, leading_ratio=1.12),
            Block(reason["body"], FONT, body_size, SECONDARY, gap_before=30, leading_ratio=1.34),
        ],
        MARGIN,
        width,
    )
    footer(c, url, f"{index} / {total}")
    c.showPage()


def closing(c: canvas.Canvas, page: dict, url: str) -> None:
    frame(c)
    brand_tag(c)
    width = PAGE - 2 * MARGIN
    size = fit_size(c, page["offer"]["heading"], FONT_BOLD, width, 72, 4)
    draw_blocks(
        c,
        [
            Block(page["offer"]["heading"], FONT_BOLD, size, HEADING, leading_ratio=1.12),
            Block(page["offer"]["body"], FONT, 32, SECONDARY, gap_before=30, leading_ratio=1.34),
            Block(url, FONT_BOLD, 34, SKY, gap_before=40),
        ],
        MARGIN,
        width,
    )
    footer(c, SIGN_OFF, "")
    c.showPage()


def build(page: dict, out_dir: Path) -> Path:
    url = f"dealgapiq.com/for/{page['slug']}"
    out = out_dir / f"{page['slug']}-carousel.pdf"
    c = canvas.Canvas(str(out), pagesize=(PAGE, PAGE))
    c.setTitle(page["headline"])
    c.setAuthor("DealGapIQ")
    cover(c, page, url)
    total = len(page["reasons"])
    for i, reason in enumerate(page["reasons"], start=1):
        reason_slide(c, i, total, reason, url)
    closing(c, page, url)
    c.save()
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pages_json", type=Path, help="Output of frontend/scripts/export-persona-pages.ts")
    parser.add_argument("--out", type=Path, required=True, help="Directory for the PDFs")
    parser.add_argument("--slugs", nargs="*", help="Only build these slugs (default: all)")
    args = parser.parse_args()

    pages = json.loads(args.pages_json.read_text(encoding="utf-8"))
    wanted = set(args.slugs) if args.slugs else None
    args.out.mkdir(parents=True, exist_ok=True)
    built = 0
    for page in pages:
        if wanted and page["slug"] not in wanted:
            continue
        out = build(page, args.out)
        print(f"{out}  ({len(page['reasons']) + 2} slides)")
        built += 1
    if wanted and built != len(wanted):
        missing = wanted - {p["slug"] for p in pages}
        raise SystemExit(f"unknown slug(s): {', '.join(sorted(missing))}")


if __name__ == "__main__":
    main()
