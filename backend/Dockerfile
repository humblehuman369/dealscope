FROM python:3.11-slim

# System dependencies for WeasyPrint (Cairo, Pango, GObject, GDK-PixBuf, fonts)
# Omit --no-install-recommends so apt pulls all transitive deps (GObject, etc.)
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libpangoft2-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    fonts-liberation2 \
    && ldconfig \
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
