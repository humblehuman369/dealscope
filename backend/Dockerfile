FROM python:3.11

# python:3.11 (full Debian bookworm) ships with all system libraries that
# WeasyPrint needs — Cairo, Pango, GObject, GDK-PixBuf, fontconfig, etc.
# Only fonts need an explicit install for proper text rendering.
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-liberation2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Railway injects $PORT at runtime (default 8080)
ENV PORT=8080

CMD ["sh", "-c", "python fix_alembic.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT"]
