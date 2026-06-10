FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies (production only, no dev packages)
# Layer 1: copy requirements first for better Docker caching
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --retries 5 --timeout 120 -r requirements.txt

# Copy application code
COPY app/ ./app/
COPY data/ ./data/

# Create data directory and non-root user
RUN mkdir -p /app/data && \
    useradd --create-home --shell /bin/bash florist && \
    chown -R florist:florist /app
USER florist

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
