"""
Startup wrapper — diagnoses import errors before launching uvicorn.
Replaces the direct `uvicorn app.main:app` command so we get full
tracebacks even when the Nixpacks/Railway log capture loses output.
"""
import sys
import os
import traceback

print(f">>> start.py: Python {sys.version}", flush=True)
print(f">>> start.py: cwd = {os.getcwd()}", flush=True)
print(f">>> start.py: PORT = {os.environ.get('PORT', 'NOT SET')}", flush=True)
print(f">>> start.py: sys.path = {sys.path[:5]}", flush=True)

# ── Step 1: Verify app.main can be imported ──────────────────────────
print(">>> start.py: Importing app.main ...", flush=True)
try:
    from app.main import app  # noqa: F401
    print(">>> start.py: Import OK", flush=True)
except Exception:
    print(">>> start.py: IMPORT FAILED <<<", flush=True)
    traceback.print_exc()
    sys.exit(1)

# ── Step 2: Launch uvicorn programmatically ──────────────────────────
print(">>> start.py: Starting uvicorn ...", flush=True)
try:
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
except Exception:
    print(">>> start.py: UVICORN CRASHED <<<", flush=True)
    traceback.print_exc()
    sys.exit(1)
