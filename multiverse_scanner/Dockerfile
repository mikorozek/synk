FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements or install packages directly
COPY requirements.txt* ./
RUN pip install --no-cache-dir \
    multiversx-sdk \
    python-dotenv \
    requests \
    beautifulsoup4 \
    psycopg2-binary \
    openai \
    || pip install --no-cache-dir \
    multiversx-sdk \
    python-dotenv \
    requests \
    beautifulsoup4 \
    psycopg2-binary \
    openai

# Copy application code
COPY . .

# Run yolo_trader by default
CMD ["python", "-m", "yolo_trader"]
