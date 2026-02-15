FROM python:3.11-slim-bookworm

# ---------------------------------------------------------------
# System libraries required by WeasyPrint (Cairo, Pango, GLib)
# These MUST be in the runtime image — not just the build stage.
# Ref: https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#linux
# ---------------------------------------------------------------
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libcairo2 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libpangoft2-1.0-0 \
        libgdk-pixbuf-2.0-0 \
        libffi-dev \
        shared-mime-info \
        fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (better Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Railway injects PORT at runtime; default to 8000 for local dev
ENV PORT=8000

# fix_alembic.py runs DB migrations then exec's start.py → uvicorn
CMD ["python", "fix_alembic.py"]
