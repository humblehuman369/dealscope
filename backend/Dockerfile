# Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Railway will override with $PORT)
EXPOSE 8000

# Run the application using shell form to allow environment variable expansion
# Railway provides the PORT environment variable
CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
