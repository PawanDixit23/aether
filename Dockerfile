# ⚡ Aether Autonomous Personal AI Executive
# Multi-stage Dockerfile for Unified Fullstack 24/7 Cloud Deployment

# Stage 1: Build the Vite Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/desktop
COPY desktop/package*.json ./
RUN npm install
COPY desktop/ ./
RUN npm run build

# Stage 2: Python Backend with Static Files
FROM python:3.11-slim
WORKDIR /app

# Set Timezone to Asia/Kolkata
ENV TZ="Asia/Kolkata"
ENV TIMEZONE="Asia/Kolkata"

# Memory Optimization Flags for 512MB RAM Container (Render / Cloud Free Tier)
# 1. Limit glibc memory arenas to 2 to prevent thread arena bloat (each default arena is ~64MB)
ENV MALLOC_ARENA_MAX=2
# 2. Aggressively trim and release freed heap pages back to OS kernel (64KB threshold)
ENV MALLOC_TRIM_THRESHOLD_=65536
# 3. Optimize python bytecode & disable buffering
ENV PYTHONUNBUFFERED=1
ENV PYTHONOPTIMIZE=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY server/requirements.txt ./server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt

# Copy server code
COPY server/ ./server/

# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /app/desktop/dist ./desktop/dist

# Expose port (Render/Railway dynamically provide PORT environment variable)
ENV PORT=8000
EXPOSE 8000

# Run FastAPI server with Uvicorn (single worker, limit concurrency and keep-alive timeout to prevent memory spikes)
CMD python3 -m uvicorn server.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --limit-concurrency 60 --timeout-keep-alive 20
