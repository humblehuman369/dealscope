"""
PDF Chart Helpers — SVG chart generators for the InvestIQ Property Report PDF.

Generates inline SVG strings for:
- Donut chart (expense breakdown)
- Dual-area chart (10-year projections)
- Horizontal gauge bars (return factor benchmarks)
- Score ring (deal score display)

All charts are theme-aware and accept a color palette dict.
"""

import math
from typing import List, Tuple, Dict, Optional


# ---------------------------------------------------------------------------
# Theme color palettes
# ---------------------------------------------------------------------------

LIGHT_PALETTE = {
    "bg": "#FFFFFF",
    "card_bg": "#F8FAFC",
    "text_primary": "#0F172A",
    "text_secondary": "#475569",
    "text_tertiary": "#94A3B8",
    "brand": "#0EA5E9",
    "brand_dark": "#1E3A5F",
    "positive": "#16A34A",
    "negative": "#DC2626",
    "warning": "#D97706",
    "border": "#E2E8F0",
    "grid_line": "#E2E8F0",
    "chart_colors": [
        "#0EA5E9",  # Sky
        "#10B981",  # Emerald
        "#F59E0B",  # Amber
        "#F43F5E",  # Rose
        "#8B5CF6",  # Violet
        "#06B6D4",  # Cyan
    ],
    "area_primary": "#0EA5E9",
    "area_primary_fill": "rgba(14,165,233,0.15)",
    "area_secondary": "#10B981",
    "area_secondary_fill": "rgba(16,185,129,0.10)",
}

DARK_PALETTE = {
    "bg": "#000000",
    "card_bg": "#0C1220",
    "text_primary": "#F1F5F9",
    "text_secondary": "#CBD5E1",
    "text_tertiary": "#64748B",
    "brand": "#38BDF8",
    "brand_dark": "#0C1220",
    "positive": "#34D399",
    "negative": "#F87171",
    "warning": "#FBBF24",
    "border": "rgba(255,255,255,0.07)",
    "grid_line": "rgba(255,255,255,0.06)",
    "chart_colors": [
        "#38BDF8",  # Sky
        "#2DD4BF",  # Teal
        "#FBBF24",  # Gold
        "#F87171",  # Rose
        "#A78BFA",  # Violet
        "#22D3EE",  # Cyan
    ],
    "area_primary": "#38BDF8",
    "area_primary_fill": "rgba(56,189,248,0.15)",
    "area_secondary": "#2DD4BF",
    "area_secondary_fill": "rgba(45,212,191,0.10)",
}


def get_palette(theme: str = "light") -> Dict[str, any]:
    return DARK_PALETTE if theme == "dark" else LIGHT_PALETTE


# ---------------------------------------------------------------------------
# Donut Chart
# ---------------------------------------------------------------------------

def _polar_to_cart(cx: float, cy: float, r: float, angle_deg: float) -> Tuple[float, float]:
    """Convert polar coordinates to cartesian."""
    rad = math.radians(angle_deg - 90)  # SVG starts at top (12 o'clock)
    return cx + r * math.cos(rad), cy + r * math.sin(rad)


def generate_donut_chart(
    segments: List[Tuple[str, float]],
    theme: str = "light",
    width: int = 220,
    height: int = 220,
    inner_label: str = "",
    inner_value: str = "",
) -> str:
    """
    Generate an SVG donut chart.

    Args:
        segments: List of (label, value) tuples. Values are absolute amounts.
        theme: 'light' or 'dark'
        width: SVG width
        height: SVG height
        inner_label: Text label in center of donut
        inner_value: Value text in center of donut

    Returns:
        SVG string
    """
    palette = get_palette(theme)
    colors = palette["chart_colors"]
    total = sum(v for _, v in segments)
    if total == 0:
        return ""

    cx, cy = width / 2, height / 2
    outer_r = min(width, height) / 2 - 8
    inner_r = outer_r * 0.6
    stroke_w = outer_r - inner_r
    mid_r = (outer_r + inner_r) / 2

    paths = []
    current_angle = 0

    for i, (label, value) in enumerate(segments):
        if value <= 0:
            continue
        pct = value / total
        sweep = pct * 360
        # Small gap between segments
        gap = 1.5 if len(segments) > 1 else 0
        start_angle = current_angle + gap / 2
        end_angle = current_angle + sweep - gap / 2

        if end_angle <= start_angle:
            current_angle += sweep
            continue

        x1, y1 = _polar_to_cart(cx, cy, mid_r, start_angle)
        x2, y2 = _polar_to_cart(cx, cy, mid_r, end_angle)
        large_arc = 1 if sweep > 180 else 0
        color = colors[i % len(colors)]

        paths.append(
            f'<path d="M {x1:.1f} {y1:.1f} A {mid_r:.1f} {mid_r:.1f} 0 {large_arc} 1 {x2:.1f} {y2:.1f}" '
            f'fill="none" stroke="{color}" stroke-width="{stroke_w:.1f}" '
            f'stroke-linecap="round" />'
        )
        current_angle += sweep

    # Center text
    center_text = ""
    if inner_value:
        center_text += (
            f'<text x="{cx}" y="{cy - 6}" text-anchor="middle" '
            f'font-size="10" font-weight="600" fill="{palette["text_tertiary"]}">'
            f'{inner_label}</text>'
        )
        center_text += (
            f'<text x="{cx}" y="{cy + 14}" text-anchor="middle" '
            f'font-size="16" font-weight="700" fill="{palette["text_primary"]}" '
            f'font-variant-numeric="tabular-nums">{inner_value}</text>'
        )

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" style="display:block;">'
        f'{"".join(paths)}'
        f'{center_text}'
        f'</svg>'
    )
    return svg


def generate_donut_legend(
    segments: List[Tuple[str, float, str]],
    theme: str = "light",
) -> str:
    """
    Generate HTML legend for the donut chart.

    Args:
        segments: List of (label, value, formatted_value) tuples.
        theme: 'light' or 'dark'

    Returns:
        HTML string for the legend
    """
    palette = get_palette(theme)
    colors = palette["chart_colors"]
    total = sum(v for _, v, _ in segments)

    rows = []
    for i, (label, value, formatted) in enumerate(segments):
        if value <= 0:
            continue
        color = colors[i % len(colors)]
        pct = (value / total * 100) if total > 0 else 0
        rows.append(
            f'<div style="display:flex;align-items:center;gap:10px;padding:5px 0;'
            f'border-bottom:1px solid {palette["border"]};">'
            f'<span style="width:10px;height:10px;border-radius:3px;background:{color};flex-shrink:0;"></span>'
            f'<span style="flex:1;font-size:11px;color:{palette["text_secondary"]};">{label}</span>'
            f'<span style="font-size:11px;font-weight:600;color:{palette["text_primary"]};'
            f'font-variant-numeric:tabular-nums;min-width:70px;text-align:right;">{formatted}</span>'
            f'<span style="font-size:10px;color:{palette["text_tertiary"]};min-width:40px;text-align:right;">'
            f'{pct:.1f}%</span>'
            f'</div>'
        )
    return "".join(rows)


# ---------------------------------------------------------------------------
# Dual-Area Chart (Projections)
# ---------------------------------------------------------------------------

def generate_area_chart(
    labels: List[str],
    series1: List[float],
    series2: List[float],
    series1_name: str = "Property Value",
    series2_name: str = "Equity Position",
    theme: str = "light",
    width: int = 520,
    height: int = 220,
) -> str:
    """
    Generate an SVG dual-area chart for financial projections.

    Args:
        labels: X-axis labels (e.g., ['Year 1', ..., 'Year 10'])
        series1: Primary data series values
        series2: Secondary data series values
        theme: 'light' or 'dark'
        width: SVG width
        height: SVG height

    Returns:
        SVG string
    """
    palette = get_palette(theme)
    if not series1 or not series2:
        return ""

    # Chart area margins
    margin_left = 70
    margin_right = 20
    margin_top = 20
    margin_bottom = 35
    chart_w = width - margin_left - margin_right
    chart_h = height - margin_top - margin_bottom

    # Value range
    all_vals = series1 + series2
    min_val = 0
    max_val = max(all_vals) * 1.1

    def x_pos(i: int) -> float:
        if len(labels) <= 1:
            return margin_left
        return margin_left + (i / (len(labels) - 1)) * chart_w

    def y_pos(val: float) -> float:
        if max_val == min_val:
            return margin_top + chart_h
        return margin_top + chart_h - ((val - min_val) / (max_val - min_val)) * chart_h

    # Grid lines
    grid_lines = []
    num_gridlines = 4
    for i in range(num_gridlines + 1):
        y = margin_top + (i / num_gridlines) * chart_h
        val = max_val - (i / num_gridlines) * (max_val - min_val)
        grid_lines.append(
            f'<line x1="{margin_left}" y1="{y:.1f}" x2="{width - margin_right}" y2="{y:.1f}" '
            f'stroke="{palette["grid_line"]}" stroke-width="1" />'
        )
        # Y-axis labels
        if val >= 1_000_000:
            label = f"${val / 1_000_000:.1f}M"
        elif val >= 1_000:
            label = f"${val / 1_000:.0f}K"
        else:
            label = f"${val:.0f}"
        grid_lines.append(
            f'<text x="{margin_left - 8}" y="{y:.1f}" text-anchor="end" '
            f'dominant-baseline="central" font-size="9" fill="{palette["text_tertiary"]}">'
            f'{label}</text>'
        )

    # X-axis labels
    x_labels = []
    for i, lbl in enumerate(labels):
        x = x_pos(i)
        x_labels.append(
            f'<text x="{x:.1f}" y="{height - 8}" text-anchor="middle" '
            f'font-size="9" fill="{palette["text_tertiary"]}">{lbl}</text>'
        )

    # Build area paths
    def build_area(series: List[float], fill_color: str, stroke_color: str) -> str:
        if not series:
            return ""
        points = [(x_pos(i), y_pos(v)) for i, v in enumerate(series)]
        line_path = " ".join(f"{'M' if i == 0 else 'L'} {x:.1f} {y:.1f}" for i, (x, y) in enumerate(points))

        # Area fill: close path to bottom
        area_path = line_path
        area_path += f" L {points[-1][0]:.1f} {margin_top + chart_h:.1f}"
        area_path += f" L {points[0][0]:.1f} {margin_top + chart_h:.1f} Z"

        return (
            f'<path d="{area_path}" fill="{fill_color}" />'
            f'<path d="{line_path}" fill="none" stroke="{stroke_color}" stroke-width="2" />'
        )

    # Data point dots for series 1
    dots1 = ""
    for i, v in enumerate(series1):
        x, y = x_pos(i), y_pos(v)
        dots1 += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3" fill="{palette["area_primary"]}" />'

    dots2 = ""
    for i, v in enumerate(series2):
        x, y = x_pos(i), y_pos(v)
        dots2 += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3" fill="{palette["area_secondary"]}" />'

    # Legend
    legend_y = 10
    legend = (
        f'<rect x="{width - 200}" y="{legend_y}" width="10" height="10" rx="2" fill="{palette["area_primary"]}" />'
        f'<text x="{width - 185}" y="{legend_y + 9}" font-size="9" fill="{palette["text_secondary"]}">{series1_name}</text>'
        f'<rect x="{width - 105}" y="{legend_y}" width="10" height="10" rx="2" fill="{palette["area_secondary"]}" />'
        f'<text x="{width - 90}" y="{legend_y + 9}" font-size="9" fill="{palette["text_secondary"]}">{series2_name}</text>'
    )

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" style="display:block;">'
        f'{"".join(grid_lines)}'
        f'{build_area(series2, palette["area_secondary_fill"], palette["area_secondary"])}'
        f'{build_area(series1, palette["area_primary_fill"], palette["area_primary"])}'
        f'{dots2}{dots1}'
        f'{"".join(x_labels)}'
        f'{legend}'
        f'</svg>'
    )
    return svg


# ---------------------------------------------------------------------------
# Horizontal Gauge Bar
# ---------------------------------------------------------------------------

def generate_gauge_bar(
    value: float,
    max_value: float,
    benchmark: float,
    theme: str = "light",
    width: int = 200,
    height: int = 18,
    color_override: Optional[str] = None,
) -> str:
    """
    Generate an SVG horizontal gauge bar with a benchmark marker.

    Args:
        value: Current value
        max_value: Maximum value for scale
        benchmark: Benchmark value to show as a marker
        theme: 'light' or 'dark'
        width: SVG width
        height: SVG height

    Returns:
        SVG string
    """
    palette = get_palette(theme)

    bar_h = 8
    bar_y = (height - bar_h) / 2
    radius = 4

    # Determine fill color based on value vs benchmark
    if color_override:
        fill_color = color_override
    elif value >= benchmark:
        fill_color = palette["positive"]
    elif value >= benchmark * 0.8:
        fill_color = palette["warning"]
    else:
        fill_color = palette["negative"]

    # Fill width
    fill_pct = min(1.0, max(0.0, value / max_value)) if max_value > 0 else 0
    fill_w = fill_pct * width

    # Benchmark position
    bench_pct = min(1.0, benchmark / max_value) if max_value > 0 else 0
    bench_x = bench_pct * width

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" style="display:inline-block;vertical-align:middle;">'
        # Track
        f'<rect x="0" y="{bar_y:.1f}" width="{width}" height="{bar_h}" rx="{radius}" '
        f'fill="{palette["card_bg"]}" />'
        # Fill
        f'<rect x="0" y="{bar_y:.1f}" width="{max(fill_w, 0):.1f}" height="{bar_h}" rx="{radius}" '
        f'fill="{fill_color}" />'
        # Benchmark marker
        f'<line x1="{bench_x:.1f}" y1="{bar_y - 2}" x2="{bench_x:.1f}" y2="{bar_y + bar_h + 2}" '
        f'stroke="{palette["text_tertiary"]}" stroke-width="1.5" stroke-dasharray="3,2" />'
        f'</svg>'
    )
    return svg


# ---------------------------------------------------------------------------
# Score Ring
# ---------------------------------------------------------------------------

def generate_score_ring(
    score: int,
    max_score: int = 100,
    theme: str = "light",
    size: int = 120,
    grade: str = "",
) -> str:
    """
    Generate an SVG circular score ring.

    Args:
        score: Current score (0-100)
        max_score: Maximum score
        theme: 'light' or 'dark'
        size: SVG size (square)
        grade: Optional grade label (e.g., 'A', 'B+')

    Returns:
        SVG string
    """
    palette = get_palette(theme)

    cx, cy = size / 2, size / 2
    r = (size / 2) - 10
    circumference = 2 * math.pi * r
    pct = min(1.0, max(0.0, score / max_score))
    dash_length = pct * circumference

    # Score color tiers
    if score >= 80:
        ring_color = palette["positive"]
    elif score >= 60:
        ring_color = palette["warning"]
    elif score >= 40:
        ring_color = palette["brand"]
    else:
        ring_color = palette["negative"]

    # Track ring
    track_color = palette["grid_line"]

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
        f'viewBox="0 0 {size} {size}" style="display:block;">'
        # Background track
        f'<circle cx="{cx}" cy="{cy}" r="{r:.1f}" fill="none" '
        f'stroke="{track_color}" stroke-width="8" />'
        # Score arc
        f'<circle cx="{cx}" cy="{cy}" r="{r:.1f}" fill="none" '
        f'stroke="{ring_color}" stroke-width="8" '
        f'stroke-linecap="round" '
        f'stroke-dasharray="{dash_length:.1f} {circumference:.1f}" '
        f'transform="rotate(-90 {cx} {cy})" />'
        # Score number
        f'<text x="{cx}" y="{cy + 2}" text-anchor="middle" dominant-baseline="central" '
        f'font-size="32" font-weight="700" fill="{ring_color}" '
        f'font-variant-numeric="tabular-nums">{score}</text>'
    )

    if grade:
        svg += (
            f'<text x="{cx}" y="{cy + 22}" text-anchor="middle" '
            f'font-size="11" font-weight="700" fill="{palette["text_tertiary"]}">'
            f'{grade}</text>'
        )

    svg += '</svg>'
    return svg


# ---------------------------------------------------------------------------
# Stat Badge (small metric indicator)
# ---------------------------------------------------------------------------

def generate_stat_badge(
    label: str,
    value: str,
    color: str,
    theme: str = "light",
) -> str:
    """
    Generate an HTML stat badge (used for growth percentages, etc.).

    Returns:
        HTML string
    """
    palette = get_palette(theme)
    return (
        f'<div style="text-align:center;padding:12px 16px;'
        f'background:{palette["card_bg"]};border:1px solid {palette["border"]};'
        f'border-radius:10px;flex:1;">'
        f'<div style="font-size:22px;font-weight:700;color:{color};'
        f'font-variant-numeric:tabular-nums;margin-bottom:4px;">{value}</div>'
        f'<div style="font-size:10px;font-weight:600;color:{palette["text_tertiary"]};'
        f'text-transform:uppercase;letter-spacing:0.06em;">{label}</div>'
        f'</div>'
    )


# ---------------------------------------------------------------------------
# Waterfall Step Item
# ---------------------------------------------------------------------------

def generate_step_item(
    number: int,
    label: str,
    value: str,
    description: str,
    theme: str = "light",
    is_last: bool = False,
) -> str:
    """
    Generate an HTML numbered step item for waterfall flows.

    Returns:
        HTML string
    """
    palette = get_palette(theme)
    connector = "" if is_last else (
        f'<div style="position:absolute;left:15px;top:32px;bottom:-8px;'
        f'width:2px;background:{palette["brand"]};opacity:0.3;"></div>'
    )
    return (
        f'<div style="display:flex;gap:16px;align-items:flex-start;'
        f'position:relative;padding-bottom:{"0" if is_last else "20px"};">'
        f'{connector}'
        f'<div style="width:32px;height:32px;border-radius:50%;'
        f'background:{palette["brand"]};color:white;font-size:14px;font-weight:700;'
        f'display:flex;align-items:center;justify-content:center;flex-shrink:0;'
        f'position:relative;z-index:1;">{number}</div>'
        f'<div style="flex:1;padding-top:4px;">'
        f'<div style="display:flex;justify-content:space-between;align-items:baseline;">'
        f'<span style="font-size:13px;font-weight:600;color:{palette["text_primary"]};">{label}</span>'
        f'<span style="font-size:14px;font-weight:700;color:{palette["text_primary"]};'
        f'font-variant-numeric:tabular-nums;">{value}</span>'
        f'</div>'
        f'<p style="font-size:11px;color:{palette["text_tertiary"]};margin-top:2px;">{description}</p>'
        f'</div>'
        f'</div>'
    )


# ---------------------------------------------------------------------------
# Metric Card
# ---------------------------------------------------------------------------

def generate_metric_card(
    name: str,
    value: str,
    assessment: str,
    description: str,
    theme: str = "light",
) -> str:
    """
    Generate an HTML metric card (for cap rate, CoC, DSCR, IRR).

    Returns:
        HTML string
    """
    palette = get_palette(theme)

    # Assessment badge colors
    badge_colors = {
        "STRONG": (palette["positive"], f'{palette["positive"]}18'),
        "GOOD": (palette["positive"], f'{palette["positive"]}18'),
        "FAIR": (palette["warning"], f'{palette["warning"]}18'),
        "BELOW": (palette["negative"], f'{palette["negative"]}18'),
        "POOR": (palette["negative"], f'{palette["negative"]}18'),
    }
    badge_text, badge_bg = badge_colors.get(
        assessment.upper(), (palette["text_tertiary"], palette["card_bg"])
    )

    return (
        f'<div style="background:{palette["card_bg"]};border:1px solid {palette["border"]};'
        f'border-radius:10px;padding:18px;text-align:center;">'
        f'<div style="font-size:10px;font-weight:700;color:{palette["text_tertiary"]};'
        f'text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">{name}</div>'
        f'<div style="font-size:28px;font-weight:700;color:{palette["text_primary"]};'
        f'font-variant-numeric:tabular-nums;margin-bottom:8px;">{value}</div>'
        f'<span style="display:inline-block;padding:3px 10px;border-radius:100px;'
        f'font-size:10px;font-weight:700;color:{badge_text};'
        f'background:{badge_bg};text-transform:uppercase;letter-spacing:0.04em;'
        f'margin-bottom:8px;">{assessment}</span>'
        f'<p style="font-size:10px;color:{palette["text_tertiary"]};line-height:1.4;">{description}</p>'
        f'</div>'
    )
