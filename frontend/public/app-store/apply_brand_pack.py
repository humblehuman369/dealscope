#!/usr/bin/env python3
"""Build the unified DealGapIQ brand pack across all surfaces.

Uses a single marketing message — "Discover Deals — Like an Investor" —
applied across four asset variants at native channel resolutions:

  1. Play Store feature graphic       1024 x 500   landscape banner
  2. IAP Pro Monthly promo            1024 x 1024  square
  3. IAP Pro Annual promo             1024 x 1024  square
  4. Open Graph / social share image  1200 x 630   landscape

App Store screenshots are produced by a separate script (connect/apply_screenshot_brand.py)
because they have a portrait layout and per-feature variant logic.

All assets share:
  - Dark navy vertical gradient background (#0A1428 -> #04081A)
  - Soft radial cyan glow centered behind the phone or focal element
  - DM Sans 800 (-0.02em) for headlines, DM Sans 500 (-0.01em) for subheads
  - Official DealGapIQ wordmark (assets/dealgapiq-wordmark-darkmode.png)
  - The same real app screenshot inside the phone mockup (Strategy tab,
    showing Target Buy / Income Value / Market Price / DEAL GAP -29.1%)

Usage:
    python3 apply_brand_pack.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

THIS_DIR = Path(__file__).resolve().parent
PLAY_STORE_DIR = THIS_DIR / "play-store"
IAP_DIR = THIS_DIR / "iap-promo"
SOCIAL_DIR = THIS_DIR / "social"
WORDMARK_PATH = PLAY_STORE_DIR / "assets" / "dealgapiq-wordmark-darkmode.png"
HERO_SCREENSHOT_PATH = THIS_DIR / "connect" / "assets" / "hero-screenshot-strategy-tab.png"
FONT_PATH = "/tmp/dm-sans-fonts/DMSans-Variable.ttf"

INK = (27, 33, 65, 255)
BLUE = (4, 101, 242, 255)
WHITE = (255, 255, 255, 255)
SUBHEAD_COLOR = (170, 195, 230, 255)
SUBHEAD_DIM = (140, 165, 200, 255)
NAVY_TOP = (10, 18, 40)
NAVY_BOTTOM = (4, 8, 22)
CYAN_GLOW = (34, 211, 238)
CYAN_TEXT = (34, 211, 238, 255)
SAVINGS_AMBER = (250, 204, 21, 255)


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
    position: tuple,
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


def black_to_alpha(src: Image.Image) -> Image.Image:
    src = src.convert("RGB")
    pixels = src.load()
    w, h = src.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out_pixels = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = pixels[x, y]
            a = max(r, g, b)
            if a == 0:
                continue
            scale = 255 / a
            out_pixels[x, y] = (
                min(255, int(r * scale)),
                min(255, int(g * scale)),
                min(255, int(b * scale)),
                a,
            )
    return out


def build_navy_canvas(w: int, h: int) -> Image.Image:
    """Vertical navy gradient canvas at any aspect ratio."""
    canvas = Image.new("RGB", (w, h), NAVY_TOP)
    draw = ImageDraw.Draw(canvas)
    for y in range(h):
        ratio = y / h
        r = int(NAVY_TOP[0] * (1 - ratio) + NAVY_BOTTOM[0] * ratio)
        g = int(NAVY_TOP[1] * (1 - ratio) + NAVY_BOTTOM[1] * ratio)
        b = int(NAVY_TOP[2] * (1 - ratio) + NAVY_BOTTOM[2] * ratio)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    return canvas.convert("RGBA")


def add_radial_cyan_glow(
    canvas: Image.Image,
    center_x: int,
    center_y: int,
    radius: int,
    intensity: float = 0.22,
) -> None:
    w, h = canvas.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    steps = max(1, radius // 8)
    for i in range(steps, 0, -1):
        r = int(radius * (i / steps))
        alpha = int(intensity * 255 * (1 - i / steps) ** 1.4)
        draw.ellipse(
            (center_x - r, center_y - r, center_x + r, center_y + r),
            fill=(*CYAN_GLOW, alpha),
        )
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=int(radius / 12)))
    canvas.alpha_composite(overlay)


def build_phone_with_screenshot(
    screenshot_path: Path,
    crop_box: tuple | None = None,
    phone_width: int = 240,
    bezel_px: int = 4,
    bezel_color: tuple = (20, 22, 28, 255),
    corner_radius_pct: float = 0.10,
    add_dynamic_island: bool = True,
    add_glow: bool = True,
    glow_pad: int = 30,
    glow_intensity: int = 110,
) -> Image.Image:
    """Build a flat phone mockup containing a real app screenshot.

    Returns an RGBA image; alpha-composite it onto the target canvas.
    """
    screenshot = Image.open(screenshot_path).convert("RGB")
    if crop_box is not None:
        screenshot = screenshot.crop(crop_box)

    sw, sh = screenshot.size
    aspect = sh / sw

    screen_w = phone_width - 2 * bezel_px
    screen_h = int(screen_w * aspect)
    screenshot = screenshot.resize((screen_w, screen_h), Image.LANCZOS)

    phone_height = screen_h + 2 * bezel_px
    corner_r = int(min(phone_width, phone_height) * corner_radius_pct)

    pad = glow_pad if add_glow else 0
    canvas_w = phone_width + 2 * pad
    canvas_h = phone_height + 2 * pad
    out = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))

    if add_glow:
        glow = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
        ImageDraw.Draw(glow).rounded_rectangle(
            (pad - 6, pad - 6, pad + phone_width + 6, pad + phone_height + 6),
            radius=corner_r + 6,
            fill=(*CYAN_GLOW, glow_intensity),
        )
        glow = glow.filter(ImageFilter.GaussianBlur(radius=max(8, glow_pad // 2)))
        out.alpha_composite(glow)

    body = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    ImageDraw.Draw(body).rounded_rectangle(
        (pad, pad, pad + phone_width, pad + phone_height),
        radius=corner_r,
        fill=bezel_color,
    )
    out.alpha_composite(body)

    screen_mask = Image.new("L", (screen_w, screen_h), 0)
    ImageDraw.Draw(screen_mask).rounded_rectangle(
        (0, 0, screen_w, screen_h),
        radius=max(0, corner_r - bezel_px),
        fill=255,
    )
    screenshot_rgba = screenshot.convert("RGBA")
    screenshot_rgba.putalpha(screen_mask)
    out.alpha_composite(screenshot_rgba, (pad + bezel_px, pad + bezel_px))

    if add_dynamic_island:
        di_w = int(phone_width * 0.30)
        di_h = max(4, int(phone_height * 0.022))
        di_x = pad + (phone_width - di_w) // 2
        di_y = pad + bezel_px + max(2, int(phone_height * 0.018))
        ImageDraw.Draw(out).rounded_rectangle(
            (di_x, di_y, di_x + di_w, di_y + di_h),
            radius=di_h // 2,
            fill=(0, 0, 0, 255),
        )

    return out


def add_wordmark_at(
    canvas: Image.Image,
    x: int,
    y: int,
    target_w: int,
    align: str = "left",
) -> int:
    raw = Image.open(WORDMARK_PATH)
    wordmark = black_to_alpha(raw)
    aspect = wordmark.width / wordmark.height
    target_h = int(target_w / aspect)
    wordmark = wordmark.resize((target_w, target_h), Image.LANCZOS)

    if align == "center":
        paste_x = x - target_w // 2
    elif align == "right":
        paste_x = x - target_w
    else:
        paste_x = x

    canvas.alpha_composite(wordmark, (paste_x, y))
    return y + target_h


def draw_text_block(
    canvas: Image.Image,
    lines: list,
    top_y: int,
    font_size: int,
    weight: int,
    color: tuple,
    tracking: float,
    line_gap: int,
    x_align: str = "left",
    x_anchor: int = 0,
) -> int:
    """Render a block of text lines with given typography. Returns y after block."""
    draw = ImageDraw.Draw(canvas)
    font = load_font(font_size, weight=weight)
    y = top_y
    for line in lines:
        line_w = text_width(line, font, tracking)
        if x_align == "center":
            x = x_anchor - line_w / 2
        elif x_align == "right":
            x = x_anchor - line_w
        else:
            x = x_anchor
        draw_text_tracked(draw, (x, y), line, font, color, tracking)
        y += font_size + line_gap
    return y


def build_play_store_v5() -> None:
    """1024 x 500 landscape feature graphic for Google Play."""
    W, H = 1024, 500
    canvas = build_navy_canvas(W, H)
    add_radial_cyan_glow(canvas, int(W * 0.78), H // 2, 320, intensity=0.30)

    text_x = 48
    end_y = draw_text_block(
        canvas,
        ["Discover Deals", "Like an Investor"],
        top_y=64,
        font_size=70,
        weight=800,
        color=WHITE,
        tracking=-0.02,
        line_gap=4,
        x_align="left",
        x_anchor=text_x,
    )
    end_y += 18
    end_y = draw_text_block(
        canvas,
        ["Every US Listing Analyzed for Profit"],
        top_y=end_y,
        font_size=24,
        weight=500,
        color=SUBHEAD_COLOR,
        tracking=-0.01,
        line_gap=6,
        x_align="left",
        x_anchor=text_x,
    )
    draw_text_block(
        canvas,
        ["MLS  \u00b7  Foreclosures  \u00b7  Auctions  \u00b7  Pre-Foreclosures"],
        top_y=end_y,
        font_size=22,
        weight=500,
        color=SUBHEAD_DIM,
        tracking=-0.01,
        line_gap=0,
        x_align="left",
        x_anchor=text_x,
    )

    add_wordmark_at(canvas, x=text_x, y=H - 92, target_w=240, align="left")

    phone = build_phone_with_screenshot(
        screenshot_path=HERO_SCREENSHOT_PATH,
        crop_box=(0, 0, 472, 855),
        phone_width=240,
        bezel_px=4,
        corner_radius_pct=0.085,
        glow_pad=30,
        glow_intensity=120,
    )
    paste_x = int(W * 0.72) - phone.width // 2
    paste_y = (H - phone.height) // 2
    canvas.alpha_composite(phone, (paste_x, paste_y))

    output = PLAY_STORE_DIR / "feature-graphic-1024x500-v5-discover-deals.png"
    canvas.convert("RGB").save(output, "PNG", optimize=True)
    print(f"Wrote: play-store/{output.name}  ({W}x{H})")


def build_iap_pro_monthly_v2() -> None:
    """1024 x 1024 IAP promo for Pro Monthly. Side-by-side layout: text left, phone right."""
    W, H = 1024, 1024
    canvas = build_navy_canvas(W, H)
    add_radial_cyan_glow(canvas, int(W * 0.74), H // 2, 360, intensity=0.30)

    text_x = 64

def _build_iap_layout(
    output_filename: str,
    badge: tuple | None,
    pro_label: str,
    headline_lines: list,
    subhead_lines: list,
) -> None:
    """Shared side-by-side layout used by both IAP variants.

    badge: optional (label, color) tuple for the savings/value chip at top-left.
    pro_label: small cyan label above the headline ("DealGapIQ Pro" etc).
    """
    W, H = 1024, 1024
    canvas = build_navy_canvas(W, H)
    add_radial_cyan_glow(canvas, int(W * 0.74), H // 2, 360, intensity=0.30)

    text_x = 64

    if badge is not None:
        badge_label, badge_color = badge
        badge_font = load_font(26, weight=700)
        badge_w = text_width(badge_label, badge_font, 0.04) + 48
        badge_h = 50
        draw = ImageDraw.Draw(canvas)
        draw.rounded_rectangle(
            (text_x, 96, text_x + badge_w, 96 + badge_h),
            radius=badge_h // 2,
            fill=(*badge_color[:3], 230),
        )
        draw_text_tracked(
            draw,
            (text_x + 24, 96 + (badge_h - 26) / 2 - 3),
            badge_label,
            badge_font,
            INK,
            0.04,
        )
        top_after_badge = 96 + badge_h + 28
    else:
        top_after_badge = 138

    end_y = draw_text_block(
        canvas,
        [pro_label],
        top_y=top_after_badge,
        font_size=36,
        weight=600,
        color=CYAN_TEXT,
        tracking=0.02,
        line_gap=0,
        x_align="left",
        x_anchor=text_x,
    )
    end_y += 14
    end_y = draw_text_block(
        canvas,
        headline_lines,
        top_y=end_y,
        font_size=80,
        weight=800,
        color=WHITE,
        tracking=-0.02,
        line_gap=8,
        x_align="left",
        x_anchor=text_x,
    )
    end_y += 26
    end_y = draw_text_block(
        canvas,
        subhead_lines,
        top_y=end_y,
        font_size=28,
        weight=500,
        color=SUBHEAD_COLOR,
        tracking=-0.01,
        line_gap=8,
        x_align="left",
        x_anchor=text_x,
    )
    end_y += 22
    draw_text_block(
        canvas,
        ["MLS  \u00b7  Foreclosures", "Auctions  \u00b7  Pre-Foreclosures"],
        top_y=end_y,
        font_size=22,
        weight=500,
        color=SUBHEAD_DIM,
        tracking=-0.01,
        line_gap=8,
        x_align="left",
        x_anchor=text_x,
    )

    add_wordmark_at(canvas, x=text_x, y=H - 130, target_w=260, align="left")

    phone = build_phone_with_screenshot(
        screenshot_path=HERO_SCREENSHOT_PATH,
        crop_box=(0, 0, 472, 855),
        phone_width=320,
        bezel_px=6,
        corner_radius_pct=0.085,
        glow_pad=40,
        glow_intensity=130,
    )
    paste_x = int(W * 0.74) - phone.width // 2
    paste_y = (H - phone.height) // 2
    canvas.alpha_composite(phone, (paste_x, paste_y))

    output = IAP_DIR / output_filename
    canvas.convert("RGB").save(output, "PNG", optimize=True)
    print(f"Wrote: iap-promo/{output.name}  ({W}x{H})")


def build_iap_pro_monthly_v2() -> None:
    _build_iap_layout(
        output_filename="dealgapiq-iap-pro-monthly-v2-1024x1024.png",
        badge=None,
        pro_label="DealGapIQ Pro",
        headline_lines=["Discover Deals", "Like an", "Investor."],
        subhead_lines=["Every US listing,", "pre-scored for profit."],
    )


def build_iap_pro_annual_v2() -> None:
    _build_iap_layout(
        output_filename="dealgapiq-iap-pro-annual-v2-1024x1024.png",
        badge=("SAVE 40%", SAVINGS_AMBER),
        pro_label="DealGapIQ Pro \u2014 Annual",
        headline_lines=["Discover Deals", "Like an", "Investor."],
        subhead_lines=["12 months of", "unlimited Discoveries."],
    )


def build_og_image() -> None:
    """1200 x 630 Open Graph / Twitter card / link preview image."""
    W, H = 1200, 630
    canvas = build_navy_canvas(W, H)
    add_radial_cyan_glow(canvas, int(W * 0.78), H // 2, 360, intensity=0.30)

    text_x = 64
    end_y = draw_text_block(
        canvas,
        ["Discover Deals", "Like an Investor"],
        top_y=82,
        font_size=88,
        weight=800,
        color=WHITE,
        tracking=-0.02,
        line_gap=6,
        x_align="left",
        x_anchor=text_x,
    )
    end_y += 24
    end_y = draw_text_block(
        canvas,
        ["Every US Listing Analyzed for Profit"],
        top_y=end_y,
        font_size=30,
        weight=500,
        color=SUBHEAD_COLOR,
        tracking=-0.01,
        line_gap=10,
        x_align="left",
        x_anchor=text_x,
    )
    end_y = draw_text_block(
        canvas,
        ["MLS  \u00b7  Foreclosures  \u00b7  Auctions  \u00b7  Pre-Foreclosures"],
        top_y=end_y,
        font_size=26,
        weight=500,
        color=SUBHEAD_DIM,
        tracking=-0.01,
        line_gap=0,
        x_align="left",
        x_anchor=text_x,
    )

    add_wordmark_at(canvas, x=text_x, y=H - 110, target_w=300, align="left")

    phone = build_phone_with_screenshot(
        screenshot_path=HERO_SCREENSHOT_PATH,
        crop_box=(0, 0, 472, 855),
        phone_width=290,
        bezel_px=5,
        corner_radius_pct=0.085,
        glow_pad=36,
        glow_intensity=120,
    )
    paste_x = int(W * 0.74) - phone.width // 2
    paste_y = (H - phone.height) // 2
    canvas.alpha_composite(phone, (paste_x, paste_y))

    SOCIAL_DIR.mkdir(parents=True, exist_ok=True)
    output = SOCIAL_DIR / "og-discover-deals-1200x630.png"
    canvas.convert("RGB").save(output, "PNG", optimize=True)
    print(f"Wrote: social/{output.name}  ({W}x{H})")


def main() -> None:
    build_play_store_v5()
    build_iap_pro_monthly_v2()
    build_iap_pro_annual_v2()
    build_og_image()


if __name__ == "__main__":
    main()
