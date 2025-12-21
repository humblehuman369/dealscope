"""
Ultra-minimal FastAPI app to test Railway deployment.
"""
from fastapi import FastAPI
from contextlib import asynccontextmanager
import os
import sys
import asyncio

print("=" * 50, flush=True)
print("MINIMAL TEST APP STARTING", flush=True)
print(f"Python: {sys.version}", flush=True)
print(f"PORT: {os.environ.get('PORT', 'not set')}", flush=True)
print("=" * 50, flush=True)
sys.stdout.flush()

# Background task to keep the app alive and log status
async def keep_alive_task():
    count = 0
    while True:
        count += 1
        print(f"[KEEPALIVE] App running for {count * 30} seconds", flush=True)
        await asyncio.sleep(30)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("LIFESPAN: Starting up...", flush=True)
    # Start background keep-alive task
    task = asyncio.create_task(keep_alive_task())
    yield
    print("LIFESPAN: Shutting down...", flush=True)
    task.cancel()

app = FastAPI(lifespan=lifespan)

@app.get("/")
def root():
    print("REQUEST: / endpoint hit", flush=True)
    return {"message": "Hello from minimal app!"}

@app.get("/health")
def health():
    print("REQUEST: /health endpoint hit", flush=True)
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

