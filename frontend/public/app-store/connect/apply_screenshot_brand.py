#!/usr/bin/env python3
"""Build App Store Connect portrait screenshots (1290×2796, iPhone 6.9" Display).

Each screenshot is composited from:
  - A dark navy gradient canvas (brand bg)
  - A cropped AI-generated phone/feature visual placed in the middle zone
  - Programmatically rendered DM Sans typography:
      * Headline (DM Sans 800, -0.02em tracking, white)
      * Subhead   (DM Sans 500, -0.01em tracking, light cyan-blue)
  - The official DealGapIQ brand wordmark at the bottom
  - A coverage / feature badge below the wordmark

The text is rendered programmatically so it stays pixel-crisp at the 1290×2796
resolution Apple ranks first for App Store search results (iPhone 6.9").

Usage:
    python3 apply_screenshot_brand.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

THIS_DIR = Path(__file__).resolve().parent
SCREENSHOTS_DIR = THIS_DIR / "screenshots"
ASSETS_DIR = Path(
    "/Users/bradgeisen/.cursor/projects/Users-bradgeisen-IQ-Data-dealscope/assets"
)
WORDMARK_PATH = (
    THIS_DIR.parent / "play-store" / "assets" / "dealgapiq-wordmark-darkmode.png"
)
FONT_PATH = "/tmp/dm-sans-fonts/DMSans-Variable.ttf"

TARGET_W = 1290
TARGET_H = 2796

INK = (27, 33, 65, 255)
BLUE = (4, 101, 242, 255)
WHITE = (255, 255, 255, 255)
SUBHEAD_COLOR = (170, 195, 230, 255)
NAVY_TOP = (10, 18, 40)
NAVY_BOTTOM = (4, 8, 22)
CYAN_GLOW = (34, 211, 238)


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


def build_navy_canvas() -> Image.Image:
    """Build a 1290×2796 portrait canvas with vertical dark navy gradient."""
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
    intensity: float = 0.25,
) -> Image.Image:
    """Soft radial cyan glow at given center, blended on top of the canvas."""
    overlay = Image.new("RGBA", (TARGET_W, TARGET_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    steps = max(1, radius // 8)
    for i in range(steps, 0, -1):
        r = int(radius * (i / steps))
        alpha = int(intensity * 255 * (1 - i / steps) ** 1.4)
        draw.ellipse(
            (center_x - r, center_y - r, center_x + r, center_y + r),
            fill=(*CYAN_GLOW, alpha),
        )
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=40))
    canvas.alpha_composite(overlay)
    return canvas


def build_phone_with_screenshot(
    screenshot_path: Path,
    crop_box: tuple | None = None,
    phone_width: int = 880,
    bezel_px: int = 14,
    bezel_color: tuple = (18, 18, 22, 255),
    corner_radius_pct: float = 0.10,
    add_dynamic_island: bool = True,
    add_glow: bool = True,
    glow_pad: int = 90,
    glow_intensity: int = 110,
) -> Image.Image:
    """Build a flat phone-mockup PNG with a real app screenshot inside the screen.

    Produces an RGBA image sized to (phone_width + 2*glow_pad) wide. The phone is
    a rounded-rectangle bezel in dark titanium-gray, with a small dynamic island
    pill at the top center, and the cropped screenshot pasted edge-to-edge inside
    the screen area (no perspective transform — flat composition for clean App
    Store legibility at small sizes).

    Returns: RGBA Image ready to alpha_composite onto the canvas.
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
            (pad - 12, pad - 12, pad + phone_width + 12, pad + phone_height + 12),
            radius=corner_r + 12,
            fill=(*CYAN_GLOW, glow_intensity),
        )
        glow = glow.filter(ImageFilter.GaussianBlur(radius=70))
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
        di_h = int(phone_height * 0.022)
        di_x = pad + (phone_width - di_w) // 2
        di_y = pad + bezel_px + int(phone_height * 0.018)
        ImageDraw.Draw(out).rounded_rectangle(
            (di_x, di_y, di_x + di_w, di_y + di_h),
            radius=di_h // 2,
            fill=(0, 0, 0, 255),
        )

    return out


def composite_phone_mockup(
    canvas: Image.Image,
    phone_image: Image.Image,
    target_y: int,
) -> int:
    """Center a pre-built phone mockup horizontally on the canvas at target_y.

    Returns the y-coordinate just below the placed phone (excludes glow padding).
    """
    paste_x = (TARGET_W - phone_image.width) // 2
    canvas.alpha_composite(phone_image, (paste_x, target_y))
    return target_y + phone_image.height


def composite_visual(
    canvas: Image.Image,
    ai_path: Path,
    target_y: int,
    target_h: int,
    width_pct: float = 0.92,
    crop_box: tuple | None = None,
    feather_px: int = 0,
) -> int:
    """Crop a region from the AI visual and composite it onto the canvas.

    crop_box: optional explicit (x1, y1, x2, y2) crop tuple. If None, a
    centered portrait slice matching the target aspect is computed automatically.

    feather_px: if >0, an alpha feather mask is applied at the edges so the
    visual blends smoothly into the canvas background (eliminates hard rectangle
    boundaries between the AI image and the brand navy).

    Returns the y-coordinate just below the placed visual.
    """
    ai = Image.open(ai_path).convert("RGBA")
    ai_w, ai_h = ai.size

    target_w = int(TARGET_W * width_pct)
    target_aspect = target_w / target_h

    if crop_box is None:
        crop_w = int(ai_h * target_aspect)
        if crop_w > ai_w:
            crop_w = ai_w
            target_w = int(ai_w * target_h / ai_h)
        crop_x = (ai_w - crop_w) // 2
        cropped = ai.crop((crop_x, 0, crop_x + crop_w, ai_h))
    else:
        cropped = ai.crop(crop_box)
        bw, bh = cropped.size
        target_w = int(target_h * (bw / bh))
        if target_w > int(TARGET_W * width_pct):
            target_w = int(TARGET_W * width_pct)
            target_h = int(target_w * (bh / bw))

    cropped = cropped.resize((target_w, target_h), Image.LANCZOS)

    if feather_px > 0:
        mask = Image.new("L", (target_w, target_h), 0)
        ImageDraw.Draw(mask).rectangle(
            (feather_px, feather_px, target_w - feather_px, target_h - feather_px),
            fill=255,
        )
        mask = mask.filter(ImageFilter.GaussianBlur(radius=feather_px))
        cropped.putalpha(mask)

    paste_x = (TARGET_W - target_w) // 2
    canvas.alpha_composite(cropped, (paste_x, target_y))
    return target_y + target_h


def add_headline(
    canvas: Image.Image,
    lines: list,
    top_y: int,
    font_size: int = 110,
    line_gap: int = 18,
    color: tuple = WHITE,
    tracking: float = -0.02,
) -> int:
    draw = ImageDraw.Draw(canvas)
    font = load_font(font_size, weight=800)
    y = top_y
    for line in lines:
        line_w = text_width(line, font, tracking)
        x = (TARGET_W - line_w) / 2
        draw_text_tracked(draw, (x, y), line, font, color, tracking)
        y += font_size + line_gap
    return y


def add_subhead(
    canvas: Image.Image,
    text: str,
    y: int,
    font_size: int = 46,
    color: tuple = SUBHEAD_COLOR,
    tracking: float = -0.01,
    weight: int = 500,
) -> int:
    draw = ImageDraw.Draw(canvas)
    font = load_font(font_size, weight=weight)
    text_w = text_width(text, font, tracking)
    x = (TARGET_W - text_w) / 2
    draw_text_tracked(draw, (x, y), text, font, color, tracking)
    return y + font_size


def add_wordmark(canvas: Image.Image, target_y: int, target_w: int = 600) -> int:
    raw = Image.open(WORDMARK_PATH)
    wordmark = black_to_alpha(raw)
    aspect = wordmark.width / wordmark.height
    target_h = int(target_w / aspect)
    wordmark = wordmark.resize((target_w, target_h), Image.LANCZOS)
    paste_x = (TARGET_W - target_w) // 2
    canvas.alpha_composite(wordmark, (paste_x, target_y))
    return target_y + target_h


def add_off_mls_badge(canvas: Image.Image, target_y: int) -> int:
    draw = ImageDraw.Draw(canvas)

    badge_size = 26
    tracking = -0.01
    font = load_font(badge_size, weight=600)

    items = ["MLS", "Foreclosure", "Pre-Foreclosure", "Auction"]
    sep = "  +  "

    total_w = 0.0
    for i, item in enumerate(items):
        total_w += text_width(item, font, tracking)
        if i < len(items) - 1:
            total_w += text_width(sep, font, tracking)

    ascent, descent = font.getmetrics()
    cap_height = ascent

    pad_x = 28
    pad_y = 16
    badge_w = total_w + pad_x * 2
    badge_h = cap_height + pad_y * 2

    badge_x = (TARGET_W - int(badge_w)) // 2
    badge_y = target_y

    draw.rounded_rectangle(
        (badge_x, badge_y, badge_x + int(badge_w), badge_y + int(badge_h)),
        radius=14,
        fill=WHITE,
    )

    x = badge_x + pad_x
    y = badge_y + pad_y - descent * 0.4
    for i, item in enumerate(items):
        x = draw_text_tracked(draw, (x, y), item, font, INK, tracking)
        if i < len(items) - 1:
            x = draw_text_tracked(draw, (x, y), sep, font, BLUE, tracking)

    return target_y + int(badge_h)


def add_feature_badge(canvas: Image.Image, target_y: int, label: str) -> int:
    """Generic single-label feature badge (alternative to the off-MLS badge)."""
    draw = ImageDraw.Draw(canvas)
    badge_size = 28
    tracking = -0.01
    font = load_font(badge_size, weight=700)

    text_w = text_width(label.upper(), font, tracking)
    ascent, descent = font.getmetrics()
    cap_height = ascent

    pad_x = 32
    pad_y = 18
    badge_w = text_w + pad_x * 2
    badge_h = cap_height + pad_y * 2

    badge_x = (TARGET_W - int(badge_w)) // 2
    badge_y = target_y

    draw.rounded_rectangle(
        (badge_x, badge_y, badge_x + int(badge_w), badge_y + int(badge_h)),
        radius=int(badge_h / 2),
        fill=(*CYAN_GLOW, 38),
        outline=(*CYAN_GLOW, 220),
        width=2,
    )

    x = badge_x + pad_x
    y = badge_y + pad_y - descent * 0.4
    draw_text_tracked(draw, (x, y), label.upper(), font, (*CYAN_GLOW, 255), tracking)

    return target_y + int(badge_h)


def build_screenshot(
    output_name: str,
    raw_image_name: str,
    crop_box: tuple,
    headline_lines: list,
    subhead: str,
    headline_size: int = 120,
    headline_top_y: int = 200,
    line_gap: int = 10,
    subhead_size: int = 46,
    subhead_offset: int = 32,
    visual_top_offset: int = 70,
    visual_h: int = 1700,
    visual_width_pct: float = 0.95,
    feather_px: int = 60,
    wordmark_y_from_bottom: int = 320,
    wordmark_w: int = 560,
    badge_offset: int = 28,
) -> None:
    canvas = build_navy_canvas()
    add_radial_cyan_glow(canvas, TARGET_W // 2, 1500, 950, intensity=0.22)

    end_y = add_headline(
        canvas,
        headline_lines,
        top_y=headline_top_y,
        font_size=headline_size,
        line_gap=line_gap,
    )
    end_y = add_subhead(canvas, subhead, end_y + subhead_offset, font_size=subhead_size)

    composite_visual(
        canvas,
        ai_path=ASSETS_DIR / raw_image_name,
        target_y=end_y + visual_top_offset,
        target_h=visual_h,
        width_pct=visual_width_pct,
        crop_box=crop_box,
        feather_px=feather_px,
    )

    wm_y = add_wordmark(canvas, target_y=TARGET_H - wordmark_y_from_bottom, target_w=wordmark_w)
    add_off_mls_badge(canvas, target_y=wm_y + badge_offset)

    output_path = SCREENSHOTS_DIR / output_name
    canvas.convert("RGB").save(output_path, "PNG", optimize=True)
    print(f"Wrote: {output_path.name}  ({TARGET_W}x{TARGET_H})")


HERO_SCREENSHOT_PATH = THIS_DIR / "assets" / "hero-screenshot-strategy-tab.png"


def build_hero_with_real_screenshot() -> None:
    """Hero screenshot using the real app screen captured on device.

    Tighter v2 layout: bigger phone (1000px wide vs 900px), smaller top margin,
    wordmark sized up for stronger bottom anchor, all dead space squeezed out
    so the phone dominates the middle 60% of the canvas.
    """
    canvas = build_navy_canvas()
    add_radial_cyan_glow(canvas, TARGET_W // 2, 1500, 980, intensity=0.24)

    end_y = add_headline(
        canvas,
        ["Discover Deals", "Like an Investor"],
        top_y=160,
        font_size=126,
        line_gap=8,
    )

    end_y = add_subhead(
        canvas,
        "Every US Listing Analyzed for Profit",
        end_y + 32,
        font_size=44,
    )
    end_y = add_subhead(
        canvas,
        "MLS  \u00b7  Foreclosures  \u00b7  Auctions  \u00b7  Pre-Foreclosures",
        end_y + 10,
        font_size=40,
    )

    phone = build_phone_with_screenshot(
        screenshot_path=HERO_SCREENSHOT_PATH,
        crop_box=(0, 0, 472, 855),
        phone_width=1000,
        bezel_px=14,
        bezel_color=(20, 22, 28, 255),
        corner_radius_pct=0.10,
        add_dynamic_island=True,
        add_glow=True,
        glow_pad=90,
        glow_intensity=140,
    )
    composite_phone_mockup(canvas, phone, target_y=end_y + 40)

    add_wordmark(canvas, target_y=TARGET_H - 230, target_w=640)

    output_path = SCREENSHOTS_DIR / "01-hero-investors-lens.png"
    canvas.convert("RGB").save(output_path, "PNG", optimize=True)
    print(f"Wrote: {output_path.name}  ({TARGET_W}x{TARGET_H})  [real screenshot, v2]")


SCREENSHOT_CONFIGS = [
    {
        "output_name": "02-search-color-coded.png",
        "raw_image_name": "screenshot-02-search-raw.png",
        "crop_box": (440, 0, 920, 768),
        "headline_lines": ["Color-coded deals", "at a glance."],
        "subhead": "Green is go. Yellow needs work. Red is no.",
        "headline_size": 120,
        "headline_top_y": 200,
    },
    {
        "output_name": "03-verdict-three-cards.png",
        "raw_image_name": "screenshot-03-verdict-raw.png",
        "crop_box": (440, 0, 920, 768),
        "headline_lines": ["The whole deal,", "in one view."],
        "subhead": "Target Buy. Income Value. Market Price.",
        "headline_size": 120,
        "headline_top_y": 200,
    },
    {
        "output_name": "04-pills-deal-maybe-pass.png",
        "raw_image_name": "screenshot-04-pills-raw.png",
        "crop_box": (440, 0, 920, 768),
        "headline_lines": ["DEAL. MAYBE.", "PASS \u2014 fast."],
        "subhead": "Every listing scored before you tap.",
        "headline_size": 130,
        "headline_top_y": 200,
    },
    {
        "output_name": "05-coverage-beyond-mls.png",
        "raw_image_name": "screenshot-05-coverage-raw.png",
        "crop_box": (440, 0, 920, 768),
        "headline_lines": ["Beyond", "the MLS."],
        "subhead": "Foreclosure, Pre-Foreclosure, Auction.",
        "headline_size": 160,
        "headline_top_y": 180,
    },
    {
        "output_name": "06-comps-no-spreadsheet.png",
        "raw_image_name": "screenshot-06-comps-raw.png",
        "crop_box": (440, 0, 920, 768),
        "headline_lines": ["Comps without", "the spreadsheet."],
        "subhead": "Real comparables, pulled in seconds.",
        "headline_size": 120,
        "headline_top_y": 200,
    },
    {
        "output_name": "07-dealmaker-scenarios.png",
        "raw_image_name": "screenshot-07-dealmaker-raw.png",
        "crop_box": (450, 0, 920, 768),
        "headline_lines": ["Model deals", "in real time."],
        "subhead": "Adjust price, rehab, ARV \u2014 see profit live.",
        "headline_size": 130,
        "headline_top_y": 200,
    },
    {
        "output_name": "08-neighborhoods-heatmap.png",
        "raw_image_name": "screenshot-08-neighborhoods-raw.png",
        "crop_box": (340, 0, 870, 768),
        "headline_lines": ["See where", "the deals are."],
        "subhead": "Heatmaps reveal the hottest neighborhoods.",
        "headline_size": 130,
        "headline_top_y": 200,
    },
]


def main() -> None:
    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
    build_hero_with_real_screenshot()
    for cfg in SCREENSHOT_CONFIGS:
        build_screenshot(**cfg)


if __name__ == "__main__":
    main()
