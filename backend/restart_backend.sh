#!/bin/bash

echo "Stopping existing backend..."
pkill -f "uvicorn app.main" || true
pkill -f "uvicorn" || true
pkill -9 -f "uvicorn" || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
sleep 2

echo "Starting backend with security fixes..."
cd /home/alex/PycharmProjects/FileShare/backend

/home/alex/PycharmProjects/FileShare/frontend/venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level info