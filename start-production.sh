#!/bin/bash

# SecureShare Pro - Production Start Script
# Professional file sharing service launcher

set -e

echo "========================================"
echo "    SecureShare Pro - Starting Up"
echo "========================================"
echo ""

# Change to project directory
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Check Python
echo "✓ Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    exit 1
fi

# Check Node.js
echo "✓ Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

# Setup virtual environment if not exists
VENV_PATH="$PROJECT_DIR/frontend/venv"
if [ ! -d "$VENV_PATH" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv "$VENV_PATH"
fi

# Activate virtual environment and install backend dependencies
echo "📚 Installing backend dependencies..."
source "$VENV_PATH/bin/activate"
cd backend
pip install -q -r requirements.txt
pip install -q aiofiles aiosqlite

# Install frontend dependencies
echo "🎨 Installing frontend dependencies..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install --silent
fi

# Create .env files if not exist
if [ ! -f "../backend/.env" ]; then
    echo "⚙️  Creating backend configuration..."
    cp ../backend/.env.example ../backend/.env
fi

if [ ! -f ".env" ]; then
    echo "⚙️  Creating frontend configuration..."
    cp .env.example .env
fi

# Kill any existing processes
echo "🔄 Cleaning up existing processes..."
pkill -f uvicorn 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
sleep 2

# Start backend
echo ""
echo "🚀 Starting backend server..."
cd ../backend
"$VENV_PATH/bin/python" -m uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4 \
    --log-level warning > server.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Backend server is ready!"
        break
    fi
    sleep 1
done

# Start frontend
echo "🎨 Starting frontend server..."
cd ../frontend
npm run dev --silent > ../frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to initialize..."
sleep 5

# Final status
echo ""
echo "========================================"
echo "    SecureShare Pro is running!"
echo "========================================"
echo ""
echo "📌 Access Points:"
echo "   • Frontend: http://localhost:5173"
echo "   • API Docs: http://localhost:8000/docs"
echo "   • Health Check: http://localhost:8000/health"
echo ""
echo "📊 Process IDs:"
echo "   • Backend PID: $BACKEND_PID"
echo "   • Frontend PID: $FRONTEND_PID"
echo ""
echo "🛑 To stop all services: Press Ctrl+C"
echo ""

# Function to cleanup on exit
cleanup() {
    echo -e "\n\n🛑 Shutting down SecureShare Pro..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    pkill -f uvicorn 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    echo "✅ All services stopped successfully"
    exit 0
}

# Set trap for cleanup
trap cleanup INT TERM

# Open browser after a short delay
(sleep 3 && xdg-open http://localhost:5173 2>/dev/null || open http://localhost:5173 2>/dev/null || true) &

# Keep script running
wait $BACKEND_PID