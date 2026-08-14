#!/usr/bin/env python3
"""Build Mac App Store landscape screenshots (2880×1800, 16:10).

Composites:
  - Dark navy brand canvas
  - Left / top typography (DM Sans)
  - A Mac window chrome containing the matching iPhone marketing plate
    (or the real Strategy-tab hero screenshot for slot #1)
  - DealGapIQ wordmark + Off-MLS badge

Usage:
    python3 apply_mac_screenshot_brand.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

THIS_DIR = Path(__file__).resolve().parent
OUT_DIR = THIS_DIR / "screenshots-mac"
IPHONE_DIR = THIS_DIR / "screenshots"
WORDMARK_PATH = THIS_DIR.parent / "play-store" / "assets" / "dealgapiq-wordmark-darkmode.png"
HERO_SCREENSHOT_PATH = THIS_DIR / "assets" / "hero-screenshot-strategy-tab.png"
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
SUBHEAD_COLOR = (170, 195, 230, 255)
NAVY_TOP = (10, 18, 40)
NAVY_BOTTOM = (4, 8, 22)
CYAN_GLOW = (34, 211, 238)
TITLEBAR = (28, 32, 44, 255)
WINDOW_EDGE = (18, 20, 28, 255)

# Same story order as iPhone / iPad; Mac-tuned subheads.
MAC_CONFIGS = [
    {
        "output_name": "01-hero-investors-lens.png",
        "headline_lines": ["Discover Deals", "Like an Investor"],
        "subhead": "Desktop analysis for every US listing — MLS, foreclosure, auction.",
        "source": "hero",
    },
    {
        "output_name": "02-search-color-coded.png",
        "headline_lines": ["Color-coded deals", "at a glance."],
        "subhead": "Green is go. Yellow needs work. Red is no.",
        "source": "02-search-color-coded.png",
    },
    {
        "output_name": "03-verdict-three-cards.png",
        "headline_lines": ["The whole deal,", "in one view."],
        "subhead": "Target Buy. Income Value. Market Price — on a wide desktop canvas.",
        "source": "03-verdict-three-cards.png",
    },
    {
        "output_name": "04-pills-deal-maybe-pass.png",
        "headline_lines": ["DEAL. MAYBE.", "PASS — fast."],
        "subhead": "Every listing scored before you open the comps.",
        "source": "04-pills-deal-maybe-pass.png",
    },
    {
        "output_name": "05-coverage-beyond-mls.png",
        "headline_lines": ["Beyond", "the MLS."],
        "subhead": "Foreclosure, Pre-Foreclosure, Auction — scored alongside MLS.",
        "source": "05-coverage-beyond-mls.png",
    },
    {
        "output_name": "06-comps-no-spreadsheet.png",
        "headline_lines": ["Comps without", "the spreadsheet."],
        "subhead": "Real comparables, pulled in seconds on your Mac.",
        "source": "06-comps-no-spreadsheet.png",
    },
    {
        "output_name": "07-dealmaker-scenarios.png",
        "headline_lines": ["Model deals", "in real time."],
        "subhead": "Adjust price, rehab, ARV — see profit live.",
        "source": "07-dealmaker-scenarios.png",
    },
    {
        "output_name": "08-neighborhoods-heatmap.png",
        "headline_lines": ["See where", "the deals are."],
        "subhead": "Heatmaps reveal the hottest neighborhoods.",
        "source": "08-neighborhoods-heatmap.png",
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


def add_headline(canvas: Image.Image, lines: list[str], top_y: int, font_size: int = 92) -> int:
    draw = ImageDraw.Draw(canvas)
    font = load_font(font_size, 800)
    y = top_y
    for line in lines:
        w = text_width(line, font, tracking_em=-0.02)
        x = 120
        draw_text_tracked(draw, (x, y), line, font, WHITE, tracking_em=-0.02)
        y += font_size + 8
        _ = w
    return y


def add_subhead(canvas: Image.Image, text: str, top_y: int, max_width: int = 980) -> int:
    draw = ImageDraw.Draw(canvas)
    font = load_font(36, 500)
    # Simple wrap
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
        draw_text_tracked(draw, (120, y), line, font, SUBHEAD_COLOR, tracking_em=-0.01)
        y += 46
    return y


def add_wordmark(canvas: Image.Image, target_y: int, target_w: int = 420) -> int:
    if not WORDMARK_PATH.is_file():
        return target_y
    wm = Image.open(WORDMARK_PATH).convert("RGBA")
    scale = target_w / wm.width
    wm = wm.resize((target_w, int(wm.height * scale)), Image.LANCZOS)
    canvas.alpha_composite(wm, (120, target_y))
    return target_y + wm.height


def add_off_mls_badge(canvas: Image.Image, target_y: int) -> None:
    draw = ImageDraw.Draw(canvas)
    font = load_font(26, 600)
    parts = ["MLS", "Foreclosure", "Pre-Foreclosure", "Auction"]
    gap = 18
    sep = "  ·  "
    text = sep.join(parts)
    pad_x, pad_y = 22, 14
    tw = text_width(text, font, tracking_em=-0.01)
    box_w = int(tw + pad_x * 2)
    box_h = 26 + pad_y * 2
    x0, y0 = 120, target_y
    draw.rounded_rectangle((x0, y0, x0 + box_w, y0 + box_h), radius=box_h // 2, fill=WHITE)
    # Draw with blue separators by segment
    x = x0 + pad_x
    y = y0 + pad_y - 2
    for i, part in enumerate(parts):
        draw_text_tracked(draw, (x, y), part, font, INK, tracking_em=-0.01)
        x += text_width(part, font, tracking_em=-0.01)
        if i < len(parts) - 1:
            draw_text_tracked(draw, (x, y), sep, font, BLUE, tracking_em=-0.01)
            x += text_width(sep, font, tracking_em=-0.01)


def fit_content_preserve_aspect(
    content: Image.Image,
    box_w: int,
    box_h: int,
    fill: tuple[int, int, int] = NAVY_TOP,
) -> Image.Image:
    """Scale content to fit inside box_w×box_h without stretching (letterbox)."""
    src = content.convert("RGB")
    sw, sh = src.size
    if sw <= 0 or sh <= 0:
        raise ValueError("content has empty dimensions")
    scale = min(box_w / sw, box_h / sh)
    nw = max(1, int(round(sw * scale)))
    nh = max(1, int(round(sh * scale)))
    fitted = src.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGB", (box_w, box_h), fill)
    canvas.paste(fitted, ((box_w - nw) // 2, (box_h - nh) // 2))
    return canvas.convert("RGBA")


def window_size_for_content(
    content: Image.Image,
    max_w: int = 1580,
    max_h: int = 1320,
    title_h: int = 44,
) -> tuple[int, int, int, int]:
    """Pick a Mac window whose content pane matches the source aspect ratio.

    Returns (window_w, window_h, content_w, content_h). Never stretches.
    """
    sw, sh = content.size
    # Leave room for the title bar inside max_h.
    max_content_h = max_h - title_h
    scale = min(max_w / sw, max_content_h / sh)
    content_w = max(1, int(round(sw * scale)))
    content_h = max(1, int(round(sh * scale)))
    return content_w, content_h + title_h, content_w, content_h


def build_mac_window(
    content: Image.Image,
    window_w: int,
    window_h: int,
    content_w: int,
    content_h: int,
) -> Image.Image:
    """Mac-style window with traffic lights and title bar around content."""
    title_h = window_h - content_h
    corner = 18
    pad = 70
    out_w = window_w + pad * 2
    out_h = window_h + pad * 2
    out = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))

    # Cyan glow behind window
    glow = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))
    ImageDraw.Draw(glow).rounded_rectangle(
        (pad - 10, pad - 10, pad + window_w + 10, pad + window_h + 10),
        radius=corner + 10,
        fill=(*CYAN_GLOW, 90),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=55))
    out.alpha_composite(glow)

    # Window body
    body = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))
    ImageDraw.Draw(body).rounded_rectangle(
        (pad, pad, pad + window_w, pad + window_h),
        radius=corner,
        fill=WINDOW_EDGE,
    )
    out.alpha_composite(body)

    # Title bar
    title = Image.new("RGBA", (window_w, title_h), TITLEBAR)
    # Soft top corners via mask
    title_mask = Image.new("L", (window_w, title_h), 0)
    ImageDraw.Draw(title_mask).rounded_rectangle(
        (0, 0, window_w, title_h + corner), radius=corner, fill=255
    )
    title.putalpha(title_mask)
    out.alpha_composite(title, (pad, pad))

    # Traffic lights
    d = ImageDraw.Draw(out)
    lights = [(255, 95, 86), (255, 189, 46), (39, 201, 63)]
    lx = pad + 22
    ly = pad + 15
    for color in lights:
        d.ellipse((lx, ly, lx + 14, ly + 14), fill=(*color, 255))
        lx += 24

    # Title label
    font = load_font(18, 600)
    label = "DealGapIQ"
    lw = text_width(label, font)
    draw_text_tracked(
        d,
        (pad + (window_w - lw) / 2, pad + 12),
        label,
        font,
        (200, 210, 230, 255),
    )

    # Content pane — exact aspect match (no stretch). fit_content is a safety net.
    content_box = fit_content_preserve_aspect(content, content_w, content_h)
    corner_mask = Image.new("L", (content_w, content_h), 0)
    ImageDraw.Draw(corner_mask).rounded_rectangle(
        (0, -corner, content_w, content_h), radius=corner, fill=255
    )
    content_box.putalpha(corner_mask)
    out.alpha_composite(content_box, (pad, pad + title_h))
    return out


def load_window_content(source: str) -> Image.Image:
    if source == "hero":
        if HERO_SCREENSHOT_PATH.is_file():
            return Image.open(HERO_SCREENSHOT_PATH).convert("RGB")
        source = "01-hero-investors-lens.png"
    path = IPHONE_DIR / source
    if not path.is_file():
        raise FileNotFoundError(f"Missing iPhone plate for Mac window: {path}")
    return Image.open(path).convert("RGB")


def build_mac_screenshot(cfg: dict) -> None:
    canvas = build_navy_canvas()
    # Glow behind the window zone (right half)
    add_radial_cyan_glow(canvas, int(TARGET_W * 0.68), int(TARGET_H * 0.55), 900, intensity=0.20)

    end_y = add_headline(canvas, cfg["headline_lines"], top_y=220, font_size=96)
    end_y = add_subhead(canvas, cfg["subhead"], top_y=end_y + 28, max_width=1000)
    wm_y = add_wordmark(canvas, target_y=end_y + 48, target_w=400)
    add_off_mls_badge(canvas, target_y=wm_y + 28)

    content = load_window_content(cfg["source"])
    # Size the Mac chrome to the source aspect so plates never stretch.
    # Left copy column needs ~1100px; keep the window inside the right half.
    window_w, window_h, content_w, content_h = window_size_for_content(
        content,
        max_w=1500,
        max_h=1480,
    )
    window = build_mac_window(content, window_w, window_h, content_w, content_h)
    # Place window on the right, vertically centered; clamp so it stays on-canvas.
    paste_x = min(TARGET_W - window.width + 10, TARGET_W - window.width)
    paste_x = max(TARGET_W // 2 - 40, paste_x)
    paste_y = max(40, (TARGET_H - window.height) // 2)
    if paste_y + window.height > TARGET_H - 20:
        paste_y = max(20, TARGET_H - window.height - 20)
    canvas.alpha_composite(window, (paste_x, paste_y))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / cfg["output_name"]
    canvas.convert("RGB").save(out, "PNG", optimize=True)
    print(f"Wrote: {out.relative_to(THIS_DIR)}  ({TARGET_W}x{TARGET_H})")


def main() -> None:
    if not Path(FONT_PATH).is_file():
        raise FileNotFoundError(
            f"DM Sans not found at {FONT_PATH}. Place DMSans-Variable.ttf under assets/fonts/"
        )
    print(f"Font: {FONT_PATH}")
    print(f"Mac screenshots → {OUT_DIR} ({TARGET_W}x{TARGET_H})")
    for cfg in MAC_CONFIGS:
        build_mac_screenshot(cfg)
    print(f"\nDone — {len(MAC_CONFIGS)} Mac App Store screenshots.")


if __name__ == "__main__":
    main()
