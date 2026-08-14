#!/usr/bin/env python3
"""Render landscape desktop UI plates for Mac App Store screenshots.

These replace the iPhone marketing plates that were being pasted into
Mac window chrome. Layout matches the live desktop web app:
header + analysis tabs + wide content (cards in a row, map + sidebar,
comps table, Deal Maker two-column worksheet).

Usage:
    python3 render_mac_desktop_plates.py
"""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

THIS_DIR = Path(__file__).resolve().parent
OUT_DIR = THIS_DIR / "assets" / "mac-desktop"
WORDMARK_PATH = THIS_DIR.parent / "play-store" / "assets" / "dealgapiq-wordmark-darkmode.png"
_FONT_CANDIDATES = (
    THIS_DIR / "assets" / "fonts" / "DMSans-Variable.ttf",
    Path("/tmp/dm-sans-fonts/DMSans-Variable.ttf"),
)
FONT_PATH = next((str(p) for p in _FONT_CANDIDATES if p.is_file()), str(_FONT_CANDIDATES[0]))

W, H = 1760, 1100

BG = (6, 10, 20)
CHROME = (10, 16, 32)
CARD = (8, 12, 24)
ELEVATED = (14, 20, 36)
BORDER = (36, 48, 72)
WHITE = (255, 255, 255)
MUTED = (168, 186, 214)
DIM = (110, 128, 158)
CYAN = (34, 211, 238)
BLUE = (4, 101, 242)
YELLOW = (245, 176, 65)
RED = (248, 113, 113)
GREEN = (52, 211, 153)
ORANGE = (251, 146, 60)
NAVY_LINE = (20, 28, 48)

ADDRESS = "3789 Moon Bay Circle, Wellington, FL 33414"
TARGET = "$411,336"
INCOME = "$432,985"
MARKET = "$580,164"
GAP = "−29.1%"


def font(size: int, weight: int = 600) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(FONT_PATH, size)
    opsz = max(9, min(40, size))
    f.set_variation_by_axes([float(opsz), float(weight)])
    return f


def tw(text: str, fnt: ImageFont.FreeTypeFont) -> int:
    return int(fnt.getlength(text)) if hasattr(fnt, "getlength") else fnt.getbbox(text)[2]


def rr(draw: ImageDraw.ImageDraw, box, radius: int, fill=None, outline=None, width: int = 1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def new_screen() -> Image.Image:
    return Image.new("RGB", (W, H), BG)


def draw_header(img: Image.Image, active_tab: str) -> int:
    """Brand bar + analysis tabs. Returns y under the chrome."""
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W, 64), fill=CHROME)
    if WORDMARK_PATH.is_file():
        wm = Image.open(WORDMARK_PATH).convert("RGBA")
        scale = 28 / wm.height
        wm = wm.resize((max(1, int(wm.width * scale)), 28), Image.LANCZOS)
        img.paste(wm, (20, 18), wm)
    else:
        d.text((20, 18), "DealGapIQ", font=font(22, 800), fill=WHITE)

    # Search field
    sx0, sx1 = 360, 1040
    rr(d, (sx0, 14, sx1, 50), 10, fill=ELEVATED, outline=BORDER)
    d.text((sx0 + 16, 22), "Search any US address…", font=font(15, 500), fill=DIM)

    # Right icons
    for i, label in enumerate(("Map", "Tools")):
        x = 1100 + i * 88
        rr(d, (x, 16, x + 76, 48), 8, fill=ELEVATED, outline=BORDER)
        d.text((x + 18, 22), label, font=font(13, 600), fill=MUTED)

    # Tabs
    d.rectangle((0, 64, W, 112), fill=CARD)
    d.line((0, 112, W, 112), fill=BORDER, width=1)
    tabs = ["Discovery", "Strategy", "Comps", "DealMaker", "Estimator"]
    x = 28
    for tab in tabs:
        fnt = font(16, 700 if tab == active_tab else 500)
        color = CYAN if tab == active_tab else MUTED
        d.text((x, 78), tab, font=fnt, fill=color)
        if tab == active_tab:
            twid = tw(tab, fnt)
            d.line((x, 108, x + twid, 108), fill=BLUE, width=3)
        x += tw(tab, fnt) + 36
    return 112


def draw_address_bar(img: Image.Image, y: int) -> int:
    d = ImageDraw.Draw(img)
    d.rectangle((0, y, W, y + 44), fill=CHROME)
    d.text((28, y + 12), "⌂  " + ADDRESS, font=font(15, 600), fill=WHITE)
    rr(d, (W - 210, y + 8, W - 28, y + 36), 8, fill=BLUE)
    d.text((W - 188, y + 13), "Details", font=font(13, 700), fill=WHITE)
    return y + 44


def draw_house_banner(img: Image.Image, box: tuple[int, int, int, int]) -> None:
    """Stylized dusk house photo — not a phone screenshot."""
    x0, y0, x1, y1 = box
    crop = Image.new("RGB", (x1 - x0, y1 - y0), (18, 28, 48))
    cd = ImageDraw.Draw(crop)
    cw, ch = crop.size
    for y in range(ch):
        t = y / max(1, ch - 1)
        r = int(28 + (90 - 28) * (1 - t))
        g = int(36 + (70 - 36) * (1 - t) * 0.6)
        b = int(58 + (40 - 58) * t)
        cd.line([(0, y), (cw, y)], fill=(r, g, b))
    # lawn
    cd.rectangle((0, int(ch * 0.72), cw, ch), fill=(18, 42, 32))
    # house body
    hx0, hy0, hx1, hy1 = int(cw * 0.22), int(ch * 0.28), int(cw * 0.78), int(ch * 0.78)
    cd.rectangle((hx0, hy0 + 40, hx1, hy1), fill=(226, 228, 232))
    # roof
    cd.polygon(
        [(hx0 - 20, hy0 + 48), ((hx0 + hx1) // 2, hy0 - 8), (hx1 + 20, hy0 + 48)],
        fill=(42, 48, 58),
    )
    # windows
    for wx in (hx0 + 30, (hx0 + hx1) // 2 - 28, hx1 - 90):
        cd.rectangle((wx, hy0 + 70, wx + 56, hy0 + 118), fill=(255, 214, 120))
    cd.rectangle(((hx0 + hx1) // 2 - 22, hy1 - 90, (hx0 + hx1) // 2 + 22, hy1), fill=(70, 52, 40))
    img.paste(crop, (x0, y0))


def draw_price_cards(img: Image.Image, y: int, pad: int = 24) -> int:
    d = ImageDraw.Draw(img)
    cards = [
        ("TARGET BUY", TARGET, "Positive Cashflow", CYAN),
        ("INCOME VALUE", INCOME, "Breakeven", YELLOW),
        ("MARKET PRICE", MARKET, "Market Value or List Price", RED),
    ]
    gap = 16
    card_w = (W - pad * 2 - gap * 2) // 3
    card_h = 150
    for i, (title, value, sub, color) in enumerate(cards):
        x = pad + i * (card_w + gap)
        rr(d, (x, y, x + card_w, y + card_h), 14, fill=CARD, outline=color, width=2)
        d.text((x + 20, y + 16), title, font=font(13, 700), fill=WHITE)
        d.text((x + 20, y + 48), value, font=font(36, 800), fill=color)
        d.text((x + 20, y + 104), sub, font=font(15, 500), fill=MUTED)
    return y + card_h


def draw_gap_bar(img: Image.Image, y: int, pad: int = 24) -> int:
    d = ImageDraw.Draw(img)
    x0, x1 = pad, W - pad
    rr(d, (x0, y, x1, y + 88), 14, fill=CARD, outline=BORDER)
    d.text((x0 + 20, y + 12), f"DEAL GAP  {GAP}", font=font(16, 800), fill=CYAN)
    bar_y = y + 52
    d.line((x0 + 28, bar_y, x1 - 28, bar_y), fill=NAVY_LINE, width=6)
    # markers: target / income left-of-center, market far right
    marks = [
        (0.22, CYAN, "TARGET"),
        (0.32, YELLOW, "INCOME"),
        (0.86, RED, "MARKET"),
    ]
    for t, color, label in marks:
        mx = int(x0 + 28 + t * (x1 - x0 - 56))
        d.ellipse((mx - 8, bar_y - 8, mx + 8, bar_y + 8), fill=color)
        d.text((mx - 22, y + 64), label, font=font(10, 700), fill=color)
    return y + 88


def plate_verdict(kind: str) -> Image.Image:
    img = new_screen()
    y = draw_header(img, "Discovery")
    y = draw_address_bar(img, y)
    pad = 24
    if kind == "hero":
        draw_house_banner(img, (pad, y + 16, W - pad, y + 250))
        y = y + 266
        d = ImageDraw.Draw(img)
        d.text((pad, y), "Investment Overview", font=font(22, 800), fill=WHITE)
        y = draw_price_cards(img, y + 36, pad)
        draw_gap_bar(img, y + 16, pad)
    else:
        d = ImageDraw.Draw(img)
        d.text((pad, y + 20), "Investment Overview", font=font(24, 800), fill=WHITE)
        y = draw_price_cards(img, y + 58, pad)
        y = draw_gap_bar(img, y + 20, pad)
        d = ImageDraw.Draw(img)
        rr(d, (pad, y + 20, W - pad, y + 200), 14, fill=CARD, outline=BORDER)
        d.text((pad + 24, y + 40), "Off-market estimate", font=font(16, 700), fill=CYAN)
        d.text(
            (pad + 24, y + 72),
            "Market Price is an automated estimate, not a live list price.",
            font=font(16, 500),
            fill=MUTED,
        )
        d.text(
            (pad + 24, y + 104),
            "Deal Gap and Price Gap move with that estimate. Adjust in DealMaker to stress-test.",
            font=font(16, 500),
            fill=MUTED,
        )
        rr(d, (pad + 24, y + 148, pad + 220, y + 180), 8, fill=BLUE)
        d.text((pad + 44, y + 154), "What is Deal Gap?", font=font(14, 700), fill=WHITE)
    return img


def _map_base(w: int, h: int, seed: int = 7, heat: bool = False) -> Image.Image:
    rng = random.Random(seed)
    m = Image.new("RGB", (w, h), (16, 28, 42) if not heat else (12, 18, 30))
    d = ImageDraw.Draw(m)
    # water blob
    d.ellipse((int(w * 0.55), int(h * 0.35), int(w * 0.98), int(h * 0.95)), fill=(10, 40, 68))
    # streets
    for i in range(18):
        y = int(h * (0.05 + i * 0.055))
        d.line([(0, y), (w, y + int(math.sin(i) * 8))], fill=(28, 44, 62), width=2)
    for i in range(14):
        x = int(w * (0.04 + i * 0.07))
        d.line([(x, 0), (x + int(math.cos(i) * 10), h)], fill=(28, 44, 62), width=2)
    if heat:
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        cells = [
            (0.15, 0.20, RED, 160),
            (0.32, 0.45, ORANGE, 140),
            (0.50, 0.30, YELLOW, 130),
            (0.68, 0.55, GREEN, 120),
            (0.22, 0.70, ORANGE, 110),
            (0.80, 0.25, CYAN, 100),
            (0.42, 0.72, RED, 90),
        ]
        for cx, cy, color, rad in cells:
            px, py = int(cx * w), int(cy * h)
            for k in range(6, 0, -1):
                r = int(rad * k / 6)
                a = int(55 * (1 - k / 7))
                od.ellipse((px - r, py - r, px + r, py + r), fill=(*color, a))
        overlay = overlay.filter(ImageFilter.GaussianBlur(18))
        m = Image.alpha_composite(m.convert("RGBA"), overlay).convert("RGB")
        d = ImageDraw.Draw(m)
    return m


def _pins(img: Image.Image, box, colors: list, count: int, seed: int) -> None:
    rng = random.Random(seed)
    x0, y0, x1, y1 = box
    d = ImageDraw.Draw(img)
    for _ in range(count):
        x = rng.randint(x0 + 20, x1 - 20)
        y = rng.randint(y0 + 20, y1 - 20)
        c = rng.choice(colors)
        d.ellipse((x - 7, y - 7, x + 7, y + 7), fill=c, outline=(8, 10, 16))


def draw_filter_panel(img: Image.Image, box, selected: list[str] | None = None) -> None:
    x0, y0, x1, y1 = box
    d = ImageDraw.Draw(img)
    rr(d, box, 12, fill=CARD, outline=BORDER)
    d.text((x0 + 16, y0 + 14), "Filters", font=font(16, 800), fill=WHITE)
    statuses = [
        ("Active", GREEN, "active" in (selected or ["active"])),
        ("Owner listed", CYAN, "owner" in (selected or [])),
        ("Foreclosure", RED, "foreclosure" in (selected or [])),
        ("Auction", ORANGE, "auction" in (selected or [])),
        ("Pre-Foreclosure", YELLOW, "pre" in (selected or [])),
    ]
    y = y0 + 50
    for label, color, on in statuses:
        fill = (*color, ) if False else (ELEVATED if not on else (20, 36, 56))
        outline = color if on else BORDER
        rr(d, (x0 + 14, y, x1 - 14, y + 36), 8, fill=fill, outline=outline, width=2)
        d.ellipse((x0 + 26, y + 12, x0 + 38, y + 24), fill=color)
        d.text((x0 + 48, y + 8), label, font=font(14, 600), fill=WHITE if on else MUTED)
        y += 44


def plate_map(mode: str) -> Image.Image:
    img = new_screen()
    y = draw_header(img, "Discovery")
    pad = 16
    panel_w = 260
    map_box = (pad + panel_w + 12, y + pad, W - pad, H - pad)
    selected = {
        "search": ["active"],
        "coverage": ["foreclosure", "auction", "pre"],
        "heat": ["active"],
    }[mode]
    draw_filter_panel(img, (pad, y + pad, pad + panel_w, y + pad + 320), selected)

    mw = map_box[2] - map_box[0]
    mh = map_box[3] - map_box[1]
    heat = mode == "heat"
    m = _map_base(mw, mh, seed=3 if mode != "coverage" else 11, heat=heat)
    img.paste(m, (map_box[0], map_box[1]))
    # clip rounded look via border
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(map_box, radius=12, outline=BORDER, width=2)

    if mode == "search":
        _pins(img, map_box, [GREEN, YELLOW, RED, CYAN, ORANGE], 42, seed=4)
    elif mode == "coverage":
        _pins(img, map_box, [RED, ORANGE, YELLOW], 28, seed=9)
    else:
        _pins(img, map_box, [RED, ORANGE, YELLOW, GREEN, CYAN], 18, seed=2)

    # legend
    lx0, ly0 = map_box[0] + 16, map_box[3] - 150
    rr(d, (lx0, ly0, lx0 + 220, map_box[3] - 16), 10, fill=CARD, outline=BORDER)
    d.text((lx0 + 12, ly0 + 8), "Marker color", font=font(12, 700), fill=WHITE)
    rows = (
        [("Active", GREEN), ("30+ DOM", YELLOW), ("Distressed", RED)]
        if mode != "coverage"
        else [("Foreclosure", RED), ("Auction", ORANGE), ("Pre-Foreclosure", YELLOW)]
    )
    if mode == "heat":
        rows = [("Hot", RED), ("Warm", ORANGE), ("Cool", CYAN)]
    yy = ly0 + 32
    for label, color in rows:
        d.ellipse((lx0 + 14, yy + 4, lx0 + 26, yy + 16), fill=color)
        d.text((lx0 + 34, yy), label, font=font(13, 600), fill=MUTED)
        yy += 26

    if mode == "search":
        # preview card
        px0, py0 = map_box[2] - 340, map_box[3] - 170
        rr(d, (px0, py0, map_box[2] - 16, map_box[3] - 16), 12, fill=CARD, outline=GREEN, width=2)
        d.text((px0 + 16, py0 + 14), "DEAL", font=font(13, 800), fill=GREEN)
        d.text((px0 + 16, py0 + 40), "4407 Deer Creek Blvd", font=font(15, 700), fill=WHITE)
        d.text((px0 + 16, py0 + 64), "Austin, TX  ·  $412,000", font=font(13, 500), fill=MUTED)
        d.text((px0 + 16, py0 + 96), "Target Buy  $318,400", font=font(13, 600), fill=CYAN)
    if mode == "heat":
        hx0, hy0 = map_box[0] + 16, map_box[1] + 16
        rr(d, (hx0, hy0, hx0 + 300, hy0 + 130), 12, fill=CARD, outline=BORDER)
        d.text((hx0 + 16, hy0 + 14), "South Congress", font=font(18, 800), fill=WHITE)
        d.text((hx0 + 16, hy0 + 48), "Neighborhood score  86", font=font(14, 600), fill=CYAN)
        d.text((hx0 + 16, hy0 + 76), "14 scored listings  ·  3 DEAL", font=font(13, 500), fill=MUTED)
    if mode == "coverage":
        d.text((map_box[0] + 20, map_box[1] + 16), "Austin · Distressed inventory", font=font(16, 700), fill=WHITE)
    return img


def plate_list() -> Image.Image:
    img = new_screen()
    y = draw_header(img, "Discovery")
    d = ImageDraw.Draw(img)
    pad = 24
    d.text((pad, y + 18), "Scored listings", font=font(22, 800), fill=WHITE)
    d.text((pad, y + 50), "Every pin graded before you open the comps.", font=font(14, 500), fill=MUTED)

    rows = [
        ("4407 Deer Creek Blvd, Austin, TX", "$412,000", "DEAL", GREEN, "3/2 · 1,640 sf"),
        ("11802 Metric Blvd, Austin, TX", "$389,500", "DEAL", GREEN, "3/2 · 1,512 sf"),
        ("8901 N Lamar, Austin, TX", "$525,000", "MAYBE", YELLOW, "4/2 · 1,980 sf"),
        ("6100 Bridlewood, Austin, TX", "$610,000", "MAYBE", YELLOW, "4/3 · 2,210 sf"),
        ("2504 E 12th St, Austin, TX", "$749,000", "PASS", RED, "3/2 · 1,420 sf"),
        ("701 W 6th St, Austin, TX", "$890,000", "PASS", RED, "2/2 · 1,105 sf"),
    ]
    header_y = y + 88
    cols = [(pad, "Address"), (pad + 620, "Price"), (pad + 820, "Verdict"), (pad + 1020, "Facts")]
    for x, label in cols:
        d.text((x, header_y), label, font=font(12, 700), fill=DIM)
    d.line((pad, header_y + 28, W - pad, header_y + 28), fill=BORDER, width=1)

    row_h = 78
    for i, (addr, price, verdict, color, facts) in enumerate(rows):
        ry = header_y + 36 + i * row_h
        bg = CARD if i % 2 == 0 else ELEVATED
        rr(d, (pad, ry, W - pad, ry + row_h - 8), 10, fill=bg)
        # thumb
        d.rounded_rectangle((pad + 12, ry + 12, pad + 72, ry + 58), 6, fill=(40, 52, 70))
        d.text((pad + 88, ry + 14), addr, font=font(16, 700), fill=WHITE)
        d.text((pad + 88, ry + 40), facts, font=font(13, 500), fill=MUTED)
        d.text((pad + 620, ry + 24), price, font=font(16, 700), fill=WHITE)
        rr(d, (pad + 820, ry + 20, pad + 920, ry + 50), 14, fill=(color[0] // 5, color[1] // 5, color[2] // 5), outline=color)
        d.text((pad + 838, ry + 26), verdict, font=font(13, 800), fill=color)
    return img


def plate_comps() -> Image.Image:
    img = new_screen()
    y = draw_header(img, "Comps")
    y = draw_address_bar(img, y)
    d = ImageDraw.Draw(img)
    pad = 24
    d.text((pad, y + 16), "Sale comps", font=font(22, 800), fill=WHITE)
    d.text((W - 420, y + 20), "Subject value  $432,000", font=font(16, 700), fill=CYAN)

    # subject card
    rr(d, (pad, y + 56, 520, H - pad), 14, fill=CARD, outline=CYAN, width=2)
    draw_house_banner(img, (pad + 12, y + 68, 508, y + 250))
    d = ImageDraw.Draw(img)
    d.text((pad + 20, y + 268), "SUBJECT", font=font(12, 800), fill=CYAN)
    d.text((pad + 20, y + 292), ADDRESS.split(",")[0], font=font(16, 700), fill=WHITE)
    d.text((pad + 20, y + 322), "4 bd  ·  3 ba  ·  2,184 sf", font=font(14, 500), fill=MUTED)
    d.text((pad + 20, y + 360), MARKET, font=font(28, 800), fill=WHITE)
    d.text((pad + 20, y + 404), "IQ Estimate average of in-range sources", font=font(13, 500), fill=DIM)

    comps = [
        ("4122 Moon Bay Cir", "$565,000", "0.2 mi", "2,040 sf", True),
        ("3901 Greenview Dr", "$548,500", "0.4 mi", "2,110 sf", True),
        ("1888 Polo Rd", "$601,000", "0.6 mi", "2,320 sf", True),
        ("220 Coconut Ln", "$529,000", "0.8 mi", "1,980 sf", False),
        ("7448 Lake Worth Rd", "$590,000", "1.1 mi", "2,260 sf", True),
    ]
    tx = 548
    d.text((tx, y + 56), "Comparables", font=font(16, 800), fill=WHITE)
    hy = y + 88
    for x, label in ((tx, "Address"), (tx + 280, "Sold"), (tx + 430, "Dist"), (tx + 540, "Size")):
        d.text((x, hy), label, font=font(12, 700), fill=DIM)
    for i, (addr, sold, dist, size, keep) in enumerate(comps):
        ry = hy + 28 + i * 72
        rr(d, (tx, ry, W - pad, ry + 64), 10, fill=CARD if i % 2 == 0 else ELEVATED, outline=BORDER)
        mark = GREEN if keep else DIM
        d.ellipse((tx + 14, ry + 24, tx + 30, ry + 40), fill=mark)
        d.text((tx + 42, ry + 20), addr, font=font(15, 700), fill=WHITE)
        d.text((tx + 280, ry + 20), sold, font=font(15, 700), fill=WHITE)
        d.text((tx + 430, ry + 20), dist, font=font(14, 500), fill=MUTED)
        d.text((tx + 540, ry + 20), size, font=font(14, 500), fill=MUTED)
    return img


def plate_dealmaker() -> Image.Image:
    img = new_screen()
    y = draw_header(img, "DealMaker")
    y = draw_address_bar(img, y)
    d = ImageDraw.Draw(img)
    pad = 24

    # left sliders
    rr(d, (pad, y + 16, 760, H - pad), 14, fill=CARD, outline=BORDER)
    d.text((pad + 24, y + 36), "Scenario", font=font(20, 800), fill=WHITE)
    sliders = [
        ("Purchase Price", "$411,000", 0.42, CYAN),
        ("Rehab Budget", "$28,000", 0.22, YELLOW),
        ("ARV", "$580,000", 0.70, RED),
        ("Down Payment", "25%", 0.25, BLUE),
        ("Interest Rate", "6.8%", 0.40, MUTED),
    ]
    sy = y + 84
    for label, value, t, color in sliders:
        d.text((pad + 24, sy), label, font=font(14, 600), fill=MUTED)
        d.text((700 - tw(value, font(16, 800)), sy), value, font=font(16, 800), fill=WHITE)
        bar_y = sy + 32
        d.line((pad + 24, bar_y, 736, bar_y), fill=NAVY_LINE, width=6)
        mx = int(pad + 24 + t * (736 - pad - 24))
        d.ellipse((mx - 9, bar_y - 9, mx + 9, bar_y + 9), fill=color)
        sy += 78

    # right metrics
    rx0 = 784
    rr(d, (rx0, y + 16, W - pad, y + 250), 14, fill=CARD, outline=GREEN, width=2)
    d.text((rx0 + 24, y + 36), "NET PROFIT", font=font(14, 700), fill=MUTED)
    d.text((rx0 + 24, y + 70), "$168,240", font=font(48, 800), fill=GREEN)
    d.text((rx0 + 24, y + 140), "After rehab, closing, and sale costs", font=font(14, 500), fill=DIM)
    d.text((rx0 + 24, y + 180), "ROI  41%     Months to profit  7", font=font(16, 700), fill=WHITE)

    metrics = [
        ("Cash flow / mo", "+$412", CYAN),
        ("Cap rate", "6.4%", YELLOW),
        ("CoC return", "8.1%", GREEN),
        ("Deal Gap", GAP, RED),
    ]
    mw = (W - pad - rx0 - 16) // 2
    for i, (label, value, color) in enumerate(metrics):
        col, row = i % 2, i // 2
        x = rx0 + col * (mw + 8)
        yy = y + 270 + row * 150
        rr(d, (x, yy, x + mw, yy + 136), 14, fill=CARD, outline=BORDER)
        d.text((x + 20, yy + 20), label, font=font(14, 600), fill=MUTED)
        d.text((x + 20, yy + 56), value, font=font(32, 800), fill=color)
    return img


PLATES = [
    ("01-hero.png", lambda: plate_verdict("hero")),
    ("02-search.png", lambda: plate_map("search")),
    ("03-verdict.png", lambda: plate_verdict("cards")),
    ("04-pills.png", plate_list),
    ("05-coverage.png", lambda: plate_map("coverage")),
    ("06-comps.png", plate_comps),
    ("07-dealmaker.png", plate_dealmaker),
    ("08-heatmap.png", lambda: plate_map("heat")),
]


def main() -> None:
    if not Path(FONT_PATH).is_file():
        raise FileNotFoundError(f"DM Sans not found at {FONT_PATH}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Desktop plates → {OUT_DIR} ({W}x{H})")
    for name, builder in PLATES:
        img = builder()
        out = OUT_DIR / name
        img.save(out, "PNG", optimize=True)
        print(f"  wrote {name}")
    print(f"Done — {len(PLATES)} desktop plates.")


if __name__ == "__main__":
    main()
