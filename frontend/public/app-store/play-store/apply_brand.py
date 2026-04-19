#!/usr/bin/env python3
"""Apply DealGapIQ brand wordmark + off-MLS coverage badge to feature graphics.

Top-left:
  - Composites the official dark-mode wordmark PNG (white "DealGap" + cyan "IQ")
    from assets/dealgapiq-wordmark-darkmode.png
  - Black source background is converted to alpha so the wordmark sits cleanly
    on the banner's dark navy gradient with anti-aliased edges preserved
  - Original AI-generated logo is erased first via a sampled-navy patch

Bottom-right pill:
  - White rounded rectangle, "MLS  +  Foreclosure  +  Pre-Foreclosure  +  Auction"
  - Item names in ink #1B2141, "+" separators in blue #0465F2
  - DM Sans variable font at weight 600, -0.01em tracking

Usage:
  Place the DM Sans variable TTF at the path below (or download from
  https://github.com/google/fonts/raw/main/ofl/dmsans/DMSans%5Bopsz%2Cwght%5D.ttf)
  then run:

      python3 apply_brand.py

  Targets are the v3 and v4 PNGs in this directory. Originals are overwritten
  in place — back them up first if you want to revert.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT_PATH = "/tmp/dm-sans-fonts/DMSans-Variable.ttf"

INK = (27, 33, 65, 255)
BLUE = (4, 101, 242, 255)
WHITE = (255, 255, 255, 255)

THIS_DIR = Path(__file__).resolve().parent
WORDMARK_PATH = THIS_DIR / "assets" / "dealgapiq-wordmark-darkmode.png"
WORDMARK_TARGET_WIDTH = 300


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
    """Convert a logo with a solid black background to one with transparency,
    preserving anti-aliased edges and embedded color (white + cyan).

    For each pixel: alpha = max(R, G, B), then re-normalize RGB so that the
    color stays at full saturation (a 50% gray pixel becomes pure white at 50%
    alpha — exactly how an anti-aliased edge should render against any bg).
    """
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


def sample_navy(img: Image.Image, x: int, y: int) -> tuple:
    """Sample a small region around (x, y) and return the median pixel color."""
    region = img.crop(
        (max(0, x - 6), max(0, y - 6), min(img.width, x + 6), min(img.height, y + 6))
    ).convert("RGB")
    pixels = list(region.getdata())
    pixels.sort(key=lambda p: p[0] + p[1] + p[2])
    median = pixels[len(pixels) // 2]
    return (*median, 255)


def add_wordmark(img: Image.Image) -> None:
    """Erase any pre-existing top-left logo via a median-filter pass on the
    underlying pixels (which removes outlier bright pixels — the AI wordmark
    letters and brain icon — while preserving the local navy gradient), then
    composite the official dark-mode brand wordmark from disk.

    Median filter approach avoids the visible "shadow box" that any
    sampled-color rectangle creates against a smoothly-graded navy background:
    instead of replacing the area with one color, it just smooths the existing
    pixels (which are mostly navy with thin white logo strokes), so the result
    blends seamlessly into the surrounding gradient."""
    if not WORDMARK_PATH.exists():
        raise FileNotFoundError(f"Brand wordmark not found at {WORDMARK_PATH}")

    raw = Image.open(WORDMARK_PATH)
    wordmark = black_to_alpha(raw)

    aspect = wordmark.width / wordmark.height
    new_w = WORDMARK_TARGET_WIDTH
    new_h = int(new_w / aspect)
    wordmark = wordmark.resize((new_w, new_h), Image.LANCZOS)

    pos_x, pos_y = 28, 8

    erase_box = (0, 0, pos_x + new_w + 20, pos_y + new_h + 6)
    cropped = img.crop(erase_box).convert("RGB")
    smoothed = cropped.filter(ImageFilter.MedianFilter(size=23))
    smoothed = smoothed.filter(ImageFilter.GaussianBlur(radius=5))
    img.paste(smoothed.convert("RGBA"), erase_box[:2])

    img.alpha_composite(wordmark, dest=(pos_x, pos_y))


def add_off_mls_badge(img: Image.Image) -> None:
    draw = ImageDraw.Draw(img)

    badge_size = 14
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

    pad_x = 16
    pad_y = 9
    badge_w = total_w + pad_x * 2
    badge_h = cap_height + pad_y * 2

    _, img_h = img.size
    badge_x = 40
    badge_y = img_h - badge_h - 32

    draw.rounded_rectangle(
        (badge_x, badge_y, badge_x + badge_w, badge_y + badge_h),
        radius=8,
        fill=WHITE,
    )

    x = badge_x + pad_x
    y = badge_y + pad_y - descent * 0.4
    for i, item in enumerate(items):
        x = draw_text_tracked(draw, (x, y), item, font, INK, tracking)
        if i < len(items) - 1:
            x = draw_text_tracked(draw, (x, y), sep, font, BLUE, tracking)


def process(path: Path) -> None:
    img = Image.open(path).convert("RGBA")
    add_wordmark(img)
    add_off_mls_badge(img)
    img.convert("RGB").save(path, "PNG", optimize=True)
    print(f"Wrote: {path.name}  ({img.size[0]}x{img.size[1]})")


def main() -> None:
    targets = [
        THIS_DIR / "feature-graphic-1024x500-v3-verdict-stream.png",
        THIS_DIR / "feature-graphic-1024x500-v4-investors-lens.png",
    ]
    for t in targets:
        if not t.exists():
            print(f"SKIP (not found): {t.name}")
            continue
        process(t)


if __name__ == "__main__":
    main()
