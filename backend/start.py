"""
Startup wrapper — diagnoses import errors before launching the server.

Uses gunicorn + UvicornWorker when WEB_CONCURRENCY > 1 for multi-worker
concurrency with graceful process management and memory-leak protection
(max_requests recycling). Falls back to single-process uvicorn for local
development (WEB_CONCURRENCY=1, the default).
"""
import os
import sys
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

# ── Step 2: Launch server ────────────────────────────────────────────
port = int(os.environ.get("PORT", 8000))
workers = int(os.environ.get("WEB_CONCURRENCY", 1))

if workers > 1:
    print(f">>> start.py: Starting gunicorn with {workers} UvicornWorkers ...", flush=True)
    try:
        os.execv(
            sys.executable,
            [
                sys.executable, "-m", "gunicorn",
                "app.main:app",
                "--bind", f"0.0.0.0:{port}",
                "--workers", str(workers),
                "--worker-class", "uvicorn.workers.UvicornWorker",
                "--timeout", "120",
                "--graceful-timeout", "30",
                "--keep-alive", "5",
                # Recycle workers periodically to reclaim leaked memory (WeasyPrint)
                "--max-requests", "1000",
                "--max-requests-jitter", "100",
                "--access-logfile", "-",
                "--error-logfile", "-",
                "--log-level", "info",
            ],
        )
    except Exception:
        print(">>> start.py: GUNICORN EXEC FAILED <<<", flush=True)
        traceback.print_exc()
        sys.exit(1)
else:
    print(">>> start.py: Starting uvicorn (single worker) ...", flush=True)
    try:
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
    except Exception:
        print(">>> start.py: UVICORN CRASHED <<<", flush=True)
        traceback.print_exc()
        sys.exit(1)
