#!/usr/bin/env python3
"""CI guard: calculators/ must NEVER import from app.core.defaults.

Run as part of CI or pre-commit:
    python backend/scripts/check_calculator_imports.py

Exit code 0 = clean, 1 = violations found.
"""
import pathlib
import re
import sys

CALCULATORS_DIR = pathlib.Path(__file__).resolve().parent.parent / "app" / "services" / "calculators"
FORBIDDEN_PATTERN = re.compile(r"^\s*from\s+app\.core\.defaults\s+import", re.MULTILINE)

violations: list[str] = []

for py_file in sorted(CALCULATORS_DIR.glob("*.py")):
    text = py_file.read_text()
    for match in FORBIDDEN_PATTERN.finditer(text):
        line_no = text[:match.start()].count("\n") + 1
        violations.append(f"  {py_file.name}:{line_no}  {match.group().strip()}")

if violations:
    print("FORBIDDEN import(s) from app.core.defaults found in calculators/:")
    print("\n".join(violations))
    print("\nCalculators must receive all values via parameters.")
    print("Use app.core.formulas for valuation functions.")
    sys.exit(1)

print("check_calculator_imports: OK — no forbidden imports.")
sys.exit(0)
