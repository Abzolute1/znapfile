#!/bin/bash

echo "🚀 Starting FileShare..."
echo ""

# Start backend
echo "📦 Starting backend..."
cd backend
source ../frontend/venv/bin/activate 2>/dev/null || python3 -m venv venv && source venv/bin/activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

echo "⏳ Waiting for backend to start..."
sleep 5

# Start frontend
echo "🎨 Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "===================================================="
echo "✅ FileShare is running!"
echo "===================================================="
echo ""
echo "🌐 Open in your browser:"
echo "   👉 http://localhost:5173"
echo ""
echo "📚 API Documentation:"
echo "   👉 http://localhost:8000/docs"
echo ""
echo "🛑 Press Ctrl+C to stop"
echo ""

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo '✅ Stopped all services'; exit" INT
wait