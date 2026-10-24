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

# Run FastAPI server with Uvicorn
CMD python3 -m uvicorn server.main:app --host 0.0.0.0 --port ${PORT:-8000}
