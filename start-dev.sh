#!/bin/bash

# Start development servers
echo "Starting FileShare development servers..."

# Check if PostgreSQL and Redis are running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "⚠️  PostgreSQL is not running. Please start PostgreSQL first."
    echo "   You can install and start it with:"
    echo "   sudo apt-get install postgresql"
    echo "   sudo systemctl start postgresql"
fi

if ! redis-cli ping > /dev/null 2>&1; then
    echo "⚠️  Redis is not running. Please start Redis first."
    echo "   You can install and start it with:"
    echo "   sudo apt-get install redis-server"
    echo "   sudo systemctl start redis-server"
fi

# Create .env files if they don't exist
if [ ! -f backend/.env ]; then
    echo "Creating backend/.env from example..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please edit backend/.env with your actual configuration"
fi

if [ ! -f frontend/.env ]; then
    echo "Creating frontend/.env from example..."
    cp frontend/.env.example frontend/.env
fi

# Start backend
echo "Starting backend server..."
cd backend
source venv/bin/activate 2>/dev/null || python3 -m venv venv && source venv/bin/activate
nohup python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID $BACKEND_PID"
cd ..

# Start frontend
echo "Starting frontend server..."
cd frontend
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID $FRONTEND_PID"
cd ..

echo ""
echo "✅ Services are starting..."
echo ""
echo "📝 Logs:"
echo "   Backend: tail -f backend/backend.log"
echo "   Frontend: tail -f frontend/frontend.log"
echo ""
echo "🌐 Access the application at:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:8000"
echo ""
echo "🛑 To stop all services:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Waiting for services to be ready..."
sleep 5

# Check if services are running
if curl -s http://localhost:8000 > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend failed to start. Check backend/backend.log"
fi

if curl -s http://localhost:5173 > /dev/null; then
    echo "✅ Frontend is running"
    echo ""
    echo "🚀 Open http://localhost:5173 in your browser to see the website!"
else
    echo "❌ Frontend failed to start. Check frontend/frontend.log"
fi