#!/usr/bin/env python3
"""Build Mac App Store landscape screenshots (2880×1800, 16:10).

Composites, per slot:
  - Dark navy brand canvas with a radial brand glow
  - A top copy band: wordmark eyebrow, headline, subhead, coverage badge
  - A wide macOS window containing a real desktop capture from
    assets/mac-desktop/ (Playwright, 1440×900 @2x)

The capture is *cropped*, never shrunk to fit. A 16:10 source inside a 16:10
frame has to give up scale for every pixel of margin or copy, so shrinking it
to sit beside a text column renders the UI at ~60% and leaves a third of the
frame empty. Cropping a wide band off the top of the capture keeps the UI near
90% scale and fills the frame.

Capture plates first:
    node scripts/screenshots/capture-mac.mjs

Then:
    python3 apply_mac_screenshot_brand.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

THIS_DIR = Path(__file__).resolve().parent
OUT_DIR = THIS_DIR / "screenshots-mac"
DESKTOP_DIR = THIS_DIR / "assets" / "mac-desktop"
WORDMARK_PATH = THIS_DIR.parent / "play-store" / "assets" / "dealgapiq-wordmark-darkmode.png"
_FONT_CANDIDATES = (
    THIS_DIR / "assets" / "fonts" / "DMSans-Variable.ttf",
    Path("/tmp/dm-sans-fonts/DMSans-Variable.ttf"),
)
FONT_PATH = next((str(p) for p in _FONT_CANDIDATES if p.is_file()), str(_FONT_CANDIDATES[0]))

TARGET_W = 2880
TARGET_H = 1800

INK = (27, 33, 65, 255)
BLUE = (4, 101, 242, 255)
WHITE = (255, 255, 255, 255)
SUBHEAD_COLOR = (163, 189, 226, 255)
NAVY_TOP = (11, 20, 44)
NAVY_BOTTOM = (3, 7, 20)
CYAN_GLOW = (34, 211, 238)
TITLEBAR_TOP = (44, 49, 62, 255)
TITLEBAR_BOTTOM = (32, 36, 47, 255)
WINDOW_EDGE = (58, 64, 78, 255)

# Layout ---------------------------------------------------------------------
MARGIN_X = 150
WORDMARK_Y = 118
WORDMARK_W = 292
HEADLINE_SIZE = 104
HEADLINE_LEADING = 114
SUBHEAD_SIZE = 42
WINDOW_TOP = 700
WINDOW_BOTTOM = 1730
TITLEBAR_H = 56
CORNER = 22

WINDOW_W = TARGET_W - MARGIN_X * 2
WINDOW_H = WINDOW_BOTTOM - WINDOW_TOP
CONTENT_W = WINDOW_W
CONTENT_H = WINDOW_H - TITLEBAR_H

# Story order. "source" is a plate in assets/mac-desktop/.
MAC_CONFIGS = [
    {
        "output_name": "01-hero-investors-lens.png",
        "headline_lines": ["Discover Deals", "Like an Investor"],
        "subhead": "Desktop analysis for every US listing — MLS, foreclosure, auction.",
        "source": "01-hero.png",
    },
    {
        "output_name": "02-search-color-coded.png",
        "headline_lines": ["Color-coded deals", "at a glance."],
        "subhead": "Green means the numbers work. Orange means they don't — yet.",
        "source": "02-search.png",
    },
    {
        "output_name": "03-coverage-beyond-mls.png",
        "headline_lines": ["Beyond", "the MLS."],
        "subhead": "Foreclosure, pre-foreclosure and auction — scored alongside MLS.",
        "source": "05-coverage.png",
    },
    {
        "output_name": "04-sorted-by-opportunity.png",
        "headline_lines": ["412 listings,", "sorted by opportunity."],
        "subhead": "Every home ranked before you open a single comp.",
        "source": "04-pills.png",
    },
    {
        "output_name": "05-verdict-close-the-gap.png",
        "headline_lines": ["The whole deal,", "in one view."],
        "subhead": "See the gap, then four ways to close it — side by side.",
        "source": "03-verdict.png",
    },
    {
        "output_name": "06-strategy-workbench.png",
        "headline_lines": ["Pick an option.", "Watch it work."],
        "subhead": "Four structures that close the gap, each pre-filled into the worksheet.",
        "source": "12-strategy.png",
    },
    {
        "output_name": "07-dealmaker-brrrr.png",
        "headline_lines": ["Model BRRRR", "in real time."],
        "subhead": "All-in cost, cash out, capital recycled — recalculated as you drag.",
        "source": "09-brrrr.png",
    },
    {
        "output_name": "08-estimator-rehab.png",
        "headline_lines": ["Know the", "repair bill."],
        "subhead": "Rehab estimates with regional cost factors and a contingency reserve.",
        "source": "11-estimator.png",
    },
    {
        "output_name": "09-lender-directory.png",
        "headline_lines": ["484 verified", "hard money lenders."],
        "subhead": "Filter by loan product, deal size and credit policy — then call direct.",
        "source": "13-lenders.png",
    },
    {
        "output_name": "10-cash-buyer-directory.png",
        "headline_lines": ["2,812 cash buyers,", "nationwide."],
        "subhead": "Skip the cold outreach. Search by city, county or ZIP and connect direct.",
        "source": "14-buyers.png",
    },
]


def load_font(size: int, weight: int = 800) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(FONT_PATH, size)
    opsz = max(9, min(40, size))
    f.set_variation_by_axes([float(opsz), float(weight)])
    return f


def text_width(text: str, font: ImageFont.FreeTypeFont, tracking_em: float = 0.0) -> float:
    if not text:
        return 0.0
    w = 0.0
    for ch in text:
        bbox = font.getbbox(ch)
        w += bbox[2] - bbox[0]
    if len(text) > 1:
        w += tracking_em * font.size * (len(text) - 1)
    return w


def draw_text_tracked(
    draw: ImageDraw.ImageDraw,
    position: tuple[float, float],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple,
    tracking_em: float = 0.0,
) -> float:
    x, y = position
    tracking_px = tracking_em * font.size
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        bbox = font.getbbox(ch)
        x += (bbox[2] - bbox[0]) + tracking_px
    return x


def build_navy_canvas() -> Image.Image:
    canvas = Image.new("RGB", (TARGET_W, TARGET_H), NAVY_TOP)
    draw = ImageDraw.Draw(canvas)
    for y in range(TARGET_H):
        ratio = y / TARGET_H
        r = int(NAVY_TOP[0] * (1 - ratio) + NAVY_BOTTOM[0] * ratio)
        g = int(NAVY_TOP[1] * (1 - ratio) + NAVY_BOTTOM[1] * ratio)
        b = int(NAVY_TOP[2] * (1 - ratio) + NAVY_BOTTOM[2] * ratio)
        draw.line([(0, y), (TARGET_W, y)], fill=(r, g, b))
    return canvas.convert("RGBA")


def add_radial_cyan_glow(
    canvas: Image.Image,
    center_x: int,
    center_y: int,
    radius: int,
    intensity: float = 0.22,
) -> None:
    overlay = Image.new("RGBA", (TARGET_W, TARGET_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    steps = max(1, radius // 10)
    for i in range(steps, 0, -1):
        r = int(radius * (i / steps))
        alpha = int(intensity * 255 * (1 - i / steps) ** 1.4)
        draw.ellipse(
            (center_x - r, center_y - r, center_x + r, center_y + r),
            fill=(*CYAN_GLOW, alpha),
        )
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=48))
    canvas.alpha_composite(overlay)


def add_wordmark(canvas: Image.Image, y: int) -> int:
    """Screen-blend the wordmark.

    The asset is opaque RGB — light lettering matted onto pure black, with no
    alpha channel — so pasting it stamps a black rectangle onto the gradient.
    Screening adds only the lettering and leaves the black background inert.
    """
    if not WORDMARK_PATH.is_file():
        return y
    wm = Image.open(WORDMARK_PATH).convert("RGB")
    height = int(wm.height * (WORDMARK_W / wm.width))
    wm = wm.resize((WORDMARK_W, height), Image.LANCZOS)

    box = (MARGIN_X, y, MARGIN_X + WORDMARK_W, y + height)
    region = canvas.crop(box).convert("RGB")
    blended = ImageChops.screen(region, wm).convert("RGBA")
    canvas.paste(blended, box)
    return y + height


def add_headline(canvas: Image.Image, lines: list[str], top_y: int) -> int:
    draw = ImageDraw.Draw(canvas)
    font = load_font(HEADLINE_SIZE, 800)
    y = top_y
    for line in lines:
        draw_text_tracked(draw, (MARGIN_X, y), line, font, WHITE, tracking_em=-0.022)
        y += HEADLINE_LEADING
    return y


def add_subhead(canvas: Image.Image, text: str, top_y: int, max_width: int = 1900) -> int:
    draw = ImageDraw.Draw(canvas)
    font = load_font(SUBHEAD_SIZE, 500)
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        trial = f"{cur} {word}".strip()
        if text_width(trial, font, tracking_em=-0.01) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    y = top_y
    for line in lines:
        draw_text_tracked(draw, (MARGIN_X, y), line, font, SUBHEAD_COLOR, tracking_em=-0.01)
        y += int(SUBHEAD_SIZE * 1.32)
    return y


def add_off_mls_badge(canvas: Image.Image, top_y: int) -> int:
    draw = ImageDraw.Draw(canvas)
    font = load_font(28, 600)
    parts = ["MLS", "Foreclosure", "Pre-Foreclosure", "Auction"]
    sep = "  ·  "
    text = sep.join(parts)
    pad_x, pad_y = 26, 16
    tw = text_width(text, font, tracking_em=-0.01)
    box_w = int(tw + pad_x * 2)
    box_h = 28 + pad_y * 2
    x0, y0 = MARGIN_X, top_y
    draw.rounded_rectangle((x0, y0, x0 + box_w, y0 + box_h), radius=box_h // 2, fill=WHITE)
    x = x0 + pad_x
    y = y0 + pad_y - 3
    for i, part in enumerate(parts):
        draw_text_tracked(draw, (x, y), part, font, INK, tracking_em=-0.01)
        x += text_width(part, font, tracking_em=-0.01)
        if i < len(parts) - 1:
            draw_text_tracked(draw, (x, y), sep, font, BLUE, tracking_em=-0.01)
            x += text_width(sep, font, tracking_em=-0.01)
    return y0 + box_h


def crop_content_band(plate: Image.Image) -> Image.Image:
    """Take a full-width band off the capture and scale it to the content pane.

    Width always maps 1:1 to the pane (no horizontal distortion). Only the
    height of the band is chosen, so the UI keeps its true aspect ratio.
    """
    src = plate.convert("RGB")
    sw, sh = src.size
    scale = CONTENT_W / sw
    band_h = min(sh, int(round(CONTENT_H / scale)))
    band = src.crop((0, 0, sw, band_h))
    return band.resize((CONTENT_W, CONTENT_H), Image.LANCZOS).convert("RGBA")


def rounded_mask(size: tuple[int, int], radius: int, corners: tuple[bool, bool, bool, bool]) -> Image.Image:
    """Mask with per-corner rounding: (top-left, top-right, bottom-right, bottom-left)."""
    w, h = size
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=radius, fill=255, corners=corners)
    return mask


def add_window_shadow(canvas: Image.Image) -> None:
    shadow = Image.new("RGBA", (TARGET_W, TARGET_H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        (MARGIN_X, WINDOW_TOP + 26, MARGIN_X + WINDOW_W, WINDOW_BOTTOM + 26),
        radius=CORNER,
        fill=(0, 0, 0, 170),
    )
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(radius=44)))


def build_titlebar() -> Image.Image:
    bar = Image.new("RGBA", (WINDOW_W, TITLEBAR_H), TITLEBAR_TOP)
    d = ImageDraw.Draw(bar)
    for y in range(TITLEBAR_H):
        ratio = y / TITLEBAR_H
        r = int(TITLEBAR_TOP[0] * (1 - ratio) + TITLEBAR_BOTTOM[0] * ratio)
        g = int(TITLEBAR_TOP[1] * (1 - ratio) + TITLEBAR_BOTTOM[1] * ratio)
        b = int(TITLEBAR_TOP[2] * (1 - ratio) + TITLEBAR_BOTTOM[2] * ratio)
        d.line([(0, y), (WINDOW_W, y)], fill=(r, g, b, 255))

    lights = [(255, 95, 86), (255, 189, 46), (39, 201, 63)]
    cx, cy, r = 34, TITLEBAR_H // 2, 9
    for color in lights:
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*color, 255))
        cx += 30

    font = load_font(24, 600)
    label = "DealGapIQ"
    lw = text_width(label, font)
    draw_text_tracked(d, ((WINDOW_W - lw) / 2, cy - 15), label, font, (205, 214, 232, 255))

    # Hairline along the top edge reads as the window catching the light.
    d.line([(CORNER, 0), (WINDOW_W - CORNER, 0)], fill=(255, 255, 255, 46))
    bar.putalpha(rounded_mask((WINDOW_W, TITLEBAR_H), CORNER, (True, True, False, False)))
    return bar


def add_window(canvas: Image.Image, plate: Image.Image) -> None:
    add_window_shadow(canvas)

    body = Image.new("RGBA", (WINDOW_W, WINDOW_H), WINDOW_EDGE)
    body.putalpha(rounded_mask((WINDOW_W, WINDOW_H), CORNER, (True, True, True, True)))
    canvas.alpha_composite(body, (MARGIN_X, WINDOW_TOP))

    canvas.alpha_composite(build_titlebar(), (MARGIN_X, WINDOW_TOP))

    content = crop_content_band(plate)
    content.putalpha(rounded_mask((CONTENT_W, CONTENT_H), CORNER, (False, False, True, True)))
    canvas.alpha_composite(content, (MARGIN_X, WINDOW_TOP + TITLEBAR_H))


def build_mac_screenshot(cfg: dict) -> None:
    canvas = build_navy_canvas()
    add_radial_cyan_glow(canvas, int(TARGET_W * 0.5), int(TARGET_H * 0.30), 1150, intensity=0.17)

    y = add_wordmark(canvas, WORDMARK_Y)
    y = add_headline(canvas, cfg["headline_lines"], top_y=y + 52)
    y = add_subhead(canvas, cfg["subhead"], top_y=y + 18)
    add_off_mls_badge(canvas, top_y=y + 26)

    plate_path = DESKTOP_DIR / cfg["source"]
    if not plate_path.is_file():
        raise FileNotFoundError(
            f"Missing desktop plate: {plate_path}\n"
            "Capture first: node scripts/screenshots/capture-mac.mjs"
        )
    add_window(canvas, Image.open(plate_path))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / cfg["output_name"]
    canvas.convert("RGB").save(out, "PNG", optimize=True)
    print(f"Wrote: {out.relative_to(THIS_DIR)}  ({TARGET_W}x{TARGET_H})")


def main() -> None:
    if not Path(FONT_PATH).is_file():
        raise FileNotFoundError(
            f"DM Sans not found at {FONT_PATH}. Place DMSans-Variable.ttf under assets/fonts/"
        )
    missing = [c["source"] for c in MAC_CONFIGS if not (DESKTOP_DIR / c["source"]).is_file()]
    if missing:
        raise FileNotFoundError(
            "Missing desktop plates: "
            + ", ".join(missing)
            + "\nCapture first: node scripts/screenshots/capture-mac.mjs"
        )

    print(f"Font: {FONT_PATH}")
    print(f"Mac screenshots → {OUT_DIR} ({TARGET_W}x{TARGET_H})")
    for cfg in MAC_CONFIGS:
        build_mac_screenshot(cfg)
    print(f"\nDone — {len(MAC_CONFIGS)} Mac App Store screenshots.")


if __name__ == "__main__":
    main()
