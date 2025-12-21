"""
Ultra-minimal FastAPI app to test Railway deployment.
"""
from fastapi import FastAPI
import os
import sys

print("=" * 50, flush=True)
print("MINIMAL TEST APP STARTING", flush=True)
print(f"Python: {sys.version}", flush=True)
print(f"PORT: {os.environ.get('PORT', 'not set')}", flush=True)
print("=" * 50, flush=True)

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Hello from minimal app!"}

@app.get("/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

