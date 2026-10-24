#!/bin/bash

# Aether ⚡ Startup Script (100% Free of Cost)
echo "⚡ Starting Aether Autonomous Executive Core..."

# 1. Start Python Server in background
cd "$(dirname "$0")/server"
if [ ! -d "venv" ]; then
    echo "Creating Python virtualenv..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

echo "Starting FastAPI server on http://0.0.0.0:8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 &
SERVER_PID=$!

# 2. Start Desktop / Web Frontend
cd ../desktop
echo "Starting Aether Command Center UI on http://0.0.0.0:5173..."
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!

trap "kill $SERVER_PID $FRONTEND_PID; exit" INT TERM EXIT

wait
