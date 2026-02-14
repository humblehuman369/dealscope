FROM python:3.11-slim

# System libraries required by WeasyPrint for server-side PDF generation
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgobject-2.0-0 \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libpangoft2-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libharfbuzz0b \
    libfontconfig1 \
    libfreetype6 \
    libffi-dev \
    shared-mime-info \
    fonts-liberation2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bust Docker layer cache — change this value to force COPY rebuild
ARG CACHE_BUST=2026-02-14-v2

# Copy application code
COPY . .

# Railway injects $PORT at runtime (default 8080)
ENV PORT=8080

CMD ["python", "fix_alembic.py"]
