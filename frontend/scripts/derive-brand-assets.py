#!/usr/bin/env python3
"""Derive every platform-specific icon/logo from the brand pack in public/brand.

public/brand/ is the single source of truth for DealGapIQ branding. Everything
else (web favicons, transparent header/footer wordmarks, in-app marks, iOS /
Android / macOS icons, native splash screens, tooling logos) is generated or
copied from it by this script, so updating the brand means replacing the files
in public/brand and re-running:

    cd frontend && python3 scripts/derive-brand-assets.py

Requires Pillow (python3 -m pip install pillow).

The pack ships black-background art only. The app renders on both light and
dark surfaces, so two transparent variants are derived from the pack pixels
(nothing is redrawn): "OnDark" keeps white + cyan, "OnLight" swaps white for
black and keeps cyan. Brand colours: Black #000000, Cyan #0EA5E9, White #FFFFFF.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageDraw

FRONTEND = Path(__file__).resolve().parents[1]
BRAND = FRONTEND / "public" / "brand"
APP = FRONTEND / "src" / "app"
IOS_ASSETS = FRONTEND / "ios" / "App" / "App" / "Assets.xcassets"
ANDROID_RES = FRONTEND / "android" / "app" / "src" / "main" / "res"
MACOS_ICONSET = FRONTEND / "macos" / "DealGapIQ" / "Assets.xcassets" / "AppIcon.appiconset"
APP_STORE = FRONTEND / "public" / "app-store"
DEMO_VIDEO_ASSETS = FRONTEND.parent / "tools" / "demo-video" / "assets"

BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
# Cyan as rendered in the pack's PNGs (sampled), used so derived art matches exactly.
CYAN = (0, 179, 236)

# Scale of the wordmark relative to the splash canvas's shortest visible edge.
SPLASH_LOGO_FRACTION = 0.6
# iOS uses one 2732x2732 square with scaleAspectFill. On a 9:19.5 phone only the
# middle ~46% of the width is visible, so size the logo against that.
IOS_SPLASH_LOGO_FRACTION = 0.28


def black_bg_to_alpha(img: Image.Image, light_fg: tuple[int, int, int]) -> Image.Image:
    """Turn black-background white+cyan art into RGBA.

    Every non-black pixel is either white (r ≈ g ≈ b) or cyan (r ≈ 0) blended
    over black, so alpha is recovered from the channel that carries the colour
    and the colour itself is snapped back to the brand value.
    """
    src = img.convert("RGB")
    px = src.load()
    w, h = src.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            m = max(r, g, b)
            if m < 6:
                continue
            if r < 0.6 * b:
                op[x, y] = (*CYAN, min(255, round(255 * b / CYAN[2])))
            else:
                op[x, y] = (*light_fg, m)
    return out


def recolor_white(img: Image.Image, fg: tuple[int, int, int]) -> Image.Image:
    """Swap the white parts of an RGBA mark for `fg`, keeping cyan and alpha."""
    out = img.convert("RGBA").copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and r >= 0.6 * b:
                px[x, y] = (*fg, a)
    return out


def crop_to_content(img: Image.Image, pad_frac: float) -> Image.Image:
    left, top, right, bottom = img.getbbox()
    pad = round(max(right - left, bottom - top) * pad_frac)
    box = (
        max(0, left - pad),
        max(0, top - pad),
        min(img.width, right + pad),
        min(img.height, bottom + pad),
    )
    return img.crop(box)


def square(img: Image.Image) -> Image.Image:
    """Pad a transparent image to a centred square canvas."""
    side = max(img.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    return canvas


def resize_width(img: Image.Image, width: int) -> Image.Image:
    return img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)


def splash(size: tuple[int, int], logo: Image.Image, fraction: float, against: int | None = None) -> Image.Image:
    w, h = size
    basis = against if against is not None else min(w, h)
    logo_w = round(basis * fraction)
    scaled = resize_width(logo, logo_w)
    canvas = Image.new("RGB", size, BLACK)
    canvas.paste(scaled, ((w - scaled.width) // 2, (h - scaled.height) // 2), scaled)
    return canvas


def circular(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    scale = 4
    mask = Image.new("L", (img.width * scale, img.height * scale), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, mask.width - 1, mask.height - 1), fill=255)
    img.putalpha(mask.resize(img.size, Image.LANCZOS))
    return img


def save(img: Image.Image, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, optimize=True)
    print(f"  wrote {dest.relative_to(FRONTEND.parent)}  {img.width}x{img.height}")


def copy(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dest)
    print(f"  copied {dest.relative_to(FRONTEND.parent)}")


def main() -> None:
    print("Transparent variants")
    wordmark_src = Image.open(BRAND / "Logo" / "Sizes" / "DealGapIQ_Logo_2400w.png")
    wordmark_on_dark = resize_width(crop_to_content(black_bg_to_alpha(wordmark_src, WHITE), 0.02), 1200)
    wordmark_on_light = resize_width(crop_to_content(black_bg_to_alpha(wordmark_src, BLACK), 0.02), 1200)
    save(wordmark_on_dark, BRAND / "Logo" / "Transparent" / "DealGapIQ_Logo_OnDark.png")
    save(wordmark_on_light, BRAND / "Logo" / "Transparent" / "DealGapIQ_Logo_OnLight.png")

    # The Android adaptive foreground carries a black plate inside its safe zone,
    # so the transparent mark is lifted from the full-bleed App Store icon instead.
    mark_src = Image.open(BRAND / "AppIcon" / "iOS_AppStore" / "AppIcon_1024x1024.png")
    mark_on_dark = square(crop_to_content(black_bg_to_alpha(mark_src, WHITE), 0.04)).resize((512, 512), Image.LANCZOS)
    mark_on_light = recolor_white(mark_on_dark, BLACK)
    save(mark_on_dark, BRAND / "AppIcon" / "Transparent" / "DealGapIQ_Mark_OnDark_512.png")
    save(mark_on_light, BRAND / "AppIcon" / "Transparent" / "DealGapIQ_Mark_OnLight_512.png")

    print("Web (Next.js file-convention icons)")
    favicon = BRAND / "AppIcon" / "Web_Favicon"
    # Next/Turbopack rejects .ico files whose PNG frames are RGB, so build the
    # .ico here from the pack's PNG favicons with RGBA BMP frames.
    ico_frames = [Image.open(favicon / f"favicon_{s}x{s}.png").convert("RGBA") for s in (16, 32, 48)]
    (APP / "favicon.ico").parent.mkdir(parents=True, exist_ok=True)
    ico_frames[-1].save(
        APP / "favicon.ico",
        format="ICO",
        sizes=[f.size for f in ico_frames],
        append_images=ico_frames[:-1],
        bitmap_format="bmp",
    )
    print(f"  wrote {(APP / 'favicon.ico').relative_to(FRONTEND.parent)}  16/32/48")
    copy(favicon / "favicon_192x192.png", APP / "icon.png")
    copy(favicon / "apple-touch-icon.png", APP / "apple-icon.png")
    # Site-wide default social card. Segments with their own opengraph-image
    # (e.g. /blog) override it; Twitter falls back to og:image.
    copy(BRAND / "Logo" / "Social" / "OpenGraph_Share_1200x630.png", APP / "opengraph-image.png")

    print("iOS")
    copy(BRAND / "AppIcon" / "iOS_AppStore" / "AppIcon_1024x1024.png", IOS_ASSETS / "AppIcon.appiconset" / "AppIcon-1024.png")
    ios_splash = splash((2732, 2732), wordmark_on_dark, IOS_SPLASH_LOGO_FRACTION, against=2732)
    for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
        save(ios_splash, IOS_ASSETS / "Splash.imageset" / name)

    print("Android")
    densities = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    foreground = mark_src.convert("RGBA")
    for density, size in densities.items():
        launcher = Image.open(BRAND / "AppIcon" / "Android_Launcher" / f"ic_launcher_{density}_{size}x{size}.png")
        mipmap = ANDROID_RES / f"mipmap-{density}"
        copy(BRAND / "AppIcon" / "Android_Launcher" / f"ic_launcher_{density}_{size}x{size}.png", mipmap / "ic_launcher.png")
        save(circular(launcher), mipmap / "ic_launcher_round.png")
        fg_size = round(432 * size / 192)
        save(foreground.resize((fg_size, fg_size), Image.LANCZOS), mipmap / "ic_launcher_foreground.png")

    android_splash = {
        "drawable": (480, 320),
        "drawable-port-mdpi": (320, 480),
        "drawable-port-hdpi": (480, 800),
        "drawable-port-xhdpi": (720, 1280),
        "drawable-port-xxhdpi": (960, 1600),
        "drawable-port-xxxhdpi": (1280, 1920),
        "drawable-land-mdpi": (480, 320),
        "drawable-land-hdpi": (800, 480),
        "drawable-land-xhdpi": (1280, 720),
        "drawable-land-xxhdpi": (1600, 960),
        "drawable-land-xxxhdpi": (1920, 1280),
    }
    for folder, size in android_splash.items():
        save(splash(size, wordmark_on_dark, SPLASH_LOGO_FRACTION), ANDROID_RES / folder / "splash.png")

    print("macOS")
    macos = BRAND / "AppIcon" / "macOS"
    for dest_name, px in {
        "icon_16.png": 16, "icon_16@2x.png": 32,
        "icon_32.png": 32, "icon_32@2x.png": 64,
        "icon_128.png": 128, "icon_128@2x.png": 256,
        "icon_256.png": 256, "icon_256@2x.png": 512,
        "icon_512.png": 512, "icon_512@2x.png": 1024,
    }.items():
        copy(macos / f"AppIcon_{px}x{px}.png", MACOS_ICONSET / dest_name)

    print("Store tooling + demo video")
    copy(BRAND / "AppIcon" / "GooglePlay" / "PlayStore_Icon_512x512.png", APP_STORE / "play-store" / "icon-512x512-play.png")
    save(wordmark_on_dark, APP_STORE / "play-store" / "assets" / "dealgapiq-wordmark-darkmode.png")
    save(wordmark_on_dark, DEMO_VIDEO_ASSETS / "logo.png")


if __name__ == "__main__":
    main()
