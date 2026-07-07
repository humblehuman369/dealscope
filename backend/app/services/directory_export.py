"""Server-side directory export rendering (Task 3.4).

Both export formats — CSV download and the print-to-PDF HTML view — are
generated here AFTER the caller has passed the paid gate and the export
meter, so no file bytes ever exist for an unentitled request.
"""

from __future__ import annotations

import csv
import html
from io import StringIO


def build_csv(headers: list[str], rows: list[list[str]]) -> str:
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    writer.writerows(rows)
    return buffer.getvalue()


def build_print_html(title: str, subtitle: str, headers: list[str], rows: list[list[str]]) -> str:
    """Minimal print-optimized table page; the browser's print dialog opens on load."""
    head_cells = "".join(f"<th>{html.escape(h)}</th>" for h in headers)
    body_rows = "".join(
        "<tr>" + "".join(f"<td>{html.escape(cell)}</td>" for cell in row) + "</tr>"
        for row in rows
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{html.escape(title)}</title>
<style>
  body {{ font-family: -apple-system, system-ui, sans-serif; color: #111; margin: 24px; }}
  h1 {{ font-size: 18px; margin: 0 0 4px; }}
  p.sub {{ font-size: 12px; color: #555; margin: 0 0 16px; }}
  table {{ border-collapse: collapse; width: 100%; font-size: 11px; }}
  th, td {{ border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: top; }}
  th {{ background: #f2f2f2; }}
  @media print {{ body {{ margin: 8px; }} }}
</style>
</head>
<body>
<h1>{html.escape(title)}</h1>
<p class="sub">{html.escape(subtitle)}</p>
<table>
<thead><tr>{head_cells}</tr></thead>
<tbody>{body_rows}</tbody>
</table>
<script>window.addEventListener('load', function () {{ window.print(); }});</script>
</body>
</html>"""
