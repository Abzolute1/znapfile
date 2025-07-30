#!/bin/bash

echo "Starting znapfile services..."

# Start backend
cd backend
source venv/bin/activate
echo "Starting backend server..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Start frontend
cd ../frontend
echo "Starting frontend server..."
npm run dev &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo ""
echo "Services are starting up..."
echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait